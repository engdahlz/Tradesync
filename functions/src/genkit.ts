
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { GOOGLE_AI_API_KEY } from './config.js';

// enableFirebaseTelemetry();

export const ai = genkit({
    plugins: [
        googleAI({ 
            apiKey: GOOGLE_AI_API_KEY
        }),
    ],
});

export { googleAI as vertexAI }; // Alias for compatibility
