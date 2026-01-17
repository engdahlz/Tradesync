"use strict";
/**
 * Financial Advisor RAG Chat Flow
 * Retrieves context from knowledge base and generates responses via Genkit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisorChatFlow = void 0;
exports.handleAdvisorChat = handleAdvisorChat;
const config_js_1 = require("../config.js");
const genkit_js_1 = require("../genkit.js");
const genkit_1 = require("genkit");
const marketTools_js_1 = require("../tools/marketTools.js");
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
const InputSchema = genkit_1.z.object({
    message: genkit_1.z.string(),
    conversationHistory: genkit_1.z.array(genkit_1.z.object({
        role: genkit_1.z.string(),
        content: genkit_1.z.string()
    })).optional().default([]),
    topK: genkit_1.z.number().optional().default(5)
});
const OutputSchema = genkit_1.z.object({
    response: genkit_1.z.string(),
    sources: genkit_1.z.array(genkit_1.z.object({
        title: genkit_1.z.string(),
        sourceType: genkit_1.z.string(),
        excerpt: genkit_1.z.string()
    })).optional()
});
async function retrieveContext(query, topK = 5) {
    try {
        console.log(`[advisorChat] Generating embedding for query: "${query}"`);
        const embeddingResult = await genkit_js_1.ai.embed({
            embedder: config_js_1.EMBEDDING_MODEL,
            content: query
        });
        if (!embeddingResult || !embeddingResult[0] || !embeddingResult[0].embedding) {
            console.error('[advisorChat] Failed to generate embedding');
            return [];
        }
        const queryEmbedding = embeddingResult[0].embedding;
        // Use Firestore's native vector search (findNearest) for scalability
        const vectorQuery = config_js_1.db.collection(CHUNKS_COLLECTION)
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
    }
    catch (error) {
        console.error('[advisorChat] RAG Retrieval error:', error);
        return [];
    }
}
exports.advisorChatFlow = genkit_js_1.ai.defineFlow({
    name: 'advisorChat',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { message, conversationHistory = [], topK = 5 } = input;
    // 1. Retrieve Context
    const retrievedChunks = await retrieveContext(message, topK);
    let contextSection = '';
    const sources = [];
    if (retrievedChunks.length > 0) {
        contextSection = `\n## RELEVANT KNOWLEDGE FROM YOUR LIBRARY\n\n${retrievedChunks.map((chunk, i) => `### Source ${i + 1}: ${chunk.title} (${chunk.sourceType}) [Relevance: ${chunk.score.toFixed(2)}]\n${chunk.content}\n`).join('\n')}`;
        retrievedChunks.forEach(chunk => {
            sources.push({
                title: chunk.title,
                sourceType: chunk.sourceType,
                excerpt: chunk.content.slice(0, 150) + '...',
            });
        });
    }
    else {
        contextSection = FALLBACK_KNOWLEDGE;
    }
    // 2. Format History
    const historyContext = conversationHistory
        .slice(-6)
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Advisor'}: ${msg.content}`)
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
    const result = await genkit_js_1.ai.generate({
        model: config_js_1.MODEL_PRO,
        prompt: prompt,
        tools: [marketTools_js_1.marketNewsTool, marketTools_js_1.strategyTool],
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
async function handleAdvisorChat(req, res) {
    try {
        const result = await (0, exports.advisorChatFlow)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('[advisorChat] Error:', error);
        res.status(500).json({
            response: 'I apologize, but I encountered an error. Please try again.',
            error: String(error),
        });
    }
}
//# sourceMappingURL=advisorChat.js.map