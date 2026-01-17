/**
 * Text chunking utilities for RAG ingestion
 * Per @tradesync-strategy-engine: Chunk size 500 tokens with 50 token overlap
 */

export interface TextChunk {
    id: string
    content: string
    tokenCount: number
    metadata: {
        source: string
        sourceType: 'book' | 'article' | 'pdf' | 'github' | 'books' | 'articles' | 'pdfs'
        title: string
        chunkIndex: number
        totalChunks: number
        pageNumber?: number
    }
}

/**
 * Simple token estimation (roughly 4 chars per token for English)
 */
export function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4)
}

/**
 * Split text into sentences
 */
function splitSentences(text: string): string[] {
    // Split on sentence boundaries while preserving the delimiter
    const sentences = text.split(/(?<=[.!?])\s+/)
    return sentences.filter(s => s.trim().length > 0)
}

/**
 * Chunk text into overlapping segments
 * 
 * @param text - Full text to chunk
 * @param maxTokens - Maximum tokens per chunk (default: 500)
 * @param overlapTokens - Overlap between chunks (default: 50)
 */
export function chunkText(
    text: string,
    maxTokens: number = 500,
    overlapTokens: number = 50
): string[] {
    const sentences = splitSentences(text)
    const chunks: string[] = []
    let currentChunk = ''
    let currentTokens = 0

    for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence)

        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
            chunks.push(currentChunk.trim())

            // Create overlap by keeping last few sentences
            const words = currentChunk.split(' ')
            const overlapWords = Math.ceil(overlapTokens * 4 / 5) // ~4 chars per token, ~5 chars per word
            currentChunk = words.slice(-overlapWords).join(' ') + ' ' + sentence
            currentTokens = estimateTokenCount(currentChunk)
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence
            currentTokens += sentenceTokens
        }
    }

    // Add final chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
    }

    return chunks
}

/**
 * Create structured chunks with metadata
 */
export function createChunks(
    text: string,
    source: string,
    sourceType: TextChunk['metadata']['sourceType'],
    title: string,
    maxTokens: number = 500,
    overlapTokens: number = 50
): TextChunk[] {
    const rawChunks = chunkText(text, maxTokens, overlapTokens)

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
        }
    }))
}

/**
 * Sanitize string for use as document ID
 */
function sanitizeId(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 50)
}

/**
 * Clean text content
 */
export function cleanText(text: string): string {
    return text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove page numbers and headers/footers
        .replace(/\n\d+\n/g, '\n')
        // Fix common PDF extraction issues
        .replace(/([a-z])-\s+([a-z])/g, '$1$2') // Join hyphenated words
        .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
        .trim()
}
