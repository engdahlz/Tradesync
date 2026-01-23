
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
            chunks: results.map(r => {
                const chunk: any = {
                    content: r.content,
                    source: r.metadata?.title || 'Unknown Source'
                };
                
                // Check both snake_case and camelCase just in case
                const page = r.metadata?.page_number ?? r.metadata?.pageNumber;
                if (page !== undefined) {
                    chunk.page = page;
                }
                
                if (r.similarity !== 0) {
                    chunk.score = r.similarity;
                }
                
                return chunk;
            })
        };
    },
});
