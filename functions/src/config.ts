// Trade/Sync Backend Configuration
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin once
try {
    initializeApp();
} catch (e) {
    // Already initialized
}

import { getMessaging } from 'firebase-admin/messaging';

export const db = getFirestore();
export const messaging = getMessaging();

// API Keys from environment variables
export const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
export const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

// Model Allocation Strategy (Strict Compliance) - Updated Jan 2026
// Vertex AI: Gemini 3 series - state-of-the-art reasoning for financial advice
// Flash: High-frequency, low-latency (News, Transcription, Scanning)
// Pro: Deep reasoning, Strategy, RAG, Complex Analysis
export const MODEL_FLASH = 'gemini-3-flash-preview';
export const MODEL_PRO = 'gemini-3-pro-preview';

// Legacy aliases for backward compatibility
export const MODEL_NAME = MODEL_FLASH;
export const EMBEDDING_MODEL = 'gemini-embedding-001';

// Thinking Budget Configuration (0-32768 tokens)
// Higher = more reasoning depth, higher cost
export const THINKING_BUDGET_LOW = 1024;      // Quick decisions
export const THINKING_BUDGET_MEDIUM = 4096;   // Standard analysis
export const THINKING_BUDGET_HIGH = 8192;     // Complex strategy
export const THINKING_BUDGET_MAX = 16384;     // Deep reasoning
