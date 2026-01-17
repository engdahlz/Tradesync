"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDocumentFlow = void 0;
exports.handleAnalyzeDocument = handleAnalyzeDocument;
const genkit_js_1 = require("../genkit.js");
const genkit_1 = require("genkit");
const config_js_1 = require("../config.js");
const InputSchema = genkit_1.z.object({
    url: genkit_1.z.string().describe('URL to analyze (PDF, webpage, SEC filing, etc.)'),
    analysisType: genkit_1.z.enum(['summary', 'financial', 'risk', 'comparison']).default('summary'),
    additionalContext: genkit_1.z.string().optional()
});
const OutputSchema = genkit_1.z.object({
    title: genkit_1.z.string(),
    documentType: genkit_1.z.string(),
    summary: genkit_1.z.string(),
    keyFindings: genkit_1.z.array(genkit_1.z.string()),
    financialMetrics: genkit_1.z.object({
        revenue: genkit_1.z.string().optional(),
        profit: genkit_1.z.string().optional(),
        growth: genkit_1.z.string().optional(),
        risks: genkit_1.z.array(genkit_1.z.string()).optional()
    }).optional(),
    sentiment: genkit_1.z.enum(['bullish', 'bearish', 'neutral']).optional(),
    tradingImplications: genkit_1.z.string().optional(),
    sourceUrl: genkit_1.z.string()
});
exports.analyzeDocumentFlow = genkit_js_1.ai.defineFlow({
    name: 'analyzeDocument',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { url, analysisType, additionalContext } = input;
    let analysisPrompt = '';
    switch (analysisType) {
        case 'financial':
            analysisPrompt = `Extract key financial metrics: revenue, profit margins, growth rates, 
            debt levels, and any red flags. Assess trading implications.`;
            break;
        case 'risk':
            analysisPrompt = `Identify all risk factors mentioned. Categorize by severity 
            (HIGH/MEDIUM/LOW). Assess impact on investment thesis.`;
            break;
        case 'comparison':
            analysisPrompt = `Compare this document's data to typical market benchmarks. 
            Identify outperformance or underperformance areas.`;
            break;
        default:
            analysisPrompt = `Provide a comprehensive summary with key takeaways for investors.`;
    }
    const prompt = `Analyze this document for trading and investment insights:
    
URL: ${url}

ANALYSIS TYPE: ${analysisType}
${analysisPrompt}

${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}

Extract:
1. Document title and type (10-K, earnings report, news article, etc.)
2. Executive summary (2-3 sentences)
3. Key findings (bullet points)
4. Financial metrics if applicable
5. Overall sentiment (bullish/bearish/neutral)
6. Trading implications

Be specific and cite exact figures when available.`;
    const result = await genkit_js_1.ai.generate({
        model: config_js_1.MODEL_FLASH,
        prompt: prompt,
        output: { schema: OutputSchema },
        config: {
            temperature: 0.3,
            thinkingConfig: {
                thinkingBudget: config_js_1.THINKING_BUDGET_MEDIUM,
            },
            tools: [
                { urlContext: {} },
                { googleSearch: {} }
            ]
        }
    });
    if (!result.output) {
        throw new Error('Document analysis failed - no structured output');
    }
    return {
        ...result.output,
        sourceUrl: url
    };
});
async function handleAnalyzeDocument(req, res) {
    try {
        const result = await (0, exports.analyzeDocumentFlow)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('[analyzeDocument] Error:', error);
        res.status(500).json({
            error: String(error),
            message: 'Failed to analyze document'
        });
    }
}
//# sourceMappingURL=analyzeDocument.js.map