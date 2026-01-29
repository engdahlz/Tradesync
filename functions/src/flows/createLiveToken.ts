import type { Request, Response } from 'express';
import { GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai';
import { z } from 'zod';

const ModalitySchema = z.enum(['AUDIO', 'TEXT']);

const CreateLiveTokenSchema = z.object({
    model: z.string().optional(),
    systemInstruction: z.string().min(1).optional(),
    responseModalities: z.array(ModalitySchema).optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).max(1000).optional(),
    maxOutputTokens: z.number().min(1).max(8192).optional(),
    uses: z.number().int().min(1).max(10).optional(),
    expireMinutes: z.number().int().min(1).max(60).optional(),
    newSessionExpireMinutes: z.number().int().min(1).max(60).optional(),
});

function parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function futureIso(minutes: number): string {
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function resolveModalities(values?: Array<'AUDIO' | 'TEXT'>): Modality[] {
    if (!values || values.length === 0) {
        return [Modality.AUDIO, Modality.TEXT];
    }
    return values.map((value) => (value === 'AUDIO' ? Modality.AUDIO : Modality.TEXT));
}

export async function handleCreateLiveToken(req: Request, res: Response) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        res.status(400).json({
            error: 'Live API tokens require GOOGLE_AI_API_KEY (Gemini Developer API).',
        });
        return;
    }

    const parsed = CreateLiveTokenSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid Live API token request payload.',
            details: parsed.error.format(),
        });
        return;
    }

    const defaults = {
        model: process.env.LIVE_API_MODEL || 'gemini-live-2.5-flash-preview',
        uses: parseNumber(process.env.LIVE_API_TOKEN_USES, 2),
        expireMinutes: parseNumber(process.env.LIVE_API_TOKEN_EXPIRE_MINUTES, 30),
        newSessionExpireMinutes: parseNumber(process.env.LIVE_API_TOKEN_NEW_SESSION_EXPIRE_MINUTES, 2),
    };

    const input = parsed.data;
    const model = input.model || defaults.model;
    const expireMinutes = input.expireMinutes ?? defaults.expireMinutes;
    const newSessionExpireMinutes = input.newSessionExpireMinutes ?? defaults.newSessionExpireMinutes;
    const uses = input.uses ?? defaults.uses;
    const expireTime = futureIso(expireMinutes);
    const newSessionExpireTime = futureIso(newSessionExpireMinutes);

    const liveConfig: LiveConnectConfig = {
        responseModalities: resolveModalities(input.responseModalities),
        temperature: input.temperature,
        topP: input.topP,
        topK: input.topK,
        maxOutputTokens: input.maxOutputTokens,
        systemInstruction: input.systemInstruction
            ? {
                role: 'system',
                parts: [{ text: input.systemInstruction }],
            }
            : undefined,
    };

    const ai = new GoogleGenAI({
        apiKey,
        apiVersion: 'v1alpha',
        vertexai: false,
    });

    try {
        const token = await ai.authTokens.create({
            config: {
                uses,
                expireTime,
                newSessionExpireTime,
                liveConnectConstraints: {
                    model,
                    config: liveConfig,
                },
                lockAdditionalFields: [],
            },
        });

        res.json({
            token: token.name,
            apiVersion: 'v1alpha',
            model,
            expireTime,
            newSessionExpireTime,
            uses,
            config: {
                responseModalities: liveConfig.responseModalities,
                temperature: liveConfig.temperature,
                topP: liveConfig.topP,
                topK: liveConfig.topK,
                maxOutputTokens: liveConfig.maxOutputTokens,
            },
        });
    } catch (error) {
        console.error('[LiveAPI] Failed to create token:', error);
        res.status(500).json({ error: 'Failed to create Live API token.' });
    }
}
