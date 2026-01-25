import { FunctionTool } from '@google/adk';
import { z } from 'zod';

export const memorySearchTool = new FunctionTool({
    name: 'search_memory',
    description: 'Searches long-term memory for user preferences, past decisions, and saved context.',
    parameters: z.object({
        query: z.string().describe('What to search for (risk profile, time horizon, preferences, prior decisions).'),
        limit: z.number().optional().describe('Max number of memories to return.'),
    }),
    execute: async ({ query, limit }, toolContext) => {
        if (!toolContext) {
            return { error: true, message: 'Memory service unavailable.' };
        }
        const result = await toolContext.searchMemory(query);
        const memories = result.memories || [];
        const sliced = typeof limit === 'number' ? memories.slice(0, limit) : memories.slice(0, 5);
        return sliced.map(memory => ({
            text: memory.content?.parts?.map(part => ('text' in part ? part.text : '')).join(' ').trim(),
            author: memory.author,
            timestamp: memory.timestamp,
        })).filter(item => item.text);
    },
});
