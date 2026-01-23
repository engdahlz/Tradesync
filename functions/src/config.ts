// Trade/Sync Backend Configuration
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { z } from 'zod';

// Initialize Firebase Admin once
try {
    initializeApp();
} catch {
    // Already initialized
}

import { getMessaging } from 'firebase-admin/messaging';

export const db = getFirestore();
export const messaging = getMessaging();
export { FieldValue };

// Schema for scheduled sells
export const ScheduledSellSchema = z.object({
    orderId: z.string(),
    status: z.enum(['pending', 'executed', 'cancelled']),
    executeAt: z.any(),
    executedAt: z.any().optional(),
    ticker: z.string().optional(),
    idempotencyKey: z.string().optional(),
});

// API Keys from environment variables
export const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
export const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

// Trade/Sync Backend Configuration
// Updated Jan 22, 2026 - Gemini 3.0 (us-central1)

// Flash: High-frequency agentic loops
export const MODEL_FLASH = 'gemini-3-flash-preview';

// Pro: Deep reasoning ("vibe-coding")
export const MODEL_PRO = 'gemini-3-pro-preview';


// Legacy aliases for backward compatibility
export const MODEL_NAME = MODEL_FLASH;
export const EMBEDDING_MODEL = 'text-embedding-004';

// Thinking Budget Configuration (0-32768 tokens)
// Higher = more reasoning depth, higher cost
export const THINKING_BUDGET_LOW = 1024;      // Quick decisions
export const THINKING_BUDGET_MEDIUM = 4096;   // Standard analysis
export const THINKING_BUDGET_HIGH = 8192;     // Complex strategy
export const THINKING_BUDGET_MAX = 16384;     // Deep reasoning

// Trading Safety Configuration
export const MAX_TRADE_AMOUNT_USD = 100; // Hard safety cap: $100 per trade
export const LIVE_TRADING_ENABLED = process.env.LIVE_TRADING_ENABLED === 'true';
