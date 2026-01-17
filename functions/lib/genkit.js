"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vertexAI = exports.ai = void 0;
const genkit_1 = require("genkit");
const vertexai_1 = require("@genkit-ai/vertexai");
Object.defineProperty(exports, "vertexAI", { enumerable: true, get: function () { return vertexai_1.vertexAI; } });
// enableFirebaseTelemetry();
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, vertexai_1.vertexAI)({
            projectId: 'tradesync-ai-prod',
            location: 'europe-west1'
        }),
    ],
});
//# sourceMappingURL=genkit.js.map