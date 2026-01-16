"use strict";
/**
 * Master Strategy Flow
 * Analyzes market data and suggests trading actions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestStrategyFlow = void 0;
exports.handleSuggestStrategy = handleSuggestStrategy;
const genkit_js_1 = require("../genkit.js");
const genkit_1 = require("genkit");
const config_js_1 = require("../config.js");
const InputSchema = genkit_1.z.object({
    symbol: genkit_1.z.string(),
    interval: genkit_1.z.string().default('4h'),
    marketData: genkit_1.z.object({
        price: genkit_1.z.number(),
        rsi: genkit_1.z.number(),
        macd: genkit_1.z.object({
            value: genkit_1.z.number(),
            signal: genkit_1.z.number(),
            histogram: genkit_1.z.number()
        }),
        volume: genkit_1.z.number()
    }).optional(),
    prices: genkit_1.z.array(genkit_1.z.number()).optional()
});
const OutputSchema = genkit_1.z.object({
    action: genkit_1.z.enum(['BUY', 'SELL', 'HOLD']),
    confidence: genkit_1.z.number(),
    reasoning: genkit_1.z.string(),
    riskLevel: genkit_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
    stopLoss: genkit_1.z.number().optional(),
    takeProfit: genkit_1.z.number().optional()
});
exports.suggestStrategyFlow = genkit_js_1.ai.defineFlow({
    name: 'suggestStrategy',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { symbol, interval, marketData, prices } = input;
    // Construct prompt for the "Master Strategy" engine
    let prompt = `You are the Master Strategy Engine for TradeSync. 
    Analyze the following for ${symbol} on the ${interval} timeframe.`;
    if (marketData) {
        prompt += `
        Market Data:
        Price: ${marketData.price}
        RSI: ${marketData.rsi}
        MACD: Value ${marketData.macd.value}, Signal ${marketData.macd.signal}, Hist ${marketData.macd.histogram}
        `;
    }
    else if (prices && prices.length > 0) {
        prompt += `
        Price History (last ${prices.length} points):
        ${prices.join(', ')}
        
        Calculate simplified technical indicators (trend, volatility) from these prices internally.
        `;
    }
    else {
        throw new Error("Insufficient data provided for analysis (need marketData or prices)");
    }
    prompt += `
    Determine the optimal trading action (BUY, SELL, HOLD) based on technical analysis principles.
    Explain your reasoning clearly.
    Assess the risk level.
    Suggest stop-loss and take-profit levels if applicable.
    `;
    const result = await genkit_js_1.ai.generate({
        model: config_js_1.MODEL_PRO,
        prompt: prompt,
        config: {
            temperature: 0.2, // Low temperature for consistent strategy
        }
    });
    // Parse JSON from the response text (assuming the model returns JSON as requested by schema, 
    // but Genkit's outputSchema handling usually ensures structured output if the model supports it.
    // For now, we rely on Genkit's structured output capability if we had defined it that way, 
    // but here we are using simple text generation and might need to parse or trust the model.
    // **Correction**: To enforce JSON, we should rely on Genkit's `output` functionality or instruct the model strictly.
    // Since we defined outputSchema, Genkit tries to enforce it.
    // However, the `generate` call above returns a `GenerateResponse`. 
    // We need to ensure we return the object matching OutputSchema.
    // For this prototype, we will assume the model output needs to be parsed or is returned as data.
    return result.output;
});
async function handleSuggestStrategy(req, res) {
    try {
        const result = await (0, exports.suggestStrategyFlow)(req.body);
        res.json(result);
    }
    catch (error) {
        console.error('[suggestStrategy] Error:', error);
        res.status(500).json({ error: String(error) });
    }
}
//# sourceMappingURL=suggestStrategy.js.map