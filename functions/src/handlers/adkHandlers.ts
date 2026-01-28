import type { Request, Response } from 'express';
import { runAgent, sessionService, getOrCreateSession } from '../adk/index.js';
import { createEvent, getFunctionResponses } from '@google/adk';
import type { FunctionResponse } from '@google/genai';
import { z } from 'zod';
import { RSI, MACD, BollingerBands, ADX } from 'technicalindicators';
import { analyzeNewsStructured, analyzeVideoStructured } from '../services/structuredOutputService.js';
import { summarizeConversation } from '../services/summaryService.js';
import { SUMMARY_STATE_KEY } from '../adk/agents/advisorWorkflowState.js';

const StrategyInputSchema = z.object({
    symbol: z.string().min(1),
    prices: z.array(z.number()).min(30),
    highs: z.array(z.number()).optional(),
    lows: z.array(z.number()).optional(),
    closes: z.array(z.number()).optional(),
});

function formatHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>): string {
    const trimmed = history.slice(-12);
    return trimmed.map(item => `${item.role.toUpperCase()}: ${item.content}`).join('\n');
}

async function seedSessionSummary(
    session: { appName: string; userId: string; id: string; state: Record<string, unknown> },
    history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
    const trimmed = history.slice(-12);
    if (trimmed.length === 0) return;

    try {
        const events = trimmed.map(item => createEvent({
            author: item.role,
            content: {
                role: item.role,
                parts: [{ text: item.content }],
            },
        }));
        const summary = await summarizeConversation({ events });
        if (!summary) return;

        session.state = {
            ...session.state,
            [SUMMARY_STATE_KEY]: summary,
        };
        await sessionService.updateSession({
            appName: session.appName,
            userId: session.userId,
            sessionId: session.id,
            state: session.state,
        });
    } catch (error) {
        console.warn('[advisorChat] Failed to seed session summary:', error);
    }
}

type AdvisorSource = {
    title: string;
    sourceType: string;
    excerpt: string;
    score?: number;
    page?: number;
};

function extractSourcesFromResponse(response: FunctionResponse): AdvisorSource[] {
    const raw = (response.response as Record<string, unknown> | undefined) ?? {};
    const payload = (raw as { output?: Record<string, unknown> }).output ?? raw;

    if (response.name === 'search_knowledge_base') {
        const chunks = Array.isArray((payload as { chunks?: unknown }).chunks)
            ? (payload as { chunks: Array<Record<string, unknown>> }).chunks
            : [];

        return chunks
            .map((chunk) => {
                const content = typeof chunk.content === 'string' ? chunk.content : '';
                return {
                    title: typeof chunk.source === 'string' ? chunk.source : 'Unknown Source',
                    sourceType: typeof chunk.sourceType === 'string' ? chunk.sourceType : 'rag',
                    excerpt: content.slice(0, 240),
                    score: typeof chunk.score === 'number' ? chunk.score : undefined,
                    page: typeof chunk.page === 'number' ? chunk.page : undefined,
                };
            })
            .filter((item) => item.excerpt.length > 0);
    }

    if (response.name === 'vertex_ai_search') {
        const results = Array.isArray((payload as { results?: unknown }).results)
            ? (payload as { results: Array<Record<string, unknown>> }).results
            : [];
        return results
            .map((item) => ({
                title: typeof item.title === 'string' ? item.title : 'Vertex Search Result',
                sourceType: 'vertex_search',
                excerpt: typeof item.snippet === 'string' ? item.snippet.slice(0, 240) : '',
                score: typeof item.score === 'number' ? item.score : undefined,
            }))
            .filter((item) => item.excerpt.length > 0);
    }

    if (response.name === 'vertex_ai_rag_retrieval') {
        const chunks = Array.isArray((payload as { chunks?: unknown }).chunks)
            ? (payload as { chunks: Array<Record<string, unknown>> }).chunks
            : [];
        return chunks
            .map((chunk) => ({
                title: typeof chunk.source === 'string' ? chunk.source : 'Vertex RAG',
                sourceType: 'vertex_rag',
                excerpt: typeof chunk.content === 'string' ? chunk.content.slice(0, 240) : '',
                score: typeof chunk.score === 'number' ? chunk.score : undefined,
            }))
            .filter((item) => item.excerpt.length > 0);
    }

    return [];
}

function dedupeSources(sources: AdvisorSource[], limit: number = 5): AdvisorSource[] {
    const byTitle = new Map<string, AdvisorSource>();
    for (const source of sources) {
        const existing = byTitle.get(source.title);
        if (!existing || (source.score ?? 0) > (existing.score ?? 0)) {
            byTitle.set(source.title, source);
        }
    }
    return Array.from(byTitle.values())
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, limit);
}

async function collectAgentText(
    userId: string,
    sessionId: string,
    message: string
): Promise<{ text: string; sources: AdvisorSource[] }> {
    let fullResponse = '';
    const sources: AdvisorSource[] = [];
    for await (const event of runAgent(userId, sessionId, message)) {
        for (const part of event.content?.parts ?? []) {
            if ('text' in part && part.text) {
                fullResponse += part.text;
            }
        }

        const functionResponses = getFunctionResponses(event);
        for (const response of functionResponses) {
            sources.push(...extractSourcesFromResponse(response));
        }
    }
    return { text: fullResponse, sources: dedupeSources(sources) };
}

export async function handleAdvisorChat(req: Request, res: Response) {
    const { userId, message, sessionId, conversationHistory } = req.body;

    if (!message) {
        res.status(400).json({ error: 'Missing message' });
        return;
    }

    const resolvedUserId = userId || 'anonymous';
    const { session, isNew } = await getOrCreateSession(resolvedUserId, sessionId);

    if (isNew && Array.isArray(conversationHistory)) {
        await seedSessionSummary(session, conversationHistory);
    }

    const historyText = (isNew && Array.isArray(conversationHistory)) ? formatHistory(conversationHistory) : '';
    const prompt = historyText ? `Conversation so far:\n${historyText}\n\nUSER: ${message}` : message;

    const { text, sources } = await collectAgentText(resolvedUserId, session.id, prompt);

    res.json({
        response: text,
        sources,
        sessionId: session.id,
    });
}

export async function handleAdvisorChatStream(req: Request, res: Response) {
    const { userId, message, sessionId, conversationHistory } = req.body;

    if (!message) {
        res.status(400).json({ error: 'Missing message' });
        return;
    }

    const resolvedUserId = userId || 'anonymous';
    const { session, isNew } = await getOrCreateSession(resolvedUserId, sessionId);

    if (isNew && Array.isArray(conversationHistory)) {
        await seedSessionSummary(session, conversationHistory);
    }

    const historyText = (isNew && Array.isArray(conversationHistory)) ? formatHistory(conversationHistory) : '';
    const prompt = historyText ? `Conversation so far:\n${historyText}\n\nUSER: ${message}` : message;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }

    let eventCount = 0;
    const sources: AdvisorSource[] = [];
    for await (const event of runAgent(resolvedUserId, session.id, prompt)) {
        for (const part of event.content?.parts ?? []) {
            if ('text' in part && part.text) {
                res.write(`event: text\ndata: ${JSON.stringify(part.text)}\n\n`);
                eventCount++;
            }

            if (part.functionCall) {
                res.write(`event: function_call\ndata: ${JSON.stringify({ name: part.functionCall.name, args: part.functionCall.args })}\n\n`);
                eventCount++;
            }
        }

        const functionResponses = getFunctionResponses(event);
        for (const response of functionResponses) {
            sources.push(...extractSourcesFromResponse(response));
        }
    }

    res.write(`event: sources\ndata: ${JSON.stringify(dedupeSources(sources))}\n\n`);
    console.log(`[handleAdvisorChatStream] Sent ${eventCount} events`);
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
}

export async function handleAnalyzeNews(req: Request, res: Response) {
    const inputSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        content: z.string().optional(),
        source: z.string().optional(),
    });

    const parsed = inputSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid news payload' });
        return;
    }

    const { title, description, content, source } = parsed.data;
    const articleText = [
        `Title: ${title}`,
        description ? `Description: ${description}` : null,
        content ? `Content: ${content}` : null,
        source ? `Source: ${source}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Analyze the following news article and return structured sentiment analysis.

Article:
${articleText}`;

    try {
        const analysis = await analyzeNewsStructured(prompt);
        res.json(analysis);
        return;
    } catch (error) {
        console.error('Structured news analysis failed:', error);
    }

    res.json({
        sentiment: 'neutral',
        confidence: 0,
        summary: 'Analysis unavailable.',
        tickers: [],
    });
}

export async function handleAnalyzeVideo(req: Request, res: Response) {
    const { videoUrl, title, description } = req.body;

    if (!videoUrl) {
        res.status(400).json({ error: 'Missing videoUrl' });
        return;
    }

    const userId = 'video_analyzer';
    const message = `Analyze this trading video with transcript and metadata.

Video: ${videoUrl}${title ? `\nTitle: ${title}` : ''}${description ? `\nDescription: ${description}` : ''}`;

    try {
        const analysis = await analyzeVideoStructured(message);
        res.json(analysis);
        return;
    } catch (error) {
        console.error('Structured video analysis failed:', error);
    }

    res.json({
        transcript: 'Transcript unavailable.',
        sentiment: 'neutral',
        confidence: 0,
        tickers: [],
        priceLevels: { targets: [], supports: [], resistances: [] },
        summary: 'Analysis unavailable.',
        keyPoints: [],
    });
}

export async function handleAnalyzeDocument(req: Request, res: Response) {
    const { content } = req.body;

    if (!content) {
        res.status(400).json({ error: 'Missing content' });
        return;
    }

    const userId = 'anonymous';
    const message = `Analyze this document:\n${content}`;
    
    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
    });

    const fullResponse = await collectAgentText(userId, session.id, message);
    res.json({ result: fullResponse });
}

export async function handleSuggestStrategy(req: Request, res: Response) {
    const parsed = StrategyInputSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid strategy payload' });
        return;
    }

    const { symbol, prices, highs, lows, closes } = parsed.data;
    const closeSeries = (closes && closes.length > 0) ? closes : prices;
    const highSeries = (highs && highs.length === closeSeries.length) ? highs : closeSeries;
    const lowSeries = (lows && lows.length === closeSeries.length) ? lows : closeSeries;

    const rsiSeries = RSI.calculate({ values: closeSeries, period: 14 });
    const rsi = rsiSeries[rsiSeries.length - 1] ?? 50;

    const macdSeries = MACD.calculate({
        values: closeSeries,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });
    const macdRaw = macdSeries[macdSeries.length - 1];
    const macd = {
        MACD: macdRaw?.MACD ?? 0,
        signal: macdRaw?.signal ?? 0,
        histogram: macdRaw?.histogram ?? 0,
    };

    const bbSeries = BollingerBands.calculate({
        period: 20,
        stdDev: 2,
        values: closeSeries,
    });
    const bbRaw = bbSeries[bbSeries.length - 1];
    const fallbackPrice = closeSeries[closeSeries.length - 1] ?? 0;
    const bb = {
        upper: bbRaw?.upper ?? fallbackPrice,
        middle: bbRaw?.middle ?? fallbackPrice,
        lower: bbRaw?.lower ?? fallbackPrice,
    };

    let adxValue = 0;
    if (highSeries.length === closeSeries.length && lowSeries.length === closeSeries.length) {
        const adxSeries = ADX.calculate({
            high: highSeries,
            low: lowSeries,
            close: closeSeries,
            period: 14,
        });
        adxValue = adxSeries[adxSeries.length - 1]?.adx ?? 0;
    }

    const signals: Array<{
        type: string;
        direction: 'buy' | 'sell' | 'hold';
        strength: number;
        reasoning: string;
    }> = [];

    const currentPrice = closeSeries[closeSeries.length - 1] ?? 0;

    if (rsi < 30) {
        const strength = Math.min(1, (30 - rsi) / 30);
        signals.push({
            type: 'RSI Oversold',
            direction: 'buy',
            strength,
            reasoning: `RSI at ${rsi.toFixed(1)} suggests oversold conditions.`,
        });
    } else if (rsi > 70) {
        const strength = Math.min(1, (rsi - 70) / 30);
        signals.push({
            type: 'RSI Overbought',
            direction: 'sell',
            strength,
            reasoning: `RSI at ${rsi.toFixed(1)} suggests overbought conditions.`,
        });
    }

    if (macd.histogram > 0) {
        const strength = adxValue >= 25 ? 0.8 : 0.6;
        signals.push({
            type: 'MACD Bullish',
            direction: 'buy',
            strength,
            reasoning: 'MACD histogram is positive, indicating bullish momentum.',
        });
    } else if (macd.histogram < 0) {
        const strength = adxValue >= 25 ? 0.8 : 0.6;
        signals.push({
            type: 'MACD Bearish',
            direction: 'sell',
            strength,
            reasoning: 'MACD histogram is negative, indicating bearish momentum.',
        });
    }

    if (currentPrice > bb.upper) {
        signals.push({
            type: 'Bollinger Upper Break',
            direction: 'sell',
            strength: 0.6,
            reasoning: 'Price is above the upper Bollinger Band (mean reversion risk).',
        });
    } else if (currentPrice < bb.lower) {
        signals.push({
            type: 'Bollinger Lower Break',
            direction: 'buy',
            strength: 0.6,
            reasoning: 'Price is below the lower Bollinger Band (mean reversion opportunity).',
        });
    }

    let recommendedStrategy: 'mean_reversion' | 'momentum' | 'pattern_recognition' | 'hold' = 'hold';
    if (adxValue >= 25 && Math.abs(macd.histogram) > 0) {
        recommendedStrategy = 'momentum';
    } else if (rsi < 35 || rsi > 65 || currentPrice > bb.upper || currentPrice < bb.lower) {
        recommendedStrategy = 'mean_reversion';
    } else if (signals.length > 0) {
        recommendedStrategy = 'pattern_recognition';
    }

    const strongestSignal = signals.reduce((acc, signal) => Math.max(acc, signal.strength), 0);
    const confidence = Math.max(0.1, Math.min(1, strongestSignal || 0.3));

    const aiAnalysis = [
        `RSI: ${rsi.toFixed(1)}`,
        `MACD histogram: ${macd.histogram.toFixed(3)}`,
        `ADX: ${adxValue.toFixed(1)}`,
        `Bollinger Bands: ${bb.lower.toFixed(2)} / ${bb.middle.toFixed(2)} / ${bb.upper.toFixed(2)}`,
    ].join(' | ');

    res.json({
        recommendedStrategy,
        confidence,
        signals,
        technicalIndicators: {
            rsi,
            macd: {
                value: macd.MACD,
                signal: macd.signal,
                histogram: macd.histogram,
            },
            bollingerBands: {
                upper: bb.upper,
                middle: bb.middle,
                lower: bb.lower,
            },
            adx: adxValue,
        },
        aiAnalysis,
    });
}
