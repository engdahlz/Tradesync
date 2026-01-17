"use strict";
/**
 * YouTube Video Analysis Flow
 * Extracts sentiment and price levels from video transcripts via Genkit
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeVideoFlow = void 0;
exports.handleAnalyzeVideo = handleAnalyzeVideo;
const config_js_1 = require("../config.js");
const genkit_js_1 = require("../genkit.js");
const genkit_1 = require("genkit");
const youtube_transcript_1 = require("youtube-transcript");
const YoutubeTranscriptSchema = genkit_1.z.array(genkit_1.z.object({
    text: genkit_1.z.string(),
    duration: genkit_1.z.number(),
    offset: genkit_1.z.number(),
}));
function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}
const InputSchema = genkit_1.z.object({
    videoUrl: genkit_1.z.string(),
    title: genkit_1.z.string().optional(),
    description: genkit_1.z.string().optional(),
});
const OutputSchema = genkit_1.z.object({
    transcript: genkit_1.z.string(),
    sentiment: genkit_1.z.enum(['bullish', 'bearish', 'neutral']),
    confidence: genkit_1.z.number(),
    tickers: genkit_1.z.array(genkit_1.z.string()),
    priceLevels: genkit_1.z.object({
        targets: genkit_1.z.array(genkit_1.z.number()),
        supports: genkit_1.z.array(genkit_1.z.number()),
        resistances: genkit_1.z.array(genkit_1.z.number()),
    }),
    summary: genkit_1.z.string(),
    keyPoints: genkit_1.z.array(genkit_1.z.string()),
});
// Internal AI output schema (matches what we ask prompt to generate)
const AIOutputSchema = genkit_1.z.object({
    sentiment: genkit_1.z.enum(['bullish', 'bearish', 'neutral']),
    confidence: genkit_1.z.number(),
    tickers: genkit_1.z.array(genkit_1.z.string()),
    targets: genkit_1.z.array(genkit_1.z.number()),
    supports: genkit_1.z.array(genkit_1.z.number()),
    resistances: genkit_1.z.array(genkit_1.z.number()),
    summary: genkit_1.z.string(),
    keyPoints: genkit_1.z.array(genkit_1.z.string()),
});
exports.analyzeVideoFlow = genkit_js_1.ai.defineFlow({
    name: 'analyzeVideo',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
}, async (input) => {
    const { videoUrl, title, description } = input;
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
        throw new Error('Invalid YouTube URL');
    }
    let transcript = '';
    let transcriptSource = 'transcript';
    try {
        const rawData = await youtube_transcript_1.YoutubeTranscript.fetchTranscript(videoId);
        const data = YoutubeTranscriptSchema.parse(rawData);
        transcript = data.map(item => item.text).join(' ').slice(0, 10000);
    }
    catch (e) {
        // Fallback to metadata if transcript fails
        if (title || description) {
            console.warn(`Transcript failed for ${videoId}, using metadata fallback.`);
            transcript = `Title: ${title || ''}\nDescription: ${description || ''}`;
            transcriptSource = 'metadata';
        }
        else {
            throw new Error('Transcript unavailable and no metadata provided');
        }
    }
    const prompt = `Analyze this financial video content (Source: ${transcriptSource}) for trading insights:
    
CONTENT: ${transcript}

Return JSON with: 
- sentiment (bullish/bearish/neutral)
- confidence (0-1)
- tickers (array)
- targets (price array)
- supports (array)
- resistances (array)
- summary (2 sentences)
- keyPoints (3-5 items)`;
    try {
        const result = await genkit_js_1.ai.generate({
            model: genkit_js_1.vertexAI.model(config_js_1.MODEL_FLASH),
            prompt: prompt,
            output: { schema: AIOutputSchema },
            config: {
                temperature: 0.3,
                thinkingConfig: {
                    thinkingBudget: config_js_1.THINKING_BUDGET_MEDIUM,
                }
            }
        });
        const data = result.output;
        if (!data)
            throw new Error('AI generation failed');
        return {
            transcript: transcriptSource === 'metadata' ? '(Transcript Unavailable - Analyzed Summary)' : transcript.slice(0, 500) + '...',
            sentiment: data.sentiment,
            confidence: data.confidence,
            tickers: data.tickers,
            priceLevels: {
                targets: data.targets,
                supports: data.supports,
                resistances: data.resistances,
            },
            summary: data.summary,
            keyPoints: data.keyPoints,
        };
    }
    catch (e) {
        // Fallback for AI error
        return {
            transcript: transcript.slice(0, 500) + '...',
            sentiment: 'neutral',
            confidence: 0,
            tickers: [],
            priceLevels: { targets: [], supports: [], resistances: [] },
            summary: 'Analysis failed',
            keyPoints: [],
        };
    }
});
async function handleAnalyzeVideo(req, res) {
    try {
        const result = await (0, exports.analyzeVideoFlow)(req.body);
        res.json(result);
    }
    catch (e) {
        console.error('Video analysis error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Unable to analyze video';
        // Return structured error response even on failure, if possible, or 400
        res.json({
            transcript: 'Unavailable',
            sentiment: 'neutral',
            confidence: 0,
            tickers: [],
            priceLevels: { targets: [], supports: [], resistances: [] },
            summary: errorMessage,
            keyPoints: [],
        });
    }
}
//# sourceMappingURL=analyzeVideo.js.map