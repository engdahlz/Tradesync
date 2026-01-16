"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const genkit_1 = require("genkit");
const google_genai_1 = require("@genkit-ai/google-genai");
const config_1 = require("./config");
// enableFirebaseTelemetry();
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, google_genai_1.googleAI)({ apiKey: config_1.GOOGLE_AI_API_KEY }),
    ],
});
//# sourceMappingURL=genkit.js.map