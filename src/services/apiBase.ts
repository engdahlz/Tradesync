const PROJECT_ID = 'tradesync-ai-prod';
const REGION = 'us-central1';

const DEV_BASE = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}`;
const PROD_BASE = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

export const API_BASE = import.meta.env.VITE_FUNCTIONS_BASE_URL || (import.meta.env.DEV ? DEV_BASE : PROD_BASE);

export const ADK_BACKEND = (import.meta.env.VITE_ADK_BACKEND || 'ts').toLowerCase();
export const ADVISOR_CHAT_PATH = ADK_BACKEND === 'python' ? 'advisorChatPy' : 'advisorChat';
export const ADVISOR_CHAT_STREAM_PATH = ADK_BACKEND === 'python' ? 'advisorChatStreamPy' : 'advisorChatStream';

// Strategy Endpoints
export const CREATE_STRATEGY_PATH = 'createStrategy';
export const GET_STRATEGIES_PATH = 'getStrategies';
export const UPDATE_STRATEGY_PATH = 'updateStrategy';
export const DELETE_STRATEGY_PATH = 'deleteStrategy';
export const GET_STRATEGY_LOGS_PATH = 'getStrategyLogs';
