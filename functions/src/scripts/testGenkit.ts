
import { ai } from '../genkit';
import { MODEL_NAME } from '../config';

async function main() {
    console.log(`Testing model: ${MODEL_NAME}`);
    try {
        const result = await ai.generate({
            model: MODEL_NAME,
            prompt: 'Hello, are you working?',
            config: {
                temperature: 0.7
            }
        });
        console.log('Success:', result.text);
    } catch (e: unknown) {
        const error = e as Error;
        console.error('Error generating:', error.message);
        console.error('Full Error:', error);
    }
}

main();
