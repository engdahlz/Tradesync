/**
 * Embedding generation using gemini-embedding-001 (latest)
 * - 768 dimensions via outputDimensionality (matches Firestore index)
 * - Task types: RETRIEVAL_DOCUMENT for ingestion, RETRIEVAL_QUERY for search
 * - L2 normalization required for non-3072 dimensions per Gemini docs
 */

import { GoogleGenAI } from '@google/genai'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
    if (!client) {
        const apiKey = process.env.GOOGLE_AI_API_KEY
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY environment variable is required')
        }
        client = new GoogleGenAI({ apiKey })
    }
    return client
}

/**
 * L2 normalization - required for 768-dim embeddings
 * Without this, similarity is based on magnitude not direction
 */
function normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (norm === 0) return embedding
    return embedding.map(val => val / norm)
}

export async function generateEmbedding(text: string): Promise<number[]> {
    const ai = getClient()
    
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: 768,
        }
    })
    
    return normalizeEmbedding(response.embeddings![0].values!)
}

export async function generateQueryEmbedding(text: string): Promise<number[]> {
    const ai = getClient()
    
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: 768,
        }
    })
    
    return normalizeEmbedding(response.embeddings![0].values!)
}

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

        if (i + batchSize < texts.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }

        const progress = Math.min(i + batchSize, texts.length)
        console.log(`  Embedded ${progress}/${texts.length} chunks`)
    }

    return embeddings
}

export const EMBEDDING_DIMENSION = 768

export function validateEmbeddingDimension(embedding: number[]): boolean {
    return embedding.length === EMBEDDING_DIMENSION
}
