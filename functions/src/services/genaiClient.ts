import {
    GoogleGenAI,
    HarmBlockThreshold,
    HarmCategory,
    type SafetySetting,
    type ThinkingConfig,
    ThinkingLevel,
} from '@google/genai';

let client: GoogleGenAI | null = null;
let cachedSafetySettings: SafetySetting[] | null = null;
let warnedThinkingConflict = false;

function parseNumber(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseThinkingLevel(value: string | undefined): ThinkingLevel | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    switch (normalized) {
        case 'LOW':
            return ThinkingLevel.LOW;
        case 'MEDIUM':
            return ThinkingLevel.MEDIUM;
        case 'HIGH':
            return ThinkingLevel.HIGH;
        case 'MINIMAL':
            return ThinkingLevel.MINIMAL;
        default:
            return undefined;
    }
}

function parseThreshold(value: string | undefined): HarmBlockThreshold | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    switch (normalized) {
        case 'BLOCK_LOW_AND_ABOVE':
            return HarmBlockThreshold.BLOCK_LOW_AND_ABOVE;
        case 'BLOCK_MEDIUM_AND_ABOVE':
            return HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
        case 'BLOCK_ONLY_HIGH':
            return HarmBlockThreshold.BLOCK_ONLY_HIGH;
        case 'BLOCK_NONE':
            return HarmBlockThreshold.BLOCK_NONE;
        case 'OFF':
            return HarmBlockThreshold.OFF;
        default:
            return undefined;
    }
}

function modelSupportsThinking(modelName: string): boolean {
    const lower = modelName.toLowerCase();
    return lower.includes('pro') || lower.includes('thinking');
}

export function getGenAiClient(): GoogleGenAI {
    if (!client) {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        const useVertex =
            process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' ||
            (!apiKey && !!process.env.GOOGLE_CLOUD_PROJECT);

        if (useVertex) {
            const project = process.env.GOOGLE_CLOUD_PROJECT;
            const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
            if (!project) {
                throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required for Vertex AI');
            }
            client = new GoogleGenAI({ vertexai: true, project, location });
        } else {
            if (!apiKey) {
                throw new Error('GOOGLE_AI_API_KEY environment variable is required');
            }
            client = new GoogleGenAI({ apiKey, vertexai: false });
        }
    }
    return client;
}

export function getSafetySettings(): SafetySetting[] {
    if (cachedSafetySettings) return cachedSafetySettings;

    const dangerous = parseThreshold(process.env.GENAI_SAFETY_DANGEROUS) ?? HarmBlockThreshold.BLOCK_LOW_AND_ABOVE;
    const harassment = parseThreshold(process.env.GENAI_SAFETY_HARASSMENT) ?? HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
    const hateSpeech = parseThreshold(process.env.GENAI_SAFETY_HATE_SPEECH) ?? HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
    const sexual = parseThreshold(process.env.GENAI_SAFETY_SEXUAL) ?? HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;

    cachedSafetySettings = [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: dangerous },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: harassment },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: hateSpeech },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: sexual },
    ];

    return cachedSafetySettings;
}

export function getThinkingConfig(modelName: string): ThinkingConfig | undefined {
    const thinkingLevel = parseThinkingLevel(process.env.GENAI_THINKING_LEVEL);
    const thinkingBudget = parseNumber(process.env.GENAI_THINKING_BUDGET);
    const includeThoughts = process.env.GENAI_INCLUDE_THOUGHTS === 'true';

    if (!thinkingLevel && thinkingBudget === undefined && !includeThoughts) {
        return undefined;
    }

    if (thinkingLevel && thinkingBudget !== undefined && !warnedThinkingConflict) {
        warnedThinkingConflict = true;
        console.warn('[GenAI] Both GENAI_THINKING_LEVEL and GENAI_THINKING_BUDGET are set; using thinking level.');
    }

    if (!modelSupportsThinking(modelName) && process.env.GENAI_FORCE_THINKING !== 'true') {
        return undefined;
    }

    if (thinkingLevel) {
        return { thinkingLevel, includeThoughts };
    }

    if (thinkingBudget !== undefined) {
        return { thinkingBudget, includeThoughts };
    }

    return includeThoughts ? { includeThoughts } : undefined;
}

export function getTemperatureForModel(modelName: string, fallback: number): number {
    const lower = modelName.toLowerCase();
    const envKey = lower.includes('flash')
        ? 'GENAI_TEMPERATURE_FLASH'
        : lower.includes('pro')
            ? 'GENAI_TEMPERATURE_PRO'
            : 'GENAI_TEMPERATURE';
    return parseNumber(process.env[envKey]) ?? fallback;
}
