
import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

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
