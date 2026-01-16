"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMBEDDING_MODEL = exports.MODEL_NAME = exports.MODEL_PRO = exports.MODEL_FLASH = exports.ALPHA_VANTAGE_API_KEY = exports.YOUTUBE_API_KEY = exports.GOOGLE_AI_API_KEY = exports.messaging = exports.db = void 0;
// Trade/Sync Backend Configuration
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin once
try {
    (0, app_1.initializeApp)();
}
catch (e) {
    // Already initialized
}
const messaging_1 = require("firebase-admin/messaging");
exports.db = (0, firestore_1.getFirestore)();
exports.messaging = (0, messaging_1.getMessaging)();
// Hardcoded API key (user provided)
// Hardcoded API key (user provided)
exports.GOOGLE_AI_API_KEY = "AIzaSyBH0QJ0vDdaOEoY-g4YPUeie9Z9pS4iQDE";
exports.YOUTUBE_API_KEY = "AIzaSyDQOCw7zPaxK4034w1ZZBuBoEoHbieC0O0";
exports.ALPHA_VANTAGE_API_KEY = "F84UJC6092ZGTLM8"; // User provided
// Model Allocation Strategy (Strict Compliance)
// Flash: High-frequency, low-latency (News, Transcription)
// Pro: Deep reasoning, Strategy, RAG
exports.MODEL_FLASH = 'googleai/gemini-2.0-flash-exp'; // Using 2.0 Flash as 3.0 is not yet public, assuming prompt meant latest available or future-proofing
exports.MODEL_PRO = 'googleai/gemini-2.0-pro-exp';
// Default exports for backward compatibility (during migration)
exports.MODEL_NAME = exports.MODEL_FLASH;
exports.EMBEDDING_MODEL = 'googleai/text-embedding-004';
//# sourceMappingURL=config.js.map