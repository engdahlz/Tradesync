import { FunctionCallingConfigMode, type FunctionDeclaration } from '@google/genai';
import { z } from 'zod';
import { MODEL_FLASH } from '../config.js';
import { getGenAiClient, getSafetySettings, getThinkingConfig, getTemperatureForModel } from './genaiClient.js';

const NewsAnalysisSchema = z.object({
    sentiment: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number().min(0).max(1),
    summary: z.string(),
    tickers: z.array(z.string()),
});

const VideoAnalysisSchema = z.object({
    transcript: z.string(),
    sentiment: z.enum(['bullish', 'bearish', 'neutral']),
    confidence: z.number().min(0).max(1),
    tickers: z.array(z.string()),
    priceLevels: z.object({
        targets: z.array(z.number()),
        supports: z.array(z.number()),
        resistances: z.array(z.number()),
    }),
    summary: z.string(),
    keyPoints: z.array(z.string()),
});

export type NewsAnalysis = z.infer<typeof NewsAnalysisSchema>;
export type VideoAnalysis = z.infer<typeof VideoAnalysisSchema>;

async function callStructured<T>(
    declaration: FunctionDeclaration,
    schema: z.ZodSchema<T>,
    prompt: string
): Promise<T> {
    const ai = getGenAiClient();
    const thinkingConfig = getThinkingConfig(MODEL_FLASH);
    const response = await ai.models.generateContent({
        model: MODEL_FLASH,
        contents: prompt,
        config: {
            safetySettings: getSafetySettings(),
            temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
            ...(thinkingConfig ? { thinkingConfig } : {}),
            toolConfig: {
                functionCallingConfig: {
                    mode: FunctionCallingConfigMode.ANY,
                    allowedFunctionNames: declaration.name ? [declaration.name] : undefined,
                },
            },
            tools: [{ functionDeclarations: [declaration] }],
        },
    });

    const call = response.functionCalls?.[0];
    if (!call?.args) {
        throw new Error('Model did not return a structured function call');
    }

    return schema.parse(call.args);
}

const analyzeNewsDeclaration: FunctionDeclaration = {
    name: 'analyze_news',
    description: 'Returns structured sentiment analysis for a news article.',
    parametersJsonSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['sentiment', 'confidence', 'summary', 'tickers'],
        properties: {
            sentiment: {
                type: 'string',
                enum: ['bullish', 'bearish', 'neutral'],
            },
            confidence: {
                type: 'number',
            },
            summary: {
                type: 'string',
            },
            tickers: {
                type: 'array',
                items: { type: 'string' },
            },
        },
    },
};

const analyzeVideoDeclaration: FunctionDeclaration = {
    name: 'analyze_video',
    description: 'Returns structured analysis for a trading video transcript.',
    parametersJsonSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['transcript', 'sentiment', 'confidence', 'tickers', 'priceLevels', 'summary', 'keyPoints'],
        properties: {
            transcript: { type: 'string' },
            sentiment: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
            confidence: { type: 'number' },
            tickers: { type: 'array', items: { type: 'string' } },
            priceLevels: {
                type: 'object',
                additionalProperties: false,
                required: ['targets', 'supports', 'resistances'],
                properties: {
                    targets: { type: 'array', items: { type: 'number' } },
                    supports: { type: 'array', items: { type: 'number' } },
                    resistances: { type: 'array', items: { type: 'number' } },
                },
            },
            summary: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } },
        },
    },
};

export async function analyzeNewsStructured(prompt: string): Promise<NewsAnalysis> {
    return callStructured(analyzeNewsDeclaration, NewsAnalysisSchema, prompt);
}

export async function analyzeVideoStructured(prompt: string): Promise<VideoAnalysis> {
    return callStructured(analyzeVideoDeclaration, VideoAnalysisSchema, prompt);
}
