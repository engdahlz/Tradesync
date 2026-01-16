"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMarketNews = fetchMarketNews;
exports.handleGetMarketNews = handleGetMarketNews;
const zod_1 = require("zod");
const config_js_1 = require("../config.js");
const AlphaVantageNewsItemSchema = zod_1.z.object({
    title: zod_1.z.string(),
    url: zod_1.z.string(),
    summary: zod_1.z.string().optional(),
    source: zod_1.z.string(),
    time_published: zod_1.z.string(),
    overall_sentiment_label: zod_1.z.string(),
    overall_sentiment_score: zod_1.z.number().or(zod_1.z.string().transform(val => parseFloat(val))),
    banner_image: zod_1.z.string().optional().nullable(),
    topics: zod_1.z.array(zod_1.z.any()).optional()
});
const AlphaVantageResponseSchema = zod_1.z.object({
    feed: zod_1.z.array(AlphaVantageNewsItemSchema).optional(),
    Information: zod_1.z.string().optional(),
    Note: zod_1.z.string().optional(),
    "Error Message": zod_1.z.string().optional()
});
async function fetchMarketNews(tickers, limit = 50, sort = 'LATEST') {
    // Default to major crypto if no tickers provided for "general" news
    if (!tickers || tickers.trim() === '') {
        tickers = 'CRYPTO:BTC,CRYPTO:ETH';
    }
    console.log(`Fetching market news for: ${tickers}`);
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${tickers}&limit=${limit}&sort=${sort}&apikey=${config_js_1.ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    const rawData = await response.json();
    const validation = AlphaVantageResponseSchema.safeParse(rawData);
    if (!validation.success) {
        console.error('Alpha Vantage Schema Validation Error:', validation.error);
        return [];
    }
    const data = validation.data;
    if (data.Information) {
        console.warn('Alpha Vantage API Information:', data.Information);
        return [];
    }
    if (data.Note) {
        console.warn('Alpha Vantage API Note:', data.Note);
        throw new Error(`API Limit: ${data.Note}`);
    }
    if (data["Error Message"]) {
        console.warn('Alpha Vantage API Error:', data["Error Message"]);
        return [];
    }
    let newsItems = [];
    if (data.feed && Array.isArray(data.feed)) {
        newsItems = data.feed.map((item) => ({
            title: item.title,
            url: item.url,
            summary: item.summary || '',
            source: item.source,
            publishedAt: item.time_published,
            sentiment: item.overall_sentiment_label,
            sentimentScore: item.overall_sentiment_score,
            imageUrl: item.banner_image,
            topics: item.topics
        }));
    }
    else {
        console.warn('Unexpected API response structure:', JSON.stringify(data));
    }
    return newsItems;
}
const GetMarketNewsInputSchema = zod_1.z.object({
    tickers: zod_1.z.string().optional(),
    limit: zod_1.z.number().optional(),
    sort: zod_1.z.string().optional(),
});
async function handleGetMarketNews(req, res) {
    try {
        const inputResult = GetMarketNewsInputSchema.safeParse(req.body);
        if (!inputResult.success) {
            console.error('getMarketNews input validation error:', inputResult.error);
            res.status(400).json({ news: [], error: 'Invalid input parameters' });
            return;
        }
        const { tickers, limit, sort } = inputResult.data;
        const news = await fetchMarketNews(tickers || '', limit, sort);
        res.json({ news });
    }
    catch (error) {
        console.error('getMarketNews error:', error);
        // Fail gracefully with empty list instead of 500
        res.json({ news: [], error: String(error) });
    }
}
//# sourceMappingURL=getMarketNews.js.map