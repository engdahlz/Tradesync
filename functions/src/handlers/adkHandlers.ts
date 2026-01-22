import type { Request, Response } from 'express';
import { runAgent, tradeSyncRunner, tradeSyncOrchestrator, sessionService } from '../adk/index.js';
import type { Event } from '@google/adk';

export async function handleAdvisorChat(req: Request, res: Response) {
    const { userId, message, sessionId } = req.body;

    if (!userId || !message) {
        res.status(400).json({ error: 'Missing userId or message' });
        return;
    }

    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
        sessionId,
    });

    const events = [];
    let fullResponse = '';

    for await (const event of runAgent(userId, session.id, message)) {
        if (event.content && event.content.parts?.[0]) {
            const part = event.content.parts[0];
            
            if ('text' in part && part.text) {
                events.push({ type: 'text', data: part.text });
                fullResponse += part.text;
            }
            
            if (part.functionCall) {
                events.push({ 
                    type: 'function_call', 
                    name: part.functionCall.name, 
                    args: part.functionCall.args 
                });
            }
        }
    }

    res.write(`event: sources\ndata: ${JSON.stringify(events)}\n\n`);
    res.write(`event: text\ndata: ${JSON.stringify(fullResponse)}\n\n`);
    res.write(`event: done\ndata: {}\n\n`);
}

export async function handleAdvisorChatStream(req: Request, res: Response) {
    const { userId, message, sessionId } = req.body;

    if (!userId || !message) {
        res.status(400).json({ error: 'Missing userId or message' });
        return;
    }

    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
        sessionId,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    let eventCount = 0;
    for await (const event of runAgent(userId, session.id, message)) {
        if (event.content && event.content.parts?.[0]) {
            const part = event.content.parts[0];
            
            if ('text' in part && part.text) {
                res.write(`event: text\ndata: ${JSON.stringify(part.text)}\n\n`);
                eventCount++;
            }
            
            if (part.functionCall) {
                res.write(`event: function_call\ndata: ${JSON.stringify({name: part.functionCall.name, args: part.functionCall.args})}\n\n`);
                eventCount++;
            }
        }
    }

    console.log(`[handleAdvisorChatStream] Sent ${eventCount} events`);

    res.write(`event: done\ndata: {}\n\n`);
}

export async function handleAnalyzeNews(req: Request, res: Response) {
    const { message } = req.body;

    if (!message) {
        res.status(400).json({ error: 'Missing message' });
        return;
    }

    const userId = 'anonymous';
    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
    });

    const events: { type: string; data: any }[] = [];
    for await (const event of runAgent(userId, session.id, message)) {
        if (event.content?.parts?.[0] && 'text' in event.content.parts[0]) {
            events.push({ type: 'text', data: event.content.parts[0].text });
        }
    }

    res.json({ analysis: events });
}

export async function handleAnalyzeVideo(req: Request, res: Response) {
    const { videoUrl, title, description } = req.body;

    if (!videoUrl) {
        res.status(400).json({ error: 'Missing videoUrl' });
        return;
    }

    const userId = 'anonymous';
    const message = `Analyze this video: ${videoUrl}${title ? `\nTitle: ${title}` : ''}${description ? `\nDescription: ${description}` : ''}`;
    
    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
    });

    let fullResponse = '';
    for await (const event of runAgent(userId, session.id, message)) {
        if (event.content?.parts?.[0]) {
            const part = event.content.parts[0];
            if ('text' in part && part.text) {
                fullResponse += part.text;
            }
        }
    }
    res.json({ result: fullResponse });
}

export async function handleAnalyzeDocument(req: Request, res: Response) {
    const { content } = req.body;

    if (!content) {
        res.status(400).json({ error: 'Missing content' });
        return;
    }

    const userId = 'anonymous';
    const message = `Analyze this document:\n${content}`;
    
    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
    });

    let fullResponse = '';
    for await (const event of runAgent(userId, session.id, message)) {
        if (event.content?.parts?.[0]) {
            const part = event.content.parts[0];
            if ('text' in part && part.text) {
                fullResponse += part.text;
            }
        }
    }
    res.json({ result: fullResponse });
}

export async function handleSuggestStrategy(req: Request, res: Response) {
    const { symbol } = req.body;

    if (!symbol) {
        res.status(400).json({ error: 'Missing symbol' });
        return;
    }

    const userId = 'anonymous';
    const message = `Suggest a trading strategy for ${symbol}`;
    
    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
    });

    let fullResponse = '';
    for await (const event of runAgent(userId, session.id, message)) {
        if (event.content?.parts?.[0]) {
            const part = event.content.parts[0];
            if ('text' in part && part.text) {
                fullResponse += part.text;
            }
        }
    }
    res.json({ result: fullResponse });
}

export async function handleExecuteTrade(req: Request, res: Response) {
    const { userId, symbol, side, quantity, orderType, price, idempotencyKey, isDryRun } = req.body;

    if (!userId || !symbol || !side || !quantity) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const message = `${side.toUpperCase()} ${quantity} ${symbol}${price ? ` at ${price}` : ' market order'}`;
    
    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
    });

    let fullResponse = '';
    for await (const event of runAgent(userId, session.id, message)) {
        if (event.content?.parts?.[0]) {
            const part = event.content.parts[0];
            if ('text' in part && part.text) {
                fullResponse += part.text;
            }
        }
    }
    res.json({ result: fullResponse });
}
