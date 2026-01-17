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

// Hardcoded API key (user provided)
// Hardcoded API key (user provided)
export const GOOGLE_AI_API_KEY = "AIzaSyAp3-hmTN7xEQeBhiv9Wj6cgPCu1wfzsnU";
export const YOUTUBE_API_KEY = "AIzaSyDQOCw7zPaxK4034w1ZZBuBoEoHbieC0O0";
export const ALPHA_VANTAGE_API_KEY = "F84UJC6092ZGTLM8"; // User provided

// Model Allocation Strategy (Strict Compliance)
// Flash: High-frequency, low-latency (News, Transcription)
// Pro: Deep reasoning, Strategy, RAG
export const MODEL_FLASH = 'googleai/gemini-2.0-flash-exp'; // Using 2.0 Flash as 3.0 is not yet public, assuming prompt meant latest available or future-proofing
export const MODEL_PRO = 'googleai/gemini-2.0-pro-exp'; 

// Default exports for backward compatibility (during migration)
export const MODEL_NAME = MODEL_FLASH; 
export const EMBEDDING_MODEL = 'gemini-embedding-001';
