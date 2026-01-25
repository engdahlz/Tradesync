import {
    Runner,
    InMemoryArtifactService,
    InMemoryMemoryService,
    type Session,
} from '@google/adk';

import { TradeSyncPlugin } from './plugins/TradeSyncPlugin.js';
import { tradeSyncOrchestrator } from './agents/TradeSyncOrchestrator.js';
import { db } from '../config.js';
import { FirestoreSessionService } from '../services/FirestoreSessionService.js';

const sessionService = new FirestoreSessionService(db);
const artifactService = new InMemoryArtifactService();
const memoryService = new InMemoryMemoryService();

export const tradeSyncRunner = new Runner({
    agent: tradeSyncOrchestrator,
    appName: 'TradeSync',
    plugins: [new TradeSyncPlugin()],
    sessionService,
    artifactService,
    memoryService,
});

export async function getOrCreateSession(
    userId: string,
    sessionId?: string
): Promise<{ session: Session; isNew: boolean }> {
    const sid = sessionId || `session_${userId}_${Date.now()}`;
    
    const existing = await sessionService.getSession({
        appName: 'TradeSync',
        userId,
        sessionId: sid,
    });
    
    if (existing) return { session: existing, isNew: false };
    
    const session = await sessionService.createSession({
        appName: 'TradeSync',
        userId,
        sessionId: sid,
    });
    return { session, isNew: true };
}

export async function* runAgent(
    userId: string,
    sessionId: string,
    message: string
) {
    const userMessage = {
        role: 'user' as const,
        parts: [{ text: message }],
    };

    for await (const event of tradeSyncRunner.runAsync({
        userId,
        sessionId,
        newMessage: userMessage,
    })) {
        yield event;
    }
}

export { sessionService, artifactService, memoryService };
export { tradeSyncOrchestrator } from './agents/TradeSyncOrchestrator.js';
export { advisorAgent } from './agents/AdvisorAgent.js';
export { strategyAgent } from './agents/StrategyAgent.js';
export { newsAnalysisAgent } from './agents/NewsAnalysisAgent.js';
export { videoAnalysisAgent } from './agents/VideoAnalysisAgent.js';
export { documentAnalysisAgent } from './agents/DocumentAnalysisAgent.js';
