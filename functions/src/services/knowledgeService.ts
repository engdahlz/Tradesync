
import { ai } from '../genkit.js';
import { db, EMBEDDING_MODEL } from '../config.js';
import { FieldValue } from 'firebase-admin/firestore';

export interface ChunkResult {
    content: string;
    metadata: any;
    similarity: number;
}

export async function searchKnowledge(query: string, limit: number = 5): Promise<ChunkResult[]> {
    try {
        // 1. Generate embedding for the query
        const embeddingResult = await ai.embed({
            embedder: EMBEDDING_MODEL,
            content: query
        });
        const vector = embeddingResult[0].embedding;

        // 2. Search Firestore Vector Store
        // Note: Requires Firestore Vector Search index to be created
        const collection = db.collection('rag_chunks');
        const vectorQuery = collection.findNearest('embedding', FieldValue.vector(vector), {
            limit,
            distanceMeasure: 'COSINE'
        });

        const snapshot = await vectorQuery.get();
        
        const results: ChunkResult[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // In some SDK versions, distance is automatically populated in doc.data() 
            // when using findNearest.
            results.push({
                content: data.content,
                metadata: data.metadata,
                similarity: data.distance ? 1 - data.distance : 0
            });
        });

        return results;

    } catch (error) {
        console.error('Vector search failed:', error);
        return [];
    }
}
