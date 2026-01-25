import type { Event } from '@google/adk';
import { MODEL_FLASH } from '../config.js';
import { getGenAiClient, getSafetySettings, getTemperatureForModel } from './genaiClient.js';

function extractEventText(event: Event): string {
    const parts = event.content?.parts || [];
    const text = parts
        .map(part => ('text' in part ? part.text : ''))
        .filter(Boolean)
        .join(' ')
        .trim();
    if (!text) return '';
    const author = event.author || 'agent';
    return `${author.toUpperCase()}: ${text}`;
}

export async function summarizeConversation(options: {
    events: Event[];
    existingSummary?: string;
}): Promise<string> {
    const lines = options.events
        .map(extractEventText)
        .filter(Boolean);

    if (lines.length === 0) return options.existingSummary || '';

    const prompt = [
        'Summarize the conversation for future context.',
        'Focus on: user goals, risk tolerance, time horizon, assets discussed, decisions, constraints, and unresolved questions.',
        'Be concise and factual. Use short bullet points.',
        options.existingSummary ? `Existing summary:\n${options.existingSummary}` : null,
        'Conversation:',
        lines.join('\n'),
    ].filter(Boolean).join('\n\n');

    const ai = getGenAiClient();
    const response = await ai.models.generateContent({
        model: MODEL_FLASH,
        contents: prompt,
        config: {
            safetySettings: getSafetySettings(),
            temperature: getTemperatureForModel(MODEL_FLASH, 0.2),
        },
    });

    const responseText = (response as unknown as { text?: string | (() => string) }).text;
    const text = typeof responseText === 'function' ? responseText() : responseText || '';
    return text.trim();
}
