
import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { searchKnowledge } from '../../services/knowledgeService.js';

export const knowledgeTool = new FunctionTool({
    name: 'search_knowledge_base',
    description: 'Searches the RAG knowledge base for trading books, financial reports, and academic papers.',
    parameters: z.object({
        query: z.string().describe('The search query (e.g., "technical analysis patterns" or "value investing principles")'),
    }),
    execute: async ({ query }) => {
        const results = await searchKnowledge(query, 3);
        
        if (results.length === 0) {
            return {
                found: false,
                message: "No relevant information found in knowledge base."
            };
        }

        return {
            found: true,
            chunks: results.map(r => ({
                content: r.content,
                source: r.metadata?.title || 'Unknown Source'
            }))
        };
    },
});
