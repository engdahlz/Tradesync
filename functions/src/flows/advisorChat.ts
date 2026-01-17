
/**
 * Financial Advisor RAG Chat Flow
 */

import type { Request, Response } from 'express';
import { db, MODEL_PRO, THINKING_BUDGET_HIGH, GOOGLE_AI_API_KEY } from '../config.js';
import { ai, vertexAI } from '../genkit.js';
import { z } from 'genkit';
import { marketNewsTool, strategyTool } from '../tools/marketTools.js';

const CHUNKS_COLLECTION = 'rag_chunks';

function normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return embedding;
    return embedding.map(val => val / norm);
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });
    
    const response = await genAI.models.embedContent({
        model: 'gemini-embedding-001',
        contents: query,
        config: {
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: 768,
        }
    });
    return normalizeEmbedding(response.embeddings![0].values!);
}

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
    })).optional(),
    groundingSources: z.array(z.object({
        url: z.string(),
        title: z.string().optional()
    })).optional(),
    thinkingUsed: z.boolean().optional()
});

async function retrieveContext(query: string, topK: number = 5) {
    try {
        console.log(`[advisorChat] Generating embedding for query: "${query}"`);
        
        const queryEmbedding = await generateQueryEmbedding(query);

        const vectorQuery = db.collection(CHUNKS_COLLECTION)
            .findNearest('embedding', queryEmbedding, {
                limit: topK,
                distanceMeasure: 'COSINE',
            });

        const snapshot = await vectorQuery.get();
        
        if (snapshot.empty) {
            console.log('[advisorChat] No chunks found in vector search');
            return [];
        }

        const results = snapshot.docs.map(doc => {
            const data = doc.data();
            const distance = data._distance ?? 0;
            const score = 1 - distance;
            
            return {
                content: data.content,
                title: data.metadata?.title || 'Unknown',
                sourceType: data.metadata?.sourceType || 'unknown',
                score
            };
        });

        console.log(`[advisorChat] Retrieved ${results.length} chunks via vector search. Top score: ${results[0]?.score?.toFixed(3)}`);

        return results;

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

    // 4. Generate with Genkit + Context Caching
    const result = await ai.generate({
        messages: [
            {
                role: 'user',
                content: [{ text: contextSection }],
            },
            {
                role: 'model',
                content: [{ text: 'I will answer questions based on this trading knowledge base.' }],
                metadata: {
                    cache: {
                        ttlSeconds: 3600,
                    },
                },
            },
        ],
        model: vertexAI.model(MODEL_PRO),
        prompt: `${historyContext ? `## CONVERSATION HISTORY\n${historyContext}\n\n` : ''}## USER QUESTION\n${message}\n\n## YOUR RESPONSE`,
        tools: [marketNewsTool, strategyTool],
        config: {
            temperature: 0.7,
            thinkingConfig: {
                thinkingBudget: THINKING_BUDGET_HIGH,
            },
            tools: [
                { googleSearch: {} },
                { urlContext: {} }
            ]
        }
    });

    const groundingSources: Array<{ url: string; title?: string }> = [];
    
    const rawResponse = result.toJSON?.() as Record<string, unknown> | undefined;
    const candidates = rawResponse?.candidates as Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> | undefined;
    
    if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
        for (const chunk of candidates[0].groundingMetadata.groundingChunks) {
            if (chunk.web?.uri) {
                groundingSources.push({
                    url: chunk.web.uri,
                    title: chunk.web.title
                });
            }
        }
    }

    return {
        response: result.text,
        sources: sources.length > 0 ? sources : undefined,
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
        thinkingUsed: true
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

export async function handleAdvisorChatStream(req: Request, res: Response) {
    const { message, conversationHistory = [], topK = 5 } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
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

        const historyContext = conversationHistory
            .slice(-6)
            .map((msg: { role: string; content: string }) =>
                `${msg.role === 'user' ? 'User' : 'Advisor'}: ${msg.content}`
            )
            .join('\n');

        const prompt = `You are an expert Financial Advisor AI for Trade/Sync.
    
${contextSection}

## YOUR ROLE
1. Answer questions drawing from the knowledge base
2. Cite specific sources when making recommendations
3. Balance technical analysis with psychological insights
4. Emphasize risk management and discipline
5. NEVER give specific financial advice for *individual* personal finance situations
6. Use your tools (marketNews, strategy) to provide REAL-TIME data when asked about specific assets

${historyContext ? `## CONVERSATION HISTORY\n${historyContext}\n` : ''}

## USER QUESTION
${message}

## YOUR RESPONSE`;

        if (sources.length > 0) {
            res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);
        }

        const { stream, response } = ai.generateStream({
            messages: [
                {
                    role: 'user',
                    content: [{ text: contextSection }],
                },
                {
                    role: 'model',
                    content: [{ text: 'I will answer questions based on this trading knowledge base.' }],
                    metadata: {
                        cache: {
                            ttlSeconds: 3600,
                        },
                    },
                },
            ],
            model: vertexAI.model(MODEL_PRO),
            prompt: `${historyContext ? `## CONVERSATION HISTORY\n${historyContext}\n\n` : ''}## USER QUESTION\n${message}\n\n## YOUR RESPONSE`,
            tools: [marketNewsTool, strategyTool],
            config: {
                temperature: 0.7,
                thinkingConfig: {
                    thinkingBudget: THINKING_BUDGET_HIGH,
                },
                tools: [
                    { googleSearch: {} },
                    { urlContext: {} }
                ]
            }
        });

        for await (const chunk of stream) {
            if (chunk.text) {
                res.write(`event: text\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
            }
        }

        const finalResponse = await response;
        
        const groundingSources: Array<{ url: string; title?: string }> = [];
        const rawResponse = finalResponse.toJSON?.() as Record<string, unknown> | undefined;
        const candidates = rawResponse?.candidates as Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> | undefined;
        
        if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
            for (const grChunk of candidates[0].groundingMetadata.groundingChunks) {
                if (grChunk.web?.uri) {
                    groundingSources.push({
                        url: grChunk.web.uri,
                        title: grChunk.web.title
                    });
                }
            }
        }

        if (groundingSources.length > 0) {
            res.write(`event: grounding\ndata: ${JSON.stringify(groundingSources)}\n\n`);
        }

        res.write(`event: done\ndata: ${JSON.stringify({ thinkingUsed: true })}\n\n`);
        res.end();

    } catch (error: unknown) {
        console.error('[advisorChatStream] Error:', error);
        res.write(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`);
        res.end();
    }
}
