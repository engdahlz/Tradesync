
import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

// enableFirebaseTelemetry();

export const ai = genkit({
    plugins: [
        vertexAI({ 
            projectId: 'tradesync-ai-prod',
            location: 'europe-west1'
        }),
    ],
});

export { vertexAI };
