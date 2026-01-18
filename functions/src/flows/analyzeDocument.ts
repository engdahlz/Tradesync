import type { Request, Response } from 'express';
import { ai, vertexAI } from '../genkit.js';
import { z } from 'genkit';
import { MODEL_FLASH, THINKING_BUDGET_MEDIUM } from '../config.js';

const InputSchema = z.object({
    url: z.string().describe('URL to analyze (PDF, webpage, SEC filing, etc.)'),
    analysisType: z.enum(['summary', 'financial', 'risk', 'comparison']).default('summary'),
    additionalContext: z.string().optional()
});

const OutputSchema = z.object({
    title: z.string(),
    documentType: z.string(),
    summary: z.string(),
    keyFindings: z.array(z.string()),
    financialMetrics: z.object({
        revenue: z.string().optional(),
        profit: z.string().optional(),
        growth: z.string().optional(),
        risks: z.array(z.string()).optional()
    }).optional(),
    sentiment: z.enum(['bullish', 'bearish', 'neutral']).optional(),
    tradingImplications: z.string().optional(),
    sourceUrl: z.string()
});

export const analyzeDocumentFlow = ai.defineFlow({
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

    const result = await ai.generate({
        model: vertexAI.model(MODEL_FLASH),
        prompt: prompt,
        output: { schema: OutputSchema },
        config: {
            temperature: 0.3,
            thinkingConfig: {
                thinkingBudget: THINKING_BUDGET_MEDIUM,
            },
            googleSearchRetrieval: {
                disableAttribution: false,
            }
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

export async function handleAnalyzeDocument(req: Request, res: Response) {
    try {
        const result = await analyzeDocumentFlow(req.body);
        res.json(result);
    } catch (error: unknown) {
        console.error('[analyzeDocument] Error:', error);
        res.status(500).json({ 
            error: String(error),
            message: 'Failed to analyze document'
        });
    }
}
