
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { GOOGLE_AI_API_KEY } from './config';

// enableFirebaseTelemetry();

export const ai = genkit({
    plugins: [
        googleAI({ apiKey: GOOGLE_AI_API_KEY }),
    ],
});
