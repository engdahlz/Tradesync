/**
 * Firestore Vector Store for RAG
 * Uses Firestore's native vector search capability
 */

import { Firestore, FieldValue } from '@google-cloud/firestore'
import { TextChunk } from './chunker.js'

// Collection names
const CHUNKS_COLLECTION = 'rag_chunks'
const SOURCES_COLLECTION = 'rag_sources'

let db: Firestore | null = null

function getFirestore(): Firestore {
    if (!db) {
        db = new Firestore({
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
        })
    }
    return db
}

/**
 * Store a chunk with its embedding
 */
export async function storeChunk(
    chunk: TextChunk,
    embedding: number[]
): Promise<void> {
    const db = getFirestore()

    await db.collection(CHUNKS_COLLECTION).doc(chunk.id).set({
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        metadata: chunk.metadata,
        embedding: FieldValue.vector(embedding),
        createdAt: FieldValue.serverTimestamp(),
    })
}

/**
 * Store multiple chunks with embeddings in batch
 */
export async function storeChunksBatch(
    chunks: TextChunk[],
    embeddings: number[][]
): Promise<void> {
    const db = getFirestore()

    // Firestore batch limit is 500
    const batchSize = 450

    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = db.batch()
        const chunkSlice = chunks.slice(i, i + batchSize)
        const embeddingSlice = embeddings.slice(i, i + batchSize)

        for (let j = 0; j < chunkSlice.length; j++) {
            const chunk = chunkSlice[j]
            const embedding = embeddingSlice[j]
            const docRef = db.collection(CHUNKS_COLLECTION).doc(chunk.id)

            batch.set(docRef, {
                content: chunk.content,
                tokenCount: chunk.tokenCount,
                metadata: chunk.metadata,
                embedding: FieldValue.vector(embedding),
                createdAt: FieldValue.serverTimestamp(),
            })
        }

        await batch.commit()
        console.log(`  Stored batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)
    }
}

/**
 * Register a source document
 */
export async function registerSource(
    sourceId: string,
    metadata: {
        title: string
        sourceType: string
        filePath: string
        chunkCount: number
        totalTokens: number
    }
): Promise<void> {
    const db = getFirestore()

    await db.collection(SOURCES_COLLECTION).doc(sourceId).set({
        ...metadata,
        ingestedAt: FieldValue.serverTimestamp(),
    })
}

/**
 * Check if a source has already been ingested
 */
export async function isSourceIngested(sourceId: string): Promise<boolean> {
    const db = getFirestore()
    const doc = await db.collection(SOURCES_COLLECTION).doc(sourceId).get()
    return doc.exists
}

/**
 * Query similar chunks by embedding
 * Uses Firestore's vector search
 */
export async function querySimilarChunks(
    queryEmbedding: number[],
    limit: number = 5,
    sourceType?: string
): Promise<Array<TextChunk & { similarity: number }>> {
    const db = getFirestore()

    // Build query with optional filter
    const query = db.collection(CHUNKS_COLLECTION)
        .findNearest('embedding', queryEmbedding, {
            limit,
            distanceMeasure: 'COSINE',
        })

    const snapshot = await query.get()

    const results: Array<TextChunk & { similarity: number }> = []

    snapshot.forEach(doc => {
        const data = doc.data()

        // Filter by sourceType if specified
        if (sourceType && data.metadata?.sourceType !== sourceType) {
            return
        }

        results.push({
            id: doc.id,
            content: data.content,
            tokenCount: data.tokenCount,
            metadata: data.metadata,
            similarity: typeof (data._distance ?? data.distance) === 'number'
                ? 1 - (data._distance ?? data.distance)
                : 0,
        })
    })

    return results
}

/**
 * Get ingestion statistics
 */
export async function getIngestionStats(): Promise<{
    totalChunks: number
    totalSources: number
    bySourceType: Record<string, number>
}> {
    const db = getFirestore()

    const chunksSnap = await db.collection(CHUNKS_COLLECTION).count().get()
    const sourcesSnap = await db.collection(SOURCES_COLLECTION).count().get()

    // Get breakdown by source type
    const sources = await db.collection(SOURCES_COLLECTION).get()
    const bySourceType: Record<string, number> = {}

    sources.forEach(doc => {
        const type = doc.data().sourceType || 'unknown'
        bySourceType[type] = (bySourceType[type] || 0) + doc.data().chunkCount
    })

    return {
        totalChunks: chunksSnap.data().count,
        totalSources: sourcesSnap.data().count,
        bySourceType,
    }
}
