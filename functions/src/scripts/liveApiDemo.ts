import { writeFileSync } from 'fs';
import { Modality } from '@google/genai';
import { getGenAiClient } from '../services/genaiClient.js';

function resolveModel(): string {
    const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true'
        || (!process.env.GOOGLE_AI_API_KEY && !!process.env.GOOGLE_CLOUD_PROJECT);
    if (process.env.LIVE_MODEL) return process.env.LIVE_MODEL;
    return useVertex
        ? 'gemini-2.0-flash-live-preview-04-09'
        : 'gemini-live-2.5-flash-preview';
}

async function main() {
    const prompt = process.argv.slice(2).join(' ').trim() || 'Give a short greeting and ask a follow-up question.';
    const outputPath = process.env.LIVE_AUDIO_OUTPUT || 'live_output.pcm';
    const ai = getGenAiClient();
    const model = resolveModel();

    const audioChunks: Buffer[] = [];
    let resolved = false;

    const session = await ai.live.connect({
        model,
        config: {
            responseModalities: [Modality.AUDIO, Modality.TEXT],
        },
        callbacks: {
            onopen: () => {
                console.log(`[LiveAPI] Connected (${model})`);
            },
            onmessage: (message) => {
                if (message.text) {
                    process.stdout.write(message.text);
                }
                if (message.data) {
                    audioChunks.push(Buffer.from(message.data, 'base64'));
                }
                if (message.serverContent?.turnComplete && !resolved) {
                    resolved = true;
                    if (audioChunks.length > 0) {
                        writeFileSync(outputPath, Buffer.concat(audioChunks));
                        console.log(`\n[LiveAPI] Audio saved to ${outputPath} (PCM, 24kHz).`);
                    }
                    session.close();
                }
            },
            onerror: (event) => {
                console.error('[LiveAPI] Socket error:', event);
            },
            onclose: () => {
                if (!resolved) {
                    console.log('[LiveAPI] Connection closed.');
                }
            },
        },
    });

    session.sendClientContent({
        turns: [{
            role: 'user',
            parts: [{ text: prompt }],
        }],
        turnComplete: true,
    });
}

main().catch((error) => {
    console.error('[LiveAPI] Failed:', error);
    process.exitCode = 1;
});
