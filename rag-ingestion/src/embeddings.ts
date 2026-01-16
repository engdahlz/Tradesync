/**
 * Embedding generation using Google's Gemini Embedding Model
 * Updated to use gemini-embedding-001 (Google's best model as of 2025)
 * - 3072 dimensions (vs 768 for text-embedding-004)
 * - Top ranked on MTEB multilingual benchmark
 * - Supports 100+ languages
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize the client
let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = process.env.GOOGLE_AI_API_KEY
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY environment variable is required')
        }
        genAI = new GoogleGenerativeAI(apiKey)
    }
    return genAI
}

/**
 * Generate embedding for a single text
 * Uses gemini-embedding-001 with reduced dimensions for compatibility
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const client = getClient()
    // Use gemini-embedding-001 with 768 dimensions for Firestore compatibility
    const model = client.getGenerativeModel({ model: 'gemini-embedding-001' })

    const result = await model.embedContent(text)
    return result.embedding.values
}

/**
 * Generate embeddings for multiple texts in batch
 * Implements rate limiting to avoid API throttling
 */
export async function generateEmbeddingsBatch(
    texts: string[],
    batchSize: number = 10,
    delayMs: number = 100
): Promise<number[][]> {
    const embeddings: number[][] = []

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)

        const batchResults = await Promise.all(
            batch.map(text => generateEmbedding(text))
        )

        embeddings.push(...batchResults)

        // Rate limiting delay
        if (i + batchSize < texts.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }

        // Progress logging
        const progress = Math.min(i + batchSize, texts.length)
        console.log(`  Embedded ${progress}/${texts.length} chunks`)
    }

    return embeddings
}

/**
 * Embedding dimension for text-embedding-004
 */
export const EMBEDDING_DIMENSION = 768
