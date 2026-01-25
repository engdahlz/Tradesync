/**
 * Trade/Sync API Service
 * Connects frontend to Firebase Functions
 */

import { z } from 'zod';
import { API_BASE } from './apiBase';

export { API_BASE };

export interface AdvisorChatResponse {
    response: string;
    sources?: Array<{
        title: string;
        sourceType: string;
        excerpt: string;
        page?: number;
        score?: number;
    }>;
}

export interface StrategyResponse {
    recommendedStrategy: 'mean_reversion' | 'momentum' | 'pattern_recognition' | 'hold';
    confidence: number;
    signals: Array<{
        type: string;
        direction: 'buy' | 'sell' | 'hold';
        strength: number;
        reasoning: string;
    }>;
    technicalIndicators: {
        rsi: number;
        macd: { value: number; signal: number; histogram: number };
        bollingerBands: { upper: number; middle: number; lower: number };
        adx: number;
    };
    aiAnalysis: string;
}

export interface VideoAnalysisResponse {
    transcript: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    tickers: string[];
    priceLevels: {
        targets: number[];
        supports: number[];
        resistances: number[];
    };
    summary: string;
    keyPoints: string[];
}

const VideoAnalysisResponseSchema = z.object({
    transcript: z.string(),
    sentiment: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number(),
    tickers: z.array(z.string()),
    priceLevels: z.object({
        targets: z.array(z.number()),
        supports: z.array(z.number()),
        resistances: z.array(z.number())
    }),
    summary: z.string(),
    keyPoints: z.array(z.string())
});

export interface NewsAnalysisResponse {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    summary: string;
    tickers: string[];
}

export interface TradeResult {
    success: boolean;
    orderId?: string;
    message: string;
    executedAt?: string;
    status: 'executed' | 'pending' | 'failed' | 'duplicate';
    mode?: 'LIVE' | 'PAPER';
}

/**
 * Chat with the AI Financial Advisor (RAG-enhanced)
 */
export async function advisorChat(
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    context?: { userId?: string; sessionId?: string }
): Promise<AdvisorChatResponse> {
    const response = await fetch(`${API_BASE}/advisorChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            conversationHistory,
            userId: context?.userId,
            sessionId: context?.sessionId,
            topK: 5,
        }),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Get AI trading strategy suggestion
 */
export async function suggestStrategy(data: {
    symbol: string;
    prices: number[];
    highs?: number[];
    lows?: number[];
    closes?: number[];
}): Promise<StrategyResponse> {
    const response = await fetch(`${API_BASE}/suggestStrategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Analyze a YouTube video for trading signals
 */
export async function analyzeVideo(
    videoUrl: string,
    title?: string,
    description?: string
): Promise<VideoAnalysisResponse> {
    const response = await fetch(`${API_BASE}/analyzeVideo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, title, description }),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const rawData = await response.json();
    const validation = VideoAnalysisResponseSchema.safeParse(rawData);

    if (!validation.success) {
        console.error('Video Analysis Validation Error:', validation.error);
        // Fail gracefully with a default object instead of throwing
        return {
            transcript: 'Data Unavailable',
            sentiment: 'neutral',
            confidence: 0,
            tickers: [],
            priceLevels: { targets: [], supports: [], resistances: [] },
            summary: 'Data format error from analysis service',
            keyPoints: []
        };
    }

    return validation.data;
}

/**
 * Analyze a news article
 */
export async function analyzeNews(article: {
    title: string;
    description: string;
    content: string;
    source: string;
}): Promise<NewsAnalysisResponse> {
    const response = await fetch(`${API_BASE}/analyzeNews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Execute a trade with idempotency
 */
export async function executeTrade(data: {
    userId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price?: number;
    orderType: 'market' | 'limit';
    idempotencyKey?: string;
    isDryRun?: boolean;
}): Promise<TradeResult> {
    const idempotencyKey = data.idempotencyKey || `${data.userId}-${data.symbol}-${data.side}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const response = await fetch(`${API_BASE}/executeTrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...data,
            idempotencyKey,
        }),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Schedule a sell order
 */
export async function scheduleSellOrder(data: {
    userId: string;
    orderId: string;
    symbol: string;
    quantity: number;
    sellAfterMinutes: number;
}): Promise<{ success: boolean; scheduleId?: string; executeAt?: string; message: string }> {
    const response = await fetch(`${API_BASE}/scheduleSellOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}
