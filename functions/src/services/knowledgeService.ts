import { db, EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '../config.js';
import { getGenAiClient } from './genaiClient.js';

export interface ChunkResult {
    content: string;
    metadata: any;
    similarity: number;
}

function normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return embedding;
    return embedding.map(val => val / norm);
}

export async function generateEmbedding(text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
    const ai = getGenAiClient();
    const embeddingDim = EMBEDDING_DIMENSION > 0 ? EMBEDDING_DIMENSION : undefined;
    const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: {
            taskType,
            ...(embeddingDim ? { outputDimensionality: embeddingDim } : {}),
        },
    });

    return normalizeEmbedding(response.embeddings![0].values!);
}

export async function searchKnowledge(query: string, limit: number = 5): Promise<ChunkResult[]> {
    try {
        // 1. Generate embedding for the query
        const vector = await generateEmbedding(query, 'RETRIEVAL_QUERY');

        // 2. Search Firestore Vector Store
        // Note: Requires Firestore Vector Search index to be created
        const collection = db.collection('rag_chunks');
        const vectorQuery = collection.findNearest('embedding', vector, {
            limit,
            distanceMeasure: 'COSINE'
        });

        const snapshot = await vectorQuery.get();
        
        const results: ChunkResult[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // In some SDK versions, distance is automatically populated in doc.data() 
            // when using findNearest.
            const distance = data._distance ?? data.distance;
            results.push({
                content: data.content,
                metadata: data.metadata,
                similarity: typeof distance === 'number' ? 1 - distance : 0
            });
        });

        return results;

    } catch (error) {
        console.error('Vector search failed:', error);
        return [];
    }
}
