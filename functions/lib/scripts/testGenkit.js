"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genkit_1 = require("../genkit");
const config_1 = require("../config");
async function main() {
    console.log(`Testing model: ${config_1.MODEL_NAME}`);
    try {
        const result = await genkit_1.ai.generate({
            model: config_1.MODEL_NAME,
            prompt: 'Hello, are you working?',
            config: {
                temperature: 0.7
            }
        });
        console.log('Success:', result.text);
    }
    catch (e) {
        console.error('Error generating:', e.message);
        console.error('Full Error:', e);
    }
}
main();
//# sourceMappingURL=testGenkit.js.map