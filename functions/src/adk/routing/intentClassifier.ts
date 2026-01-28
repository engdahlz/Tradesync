import { FunctionCallingConfigMode, type FunctionDeclaration } from '@google/genai';
import { z } from 'zod';
import { MODEL_FLASH } from '../../config.js';
import {
    getGenAiClient,
    getSafetySettings,
    getThinkingConfig,
    getTemperatureForModel,
} from '../../services/genaiClient.js';
import type { SelectionIntent } from './intentRouter.js';

const IntentSchema = z.object({
    symbols: z.array(z.string()).optional().default([]),
    hasSymbol: z.boolean().optional().default(false),
    wantsNews: z.boolean().optional().default(false),
    wantsTechnical: z.boolean().optional().default(false),
    wantsSignals: z.boolean().optional().default(false),
    wantsKnowledge: z.boolean().optional().default(false),
    wantsMemory: z.boolean().optional().default(false),
    wantsFresh: z.boolean().optional().default(false),
    wantsSources: z.boolean().optional().default(false),
    isTradeRequest: z.boolean().optional().default(false),
    isAnalysisRequest: z.boolean().optional().default(false),
    isQuickQuestion: z.boolean().optional().default(false),
});

type IntentSchemaType = z.infer<typeof IntentSchema>;

const classifyIntentDeclaration: FunctionDeclaration = {
    name: 'classify_intent',
    description: 'Classify routing intent for a trading assistant.',
    parametersJsonSchema: {
        type: 'object',
        additionalProperties: false,
        required: [
            'symbols',
            'hasSymbol',
            'wantsNews',
            'wantsTechnical',
            'wantsSignals',
            'wantsKnowledge',
            'wantsMemory',
            'wantsFresh',
            'wantsSources',
            'isTradeRequest',
            'isAnalysisRequest',
            'isQuickQuestion',
        ],
        properties: {
            symbols: { type: 'array', items: { type: 'string' } },
            hasSymbol: { type: 'boolean' },
            wantsNews: { type: 'boolean' },
            wantsTechnical: { type: 'boolean' },
            wantsSignals: { type: 'boolean' },
            wantsKnowledge: { type: 'boolean' },
            wantsMemory: { type: 'boolean' },
            wantsFresh: { type: 'boolean' },
            wantsSources: { type: 'boolean' },
            isTradeRequest: { type: 'boolean' },
            isAnalysisRequest: { type: 'boolean' },
            isQuickQuestion: { type: 'boolean' },
        },
    },
};

function buildClassifierPrompt(message: string): string {
    return `You are a routing classifier for a trading assistant.
Return a function call to classify_intent.

Guidelines:
- symbols: list tickers or asset symbols; map common names to tickers (bitcoin -> BTC, ethereum -> ETH, apple -> AAPL, tesla -> TSLA).
- hasSymbol: true if a specific asset/ticker is referenced.
- wantsNews: news, headlines, sentiment, macro updates, earnings, latest.
- wantsTechnical: charts, indicators, support/resistance, levels, technical analysis.
- wantsSignals: signals, scans, alerts, setups.
- wantsKnowledge: definitions, explanations, strategies, risk management, portfolio.
- wantsMemory: user's own portfolio, risk, preferences, constraints.
- wantsFresh: latest, recent, today, this week.
- wantsSources: asks for sources, citations, reports, studies.
- isTradeRequest: buy, sell, enter, exit, allocate, rebalance.
- isAnalysisRequest: analyze, outlook, thesis, forecast, compare.
- isQuickQuestion: short "what is/why/how" question.
If unsure, set fields to false.

User message:
"""${message}"""`;
}

function normalizeSymbols(rawSymbols: string[]): string[] {
    const normalized = rawSymbols
        .map((symbol) => symbol.trim().replace(/[^A-Za-z0-9./-]/g, '').toUpperCase())
        .filter((symbol) => symbol.length > 0 && symbol.length <= 12);
    return Array.from(new Set(normalized)).slice(0, 10);
}

function normalizeIntent(input: IntentSchemaType): SelectionIntent {
    const symbols = normalizeSymbols(input.symbols);
    const hasSymbol = input.hasSymbol || symbols.length > 0;
    return {
        symbols,
        hasSymbol,
        wantsNews: input.wantsNews,
        wantsTechnical: input.wantsTechnical,
        wantsSignals: input.wantsSignals,
        wantsKnowledge: input.wantsKnowledge,
        wantsMemory: input.wantsMemory,
        wantsFresh: input.wantsFresh,
        wantsSources: input.wantsSources,
        isTradeRequest: input.isTradeRequest,
        isAnalysisRequest: input.isAnalysisRequest,
        isQuickQuestion: input.isQuickQuestion,
    };
}

export async function classifyIntentWithLlm(message: string): Promise<SelectionIntent | null> {
    if (!message.trim()) {
        return null;
    }

    try {
        const ai = getGenAiClient();
        const thinkingConfig = getThinkingConfig(MODEL_FLASH);
        const response = await ai.models.generateContent({
            model: MODEL_FLASH,
            contents: buildClassifierPrompt(message),
            config: {
                safetySettings: getSafetySettings(),
                temperature: getTemperatureForModel(MODEL_FLASH, 0.1),
                ...(thinkingConfig ? { thinkingConfig } : {}),
                toolConfig: {
                    functionCallingConfig: {
                        mode: FunctionCallingConfigMode.ANY,
                        allowedFunctionNames: [classifyIntentDeclaration.name as string],
                    },
                },
                tools: [{ functionDeclarations: [classifyIntentDeclaration] }],
            },
        });

        const call = response.functionCalls?.[0];
        if (!call?.args) {
            return null;
        }

        const parsed = IntentSchema.parse(call.args);
        return normalizeIntent(parsed);
    } catch (error) {
        console.warn('[Routing] LLM intent classification failed:', error);
        return null;
    }
}
