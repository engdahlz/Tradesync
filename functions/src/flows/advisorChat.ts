
/**
 * Financial Advisor RAG Chat Flow
 * Retrieves context from knowledge base and generates responses via Genkit
 */

import type { Request, Response } from 'express';
import { db, MODEL_NAME, MODEL_PRO, EMBEDDING_MODEL } from '../config.js';
import { ai } from '../genkit.js';
import { z } from 'genkit';
import { marketNewsTool, strategyTool } from '../tools/marketTools.js';

const CHUNKS_COLLECTION = 'rag_chunks';

const FALLBACK_KNOWLEDGE = `You are grounded in the following authoritative trading literature:

## TECHNICAL ANALYSIS (John Murphy)
- Support/resistance levels, trend identification with moving averages
- Chart patterns, volume analysis, RSI/MACD interpretation

## TRADING PSYCHOLOGY (Mark Douglas - "Trading in the Zone")
- Accept risk before entering trades
- Think in probabilities, maintain consistency through rules
- Fear and greed are primary obstacles

## VALUE INVESTING (Benjamin Graham - "The Intelligent Investor")
- Invest with margin of safety
- Focus on intrinsic value, diversify
- Long-term perspective beats short-term trading
`;

const InputSchema = z.object({
    message: z.string(),
    conversationHistory: z.array(z.object({
        role: z.string(),
        content: z.string()
    })).optional().default([]),
    topK: z.number().optional().default(5)
});

const OutputSchema = z.object({
    response: z.string(),
    sources: z.array(z.object({
        title: z.string(),
        sourceType: z.string(),
        excerpt: z.string()
    })).optional()
});

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / ((Math.sqrt(normA) * Math.sqrt(normB)) || 1);
}

async function retrieveContext(query: string, topK: number = 5) {
    try {
        console.log(`[advisorChat] Generating embedding for query: "${query}"`);
        // 1. Generate Query Embedding
        const embeddingResult = await ai.embed({
            embedder: EMBEDDING_MODEL,
            content: query
        });

        // Ensure we have a valid embedding
        if (!embeddingResult || !embeddingResult[0] || !embeddingResult[0].embedding) {
            console.error('[advisorChat] Failed to generate embedding');
            return [];
        }

        const queryEmbedding = embeddingResult[0].embedding;

        // 2. Fetch All Chunks (Small scale optimization)
        const snapshot = await db.collection(CHUNKS_COLLECTION).get();
        if (snapshot.empty) return [];

        // 3. Score Chunks
        const scoredChunks = snapshot.docs.map(doc => {
            const data = doc.data();
            const embedding = data.embedding;

            // Handle missing embeddings gracefully
            if (!embedding || !Array.isArray(embedding)) return { score: -1, data };

            const score = cosineSimilarity(queryEmbedding, embedding);
            return { score, data };
        });

        // 4. Sort & filter
        scoredChunks.sort((a, b) => b.score - a.score);

        const topResults = scoredChunks.slice(0, topK);

        console.log(`[advisorChat] Retrieved ${topResults.length} chunks. Top score: ${topResults[0]?.score}`);

        return topResults.map(item => ({
            content: item.data.content,
            title: item.data.metadata?.title || 'Unknown',
            sourceType: item.data.metadata?.sourceType || 'unknown',
            score: item.score
        }));

    } catch (error) {
        console.error('[advisorChat] RAG Retrieval error:', error);
        return [];
    }
}

export const advisorChatFlow = ai.defineFlow({
    name: 'advisorChat',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { message, conversationHistory = [], topK = 5 } = input;

    // 1. Retrieve Context
    const retrievedChunks = await retrieveContext(message, topK);

    let contextSection = '';
    const sources: Array<{ title: string; sourceType: string; excerpt: string }> = [];

    if (retrievedChunks.length > 0) {
        contextSection = `\n## RELEVANT KNOWLEDGE FROM YOUR LIBRARY\n\n${retrievedChunks.map((chunk, i) =>
            `### Source ${i + 1}: ${chunk.title} (${chunk.sourceType}) [Relevance: ${chunk.score.toFixed(2)}]\n${chunk.content}\n`
        ).join('\n')}`;

        retrievedChunks.forEach(chunk => {
            sources.push({
                title: chunk.title,
                sourceType: chunk.sourceType,
                excerpt: chunk.content.slice(0, 150) + '...',
            });
        });
    } else {
        contextSection = FALLBACK_KNOWLEDGE;
    }

    // 2. Format History
    const historyContext = conversationHistory
        .slice(-6)
        .map((msg) =>
            `${msg.role === 'user' ? 'User' : 'Advisor'}: ${msg.content}`
        )
        .join('\n');

    // 3. Construct Prompt
    const prompt = `You are an expert Financial Advisor AI for Trade/Sync.
    
${contextSection}

## YOUR ROLE
1. Answer questions drawing from the knowledge base
2. Cite specific sources when making recommendations
3. Balance technical analysis with psychological insights
4. Emphasize risk management and discipline
5. NEVER give specific financial advice for *individual* personal finance situations (e.g. "Should I put my life savings in X?"). However, you MAY provide technical analysis and market sentiment summaries for specific assets using your tools.
6. Use your tools (marketNews, strategy) to provide REAL-TIME data when asked about specific assets. If asked "What is the news on BTC?", use the news tool. If asked "Should I buy ETH?", use the strategy tool to get a technical recommendation.
7. If the user asks a vague question like "Should I buy stock?", ask them specifically which asset they are interested in (e.g. "To give you a proper technical analysis, which asset are you looking at? BTC, ETH?").

${historyContext ? `## CONVERSATION HISTORY\n${historyContext}\n` : ''}

## USER QUESTION
${message}

## YOUR RESPONSE`;

    // 4. Generate with Genkit
    const result = await ai.generate({
        model: MODEL_PRO,
        prompt: prompt,
        tools: [marketNewsTool, strategyTool],
        config: {
            temperature: 0.7,
        }
    });

    return {
        response: result.text,
        sources: sources.length > 0 ? sources : undefined,
    };
});

// Wrapper for compatibility with existing HTTP endpoint structure
export async function handleAdvisorChat(req: Request, res: Response) {
    try {
        const result = await advisorChatFlow(req.body);
        res.json(result);
    } catch (error: unknown) {
        console.error('[advisorChat] Error:', error);
        res.status(500).json({
            response: 'I apologize, but I encountered an error. Please try again.',
            error: String(error),
        });
    }
}
