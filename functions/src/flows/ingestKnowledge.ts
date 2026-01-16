
/**
 * Knowledge Base Ingestion Flow
 * Generates embeddings for static knowledge and stores in Firestore
 */

import { ai } from '../genkit.js';
import { db, EMBEDDING_MODEL } from '../config.js';
import { z } from 'genkit';

// Expanded Knowledge Base
const KNOWLEDGE_BASE = [
    {
        title: "Technical Analysis of the Financial Markets (John Murphy)",
        type: "book",
        content: `Technical analysis is the study of market action, primarily through the use of charts, for the purpose of forecasting future price trends.
        The three premises of technical analysis are:
        1. Market action discounts everything.
        2. Prices move in trends.
        3. History repeats itself.
        Support is a level or area on the chart under the market where buying interest is sufficiently strong to overcome selling pressure.
        Resistance is the opposite of support, representing a price level or area over the market where selling pressure overcomes buying pressure.
        Trend reversal patterns include Head and Shoulders, Double Tops/Bottoms.
        Continuation patterns include Triangles, Flags, and Pennants.`
    },
    {
        title: "Trading in the Zone (Mark Douglas)",
        type: "book",
        content: `Successful trading is 80% psychology and 20% methodology.
        The "hardway" to learn trading is focusing on opportunities to make money without managing risk.
        Five fundamental truths:
        1. Anything can happen.
        2. You don't need to know what is going to happen next in order to make money.
        3. There is a random distribution between wins and losses for any given set of variables that define an edge.
        4. An edge is nothing more than an indication of a higher probability of one thing happening over another.
        5. Every moment in the market is unique.
        Accepting risk means accepting the consequences of your trades without emotional discomfort or fear.`
    },
    {
        title: "The Intelligent Investor (Benjamin Graham)",
        type: "book",
        content: `Value investing involves buying securities that appear underpriced by some form of fundamental analysis.
        The "Margin of Safety" is the central concept of investment. It means buying at a price sufficiently below intrinsic value to allow for error.
        Mr. Market is a parable: The market is a manic-depressive partner who offers to buy or sell shares every day at different prices. You should not be influenced by his moods but profit from his folly.
        Defensive investors should focus on diversification and high-grade bonds/stocks.
        Enterprising investors can look for undervalued bargains but must put in significant effort.`
    },
    {
        title: "Thinking, Fast and Slow (Daniel Kahneman)",
        type: "book",
        content: `System 1 is fast, intuitive, and emotional; System 2 is slower, more deliberative, and more logical.
        Traders often fall victim to cognitive biases like Loss Aversion (pain of losing is psychologically about twice as powerful as the pleasure of gaining).
        Confirmation Bias leads investors to seek out information that confirms their existing beliefs and ignore contradictory evidence.
        Overconfidence Effect: Investors tend to overestimate their own knowledge and ability to predict the market.`
    }
];

export const ingestKnowledgeFlow = ai.defineFlow({
    name: 'ingestKnowledge',
    inputSchema: z.void(),
    outputSchema: z.object({ count: z.number(), status: z.string() }),
}, async () => {
    // Optional: Clear existing chunks to avoid duplicates during dev
    // In production, you'd manage this more carefully
    const chunksRef = db.collection('rag_chunks');
    const existing = await chunksRef.get();
    if (existing.size > 0) {
        const batch = db.batch();
        existing.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    let count = 0;

    for (const item of KNOWLEDGE_BASE) {
        // Generate embedding
        // Genkit embed returns array of embeddings
        const embeddingResult = await ai.embed({
            embedder: EMBEDDING_MODEL,
            content: item.content
        });
        const embedding = embeddingResult[0].embedding;

        await chunksRef.add({
            content: item.content,
            metadata: {
                title: item.title,
                sourceType: item.type,
                ingestedAt: new Date().toISOString()
            },
            embedding: embedding // Vector field
        });
        count++;
    }

    return { count, status: 'Success' };
});

import type { Request, Response } from 'express';
export async function handleIngestKnowledge(req: Request, res: Response) {
    try {
        const result = await ingestKnowledgeFlow();
        res.json(result);
    } catch (error: any) {
        console.error('Ingestion error:', error);
        res.status(500).json({ error: String(error) });
    }
}
