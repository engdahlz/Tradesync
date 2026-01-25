import { Storage, type File } from '@google-cloud/storage';
import { extname } from 'path';
import { db, FieldValue } from '../config.js';
import { generateEmbedding } from '../services/knowledgeService.js';
import type { Request, Response } from 'express';

type SourceType = 'books' | 'articles' | 'pdfs' | 'github';

interface ParsedDocument {
    content: string;
    title: string;
    metadata: Record<string, unknown>;
}

interface TextChunk {
    id: string;
    content: string;
    tokenCount: number;
    metadata: {
        source: string;
        sourceType: SourceType;
        title: string;
        chunkIndex: number;
        totalChunks: number;
        pageNumber?: number;
    };
}

const storage = new Storage();
const BASE_PREFIX = 'rag-sources/RAG Sources/downloads';
const DEFAULT_BATCH_SIZE = 8;
const DEFAULT_DELAY_MS = 150;
const MIN_CONTENT_LENGTH = 100;

type PdfParseCtor = new (options: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
    destroy: () => Promise<void>;
};

let PdfParser: PdfParseCtor | null = null;

async function getPdfParser(): Promise<PdfParseCtor> {
    if (!PdfParser) {
        const module = await import('pdf-parse');
        const parser = (module as { PDFParse?: PdfParseCtor }).PDFParse;
        if (!parser) {
            throw new Error('pdf-parse PDFParse export not found');
        }
        PdfParser = parser;
    }
    return PdfParser;
}

function getBucketName(): string {
    if (process.env.RAG_SOURCES_BUCKET) {
        return process.env.RAG_SOURCES_BUCKET;
    }

    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    if (!project) {
        throw new Error('Missing GOOGLE_CLOUD_PROJECT/GCLOUD_PROJECT and RAG_SOURCES_BUCKET');
    }
    return `${project}-rag-sources`;
}

function buildPrefix(sourceType?: string): string {
    if (!sourceType) {
        return `${BASE_PREFIX}/`;
    }
    return `${BASE_PREFIX}/${sourceType}/`;
}

function normalizeSourceType(sourceType?: string): SourceType | undefined {
    if (!sourceType) return undefined;
    if (sourceType === 'books' || sourceType === 'articles' || sourceType === 'pdfs' || sourceType === 'github') {
        return sourceType;
    }
    return undefined;
}

function resolveSourceType(filePath: string, override?: SourceType): SourceType {
    if (override) return override;

    const lower = filePath.toLowerCase();
    if (lower.includes('/books/')) return 'books';
    if (lower.includes('/articles/')) return 'articles';
    if (lower.includes('/pdfs/')) return 'pdfs';
    if (lower.includes('/github/')) return 'github';

    return 'articles';
}

function getSourceId(filePath: string): string {
    const filename = filePath.split('/').pop() || filePath;
    return filename
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase()
        .slice(0, 60);
}

function extractTitleFromPath(filePath: string): string {
    const filename = filePath.split('/').pop() || filePath;
    return filename
        .replace(/^\d+_/, '')
        .replace(/\.[^.]+$/, '')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseTextContent(content: string, filePath: string): ParsedDocument {
    const lines = content.split('\n');
    let title = extractTitleFromPath(filePath);

    const titleLine = lines.find(line => line.startsWith('TITEL:'));
    if (titleLine) {
        title = titleLine.replace('TITEL:', '').trim();
    }

    const sourceLine = lines.find(line => line.startsWith('KÄLLA:') || line.startsWith('SOURCE:'));
    const sourceUrl = sourceLine?.replace(/^(KÄLLA|SOURCE):/, '').trim();

    return {
        content,
        title,
        metadata: {
            sourceUrl,
            fileType: extname(filePath).slice(1),
        },
    };
}

function parseMarkdownContent(content: string, filePath: string): ParsedDocument {
    const h1Match = content.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1] : extractTitleFromPath(filePath);

    const cleanContent = content
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/`{3}[\s\S]*?`{3}/g, '')
        .replace(/`(.+?)`/g, '$1');

    return {
        content: cleanContent,
        title,
        metadata: {
            fileType: 'markdown',
        },
    };
}

async function parseDocumentBuffer(buffer: Buffer, filePath: string): Promise<ParsedDocument> {
    const ext = extname(filePath).toLowerCase();

    if (ext === '.pdf') {
        const Parser = await getPdfParser();
        const pdf = new Parser({ data: buffer });
        const data = await pdf.getText();
        await pdf.destroy();
        return {
            content: data.text,
            title: extractTitleFromPath(filePath),
            metadata: {},
        };
    }

    const content = buffer.toString('utf-8');
    if (ext === '.md') {
        return parseMarkdownContent(content, filePath);
    }

    return parseTextContent(content, filePath);
}

function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
}

function splitSentences(text: string): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.filter(sentence => sentence.trim().length > 0);
}

function chunkText(text: string, maxTokens: number = 500, overlapTokens: number = 50): string[] {
    const sentences = splitSentences(text);
    const chunks: string[] = [];
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);

        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
            chunks.push(currentChunk.trim());

            const words = currentChunk.split(' ');
            const overlapWords = Math.ceil(overlapTokens * 4 / 5);
            currentChunk = `${words.slice(-overlapWords).join(' ')} ${sentence}`;
            currentTokens = estimateTokenCount(currentChunk);
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            currentTokens += sentenceTokens;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function sanitizeId(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 50);
}

function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\d+\n/g, '\n')
        .replace(/([a-z])-\s+([a-z])/g, '$1$2')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function createChunks(
    text: string,
    source: string,
    sourceType: SourceType,
    title: string,
    maxTokens: number = 500,
    overlapTokens: number = 50
): TextChunk[] {
    const rawChunks = chunkText(text, maxTokens, overlapTokens);

    return rawChunks.map((content, index) => ({
        id: `${sourceType}_${sanitizeId(source)}_chunk_${index}`,
        content,
        tokenCount: estimateTokenCount(content),
        metadata: {
            source,
            sourceType,
            title,
            chunkIndex: index,
            totalChunks: rawChunks.length,
        },
    }));
}

async function isSourceIngested(sourceId: string): Promise<boolean> {
    const doc = await db.collection('rag_sources').doc(sourceId).get();
    return doc.exists;
}

async function registerSource(
    sourceId: string,
    metadata: {
        title: string;
        sourceType: string;
        filePath: string;
        chunkCount: number;
        totalTokens: number;
    }
): Promise<void> {
    await db.collection('rag_sources').doc(sourceId).set({
        ...metadata,
        ingestedAt: FieldValue.serverTimestamp(),
    });
}

async function storeChunksBatch(chunks: TextChunk[], embeddings: number[][]): Promise<void> {
    const batchSize = 450;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = db.batch();
        const chunkSlice = chunks.slice(i, i + batchSize);
        const embeddingSlice = embeddings.slice(i, i + batchSize);

        for (let j = 0; j < chunkSlice.length; j++) {
            const chunk = chunkSlice[j];
            const embedding = embeddingSlice[j];
            batch.set(db.collection('rag_chunks').doc(chunk.id), {
                content: chunk.content,
                tokenCount: chunk.tokenCount,
                metadata: chunk.metadata,
                embedding: FieldValue.vector(embedding),
                createdAt: FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();
    }
}

async function generateEmbeddingsBatch(
    chunks: TextChunk[],
    batchSize: number,
    delayMs: number
): Promise<void> {
    for (let i = 0; i < chunks.length; i += batchSize) {
        const slice = chunks.slice(i, i + batchSize);
        const embeddings = await Promise.all(
            slice.map(chunk => generateEmbedding(chunk.content, 'RETRIEVAL_DOCUMENT'))
        );
        await storeChunksBatch(slice, embeddings);

        if (i + batchSize < chunks.length && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}

async function ingestFile(
    file: File,
    sourceTypeOverride?: SourceType,
    batchSize: number = DEFAULT_BATCH_SIZE,
    delayMs: number = DEFAULT_DELAY_MS
): Promise<{ status: 'ingested' | 'skipped' | 'failed'; chunks: number; tokens: number }> {
    const filePath = file.name;
    const sourceId = getSourceId(filePath);

    try {
        if (await isSourceIngested(sourceId)) {
            console.log(`⏭️  Skipping (already ingested): ${filePath}`);
            return { status: 'skipped', chunks: 0, tokens: 0 };
        }

        console.log(`📄 Processing: ${filePath}`);

        const [buffer] = await file.download();
        const doc = await parseDocumentBuffer(buffer, filePath);
        const cleaned = cleanText(doc.content);

        if (cleaned.length < MIN_CONTENT_LENGTH) {
            console.log(`⚠️  Document too short, skipping: ${filePath}`);
            return { status: 'failed', chunks: 0, tokens: 0 };
        }

        const sourceType = resolveSourceType(filePath, sourceTypeOverride);
        const chunks = createChunks(cleaned, filePath, sourceType, doc.title);
        const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

        await generateEmbeddingsBatch(chunks, batchSize, delayMs);
        await registerSource(sourceId, {
            title: doc.title,
            sourceType,
            filePath: `gs://${getBucketName()}/${filePath}`,
            chunkCount: chunks.length,
            totalTokens,
        });

        console.log(`✅ Ingested ${filePath}: ${chunks.length} chunks`);
        return { status: 'ingested', chunks: chunks.length, tokens: totalTokens };
    } catch (error) {
        console.error(`❌ Failed to ingest ${filePath}:`, error);
        return { status: 'failed', chunks: 0, tokens: 0 };
    }
}

function filterSupportedFiles(files: File[]): File[] {
    return files.filter(file => {
        if (file.name.endsWith('/')) return false;
        const ext = extname(file.name).toLowerCase();
        return ext === '.pdf' || ext === '.txt' || ext === '.md' || ext === '.csv';
    });
}

export async function handleIngestRagFromGcs(req: Request, res: Response) {
    try {
        const sourceType = normalizeSourceType(
            typeof req.query.type === 'string' ? req.query.type : undefined
        );
        const batchSize = Number(req.query.batchSize ?? DEFAULT_BATCH_SIZE);
        const delayMs = Number(req.query.delayMs ?? DEFAULT_DELAY_MS);
        const limit = Number(req.query.limit ?? 2);
        const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

        const bucketName = getBucketName();
        const prefix = buildPrefix(sourceType);

        const [files, , apiResponse] = await storage.bucket(bucketName).getFiles({
            prefix,
            maxResults: limit,
            pageToken,
            autoPaginate: false,
        });

        const supportedFiles = filterSupportedFiles(files);
        let ingested = 0;
        let skipped = 0;
        let failed = 0;
        let totalChunks = 0;
        let totalTokens = 0;

        for (const file of supportedFiles) {
            const result = await ingestFile(file, sourceType, batchSize, delayMs);
            if (result.status === 'ingested') ingested++;
            if (result.status === 'skipped') skipped++;
            if (result.status === 'failed') failed++;
            totalChunks += result.chunks;
            totalTokens += result.tokens;
        }

        const nextPageToken =
            (apiResponse as { nextPageToken?: string } | undefined)?.nextPageToken ?? null;

        res.json({
            bucket: bucketName,
            prefix,
            ingested,
            skipped,
            failed,
            totalChunks,
            totalTokens,
            nextPageToken,
        });
    } catch (error: unknown) {
        console.error('GCS ingestion error:', error);
        res.status(500).json({ error: String(error) });
    }
}
