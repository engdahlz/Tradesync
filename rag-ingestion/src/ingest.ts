/**
 * RAG Ingestion Script
 * 
 * Ingests documents from rag-sources into Firestore vector store
 * Usage: npm run ingest [--type books|articles|pdfs]
 */

import { readdir } from 'fs/promises'
import { join, extname } from 'path'
import { Command } from 'commander'
import dotenv from 'dotenv'

import { parseDocument } from './parsers.js'
import { createChunks, cleanText, TextChunk } from './chunker.js'
import { generateEmbeddingsBatch } from './embeddings.js'
import { storeChunksBatch, registerSource, isSourceIngested, getIngestionStats } from './vectorStore.js'

// Load environment variables
dotenv.config()

// Source directories
const RAG_BASE = '../rag-sources/RAG Sources/downloads'

const SOURCE_DIRS = {
    books: join(RAG_BASE, 'books'),
    articles: join(RAG_BASE, 'articles'),
    pdfs: join(RAG_BASE, 'pdfs'),
    github: join(RAG_BASE, 'github'),
}

type SourceType = keyof typeof SOURCE_DIRS

/**
 * Get all files from a directory
 */
async function getFiles(dir: string): Promise<string[]> {
    try {
        const entries = await readdir(dir, { withFileTypes: true })
        return entries
            .filter(e => e.isFile())
            .map(e => join(dir, e.name))
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error)
        return []
    }
}

/**
 * Generate a source ID from file path
 */
function getSourceId(filePath: string): string {
    const filename = filePath.split('/').pop() || filePath
    return filename
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase()
        .slice(0, 60)
}

/**
 * Ingest a single document
 */
async function ingestDocument(
    filePath: string,
    sourceType: SourceType
): Promise<{ success: boolean; chunks: number; tokens: number }> {
    const sourceId = getSourceId(filePath)

    // Check if already ingested
    if (await isSourceIngested(sourceId)) {
        console.log(`  ⏭️  Skipping (already ingested): ${filePath.split('/').pop()}`)
        return { success: true, chunks: 0, tokens: 0 }
    }

    console.log(`\n📄 Processing: ${filePath.split('/').pop()}`)

    try {
        // Parse document
        console.log('  Parsing...')
        const doc = await parseDocument(filePath)
        const cleanedContent = cleanText(doc.content)

        if (cleanedContent.length < 100) {
            console.log('  ⚠️  Document too short, skipping')
            return { success: false, chunks: 0, tokens: 0 }
        }

        // Create chunks
        console.log('  Chunking...')
        const chunks = createChunks(
            cleanedContent,
            filePath,
            sourceType,
            doc.title
        )
        console.log(`  Created ${chunks.length} chunks`)

        // Generate embeddings
        console.log('  Generating embeddings...')
        const embeddings = await generateEmbeddingsBatch(
            chunks.map(c => c.content),
            10,  // batch size
            200  // delay ms
        )

        // Store in vector database
        console.log('  Storing in Firestore...')
        await storeChunksBatch(chunks, embeddings)

        // Register source
        const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0)
        await registerSource(sourceId, {
            title: doc.title,
            sourceType,
            filePath,
            chunkCount: chunks.length,
            totalTokens,
        })

        console.log(`  ✅ Ingested: ${chunks.length} chunks, ${totalTokens} tokens`)

        return { success: true, chunks: chunks.length, tokens: totalTokens }
    } catch (error) {
        console.error(`  ❌ Error: ${error}`)
        return { success: false, chunks: 0, tokens: 0 }
    }
}

/**
 * Ingest all documents of a specific type
 */
async function ingestByType(sourceType: SourceType): Promise<void> {
    const dir = SOURCE_DIRS[sourceType]
    console.log(`\n📚 Ingesting ${sourceType} from ${dir}`)

    const files = await getFiles(dir)
    console.log(`Found ${files.length} files`)

    let successCount = 0
    let totalChunks = 0
    let totalTokens = 0

    for (const file of files) {
        const result = await ingestDocument(file, sourceType)
        if (result.success) successCount++
        totalChunks += result.chunks
        totalTokens += result.tokens
    }

    console.log(`\n✅ ${sourceType} ingestion complete:`)
    console.log(`   Files processed: ${successCount}/${files.length}`)
    console.log(`   Total chunks: ${totalChunks}`)
    console.log(`   Total tokens: ${totalTokens}`)
}

/**
 * Ingest all document types
 */
async function ingestAll(): Promise<void> {
    console.log('🚀 Starting full RAG ingestion...\n')

    for (const sourceType of Object.keys(SOURCE_DIRS) as SourceType[]) {
        await ingestByType(sourceType)
    }

    // Print final stats
    console.log('\n📊 Final Statistics:')
    const stats = await getIngestionStats()
    console.log(`   Total sources: ${stats.totalSources}`)
    console.log(`   Total chunks: ${stats.totalChunks}`)
    console.log('   By type:')
    for (const [type, count] of Object.entries(stats.bySourceType)) {
        console.log(`     - ${type}: ${count} chunks`)
    }
}

// CLI setup
const program = new Command()

program
    .name('rag-ingest')
    .description('Ingest documents into Trade/Sync RAG knowledge base')
    .option('-t, --type <type>', 'Source type to ingest (books, articles, pdfs, github)')
    .option('--stats', 'Show ingestion statistics only')
    .action(async (options) => {
        if (options.stats) {
            const stats = await getIngestionStats()
            console.log('📊 RAG Knowledge Base Statistics:')
            console.log(`   Total sources: ${stats.totalSources}`)
            console.log(`   Total chunks: ${stats.totalChunks}`)
            console.log('   By type:')
            for (const [type, count] of Object.entries(stats.bySourceType)) {
                console.log(`     - ${type}: ${count} chunks`)
            }
            return
        }

        if (options.type) {
            if (!Object.keys(SOURCE_DIRS).includes(options.type)) {
                console.error(`Invalid type: ${options.type}`)
                console.error(`Valid types: ${Object.keys(SOURCE_DIRS).join(', ')}`)
                process.exit(1)
            }
            await ingestByType(options.type as SourceType)
        } else {
            await ingestAll()
        }
    })

program.parse()
