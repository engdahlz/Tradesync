"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THINKING_BUDGET_MAX = exports.THINKING_BUDGET_HIGH = exports.THINKING_BUDGET_MEDIUM = exports.THINKING_BUDGET_LOW = exports.EMBEDDING_MODEL = exports.MODEL_NAME = exports.MODEL_PRO = exports.MODEL_FLASH = exports.ALPHA_VANTAGE_API_KEY = exports.YOUTUBE_API_KEY = exports.GOOGLE_AI_API_KEY = exports.messaging = exports.db = void 0;
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
exports.GOOGLE_AI_API_KEY = "AIzaSyAp3-hmTN7xEQeBhiv9Wj6cgPCu1wfzsnU";
exports.YOUTUBE_API_KEY = "AIzaSyDQOCw7zPaxK4034w1ZZBuBoEoHbieC0O0";
exports.ALPHA_VANTAGE_API_KEY = "F84UJC6092ZGTLM8"; // User provided
// Model Allocation Strategy (Strict Compliance) - Updated Jan 2026
// Gemini 3 Series: Latest models with thinking, grounding, code execution
// Flash: High-frequency, low-latency (News, Transcription, Scanning)
// Pro: Deep reasoning, Strategy, RAG, Complex Analysis
exports.MODEL_FLASH = 'googleai/gemini-3-flash-preview';
exports.MODEL_PRO = 'googleai/gemini-3-pro-preview';
// Legacy aliases for backward compatibility
exports.MODEL_NAME = exports.MODEL_FLASH;
exports.EMBEDDING_MODEL = 'gemini-embedding-001';
// Thinking Budget Configuration (0-32768 tokens)
// Higher = more reasoning depth, higher cost
exports.THINKING_BUDGET_LOW = 1024; // Quick decisions
exports.THINKING_BUDGET_MEDIUM = 4096; // Standard analysis
exports.THINKING_BUDGET_HIGH = 8192; // Complex strategy
exports.THINKING_BUDGET_MAX = 16384; // Deep reasoning
//# sourceMappingURL=config.js.map