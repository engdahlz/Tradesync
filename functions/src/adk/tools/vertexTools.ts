import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { vertexSearch, vertexRagRetrieve } from '../../services/vertexAiService.js';

export const vertexSearchTool = new FunctionTool({
    name: 'vertex_ai_search',
    description: 'Searches a private Vertex AI Search datastore for fresh, authoritative results.',
    parameters: z.object({
        query: z.string().describe('Search query.'),
        pageSize: z.number().optional().describe('Max results to return.'),
    }),
    execute: async ({ query, pageSize }) => {
        try {
            const results = await vertexSearch(query, pageSize ?? 5);
            return { results };
        } catch (error) {
            return {
                error: true,
                message: error instanceof Error ? error.message : String(error),
            };
        }
    },
});

export const vertexRagTool = new FunctionTool({
    name: 'vertex_ai_rag_retrieval',
    description: 'Retrieves grounded context from Vertex AI RAG Engine.',
    parameters: z.object({
        query: z.string().describe('User query to retrieve context for.'),
        topK: z.number().optional().describe('Max chunks to return.'),
    }),
    execute: async ({ query, topK }) => {
        try {
            const chunks = await vertexRagRetrieve(query, topK ?? 5);
            return { chunks };
        } catch (error) {
            return {
                error: true,
                message: error instanceof Error ? error.message : String(error),
            };
        }
    },
});
