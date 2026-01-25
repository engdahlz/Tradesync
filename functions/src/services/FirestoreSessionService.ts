import {
    BaseSessionService,
    CreateSessionRequest,
    GetSessionRequest,
    ListSessionsRequest,
    ListSessionsResponse,
    DeleteSessionRequest,
    AppendEventRequest,
    type Session,
    type Event,
    isFinalResponse,
} from '@google/adk';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { summarizeConversation } from './summaryService.js';
import { SUMMARY_EVENT_COUNT_KEY, SUMMARY_STATE_KEY } from '../adk/agents/advisorWorkflowState.js';

const SUMMARY_SKIP_AUTHORS = new Set([
    'signals_research_agent',
    'technical_research_agent',
    'news_research_agent',
    'rag_research_agent',
    'memory_research_agent',
    'search_research_agent',
    'vertex_search_agent',
    'vertex_rag_agent',
]);

export class FirestoreSessionService extends BaseSessionService {
    constructor(private db: Firestore) {
        super();
    }

    async createSession({ appName, userId, state, sessionId }: CreateSessionRequest): Promise<Session> {
        const id = sessionId || `session_${userId}_${Date.now()}`;
        const session: Session = {
            id,
            appName,
            userId,
            state: state || {},
            events: [],
            lastUpdateTime: Date.now(),
        };

        await this.db.collection('sessions').doc(id).set({
            ...session,
            lastUpdateTime: Timestamp.fromMillis(session.lastUpdateTime),
        });

        return session;
    }

    async getSession({ appName, userId, sessionId, config }: GetSessionRequest): Promise<Session | undefined> {
        const doc = await this.db.collection('sessions').doc(sessionId).get();
        if (!doc.exists) return undefined;

        const data = doc.data() as any;
        
        // Basic validation that it belongs to the user and app
        if (data.userId !== userId || data.appName !== appName) {
            return undefined;
        }

        const session: Session = {
            id: data.id,
            appName: data.appName,
            userId: data.userId,
            state: data.state || {},
            events: data.events || [],
            lastUpdateTime: data.lastUpdateTime?.toMillis() || Date.now(),
        };

        // Handle config (numRecentEvents, afterTimestamp)
        if (config) {
            if (config.afterTimestamp) {
                session.events = session.events.filter(e => e.timestamp > config.afterTimestamp!);
            }
            if (config.numRecentEvents) {
                session.events = session.events.slice(-config.numRecentEvents);
            }
        }

        return session;
    }

    async listSessions({ appName, userId }: ListSessionsRequest): Promise<ListSessionsResponse> {
        const snapshot = await this.db.collection('sessions')
            .where('appName', '==', appName)
            .where('userId', '==', userId)
            .orderBy('lastUpdateTime', 'desc')
            .get();

        const sessions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: data.id,
                appName: data.appName,
                userId: data.userId,
                state: {}, // listSessions usually doesn't need full state/events
                events: [],
                lastUpdateTime: data.lastUpdateTime?.toMillis() || Date.now(),
            } as Session;
        });

        return { sessions };
    }

    async deleteSession({ appName, userId, sessionId }: DeleteSessionRequest): Promise<void> {
        const doc = await this.db.collection('sessions').doc(sessionId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data?.userId === userId && data?.appName === appName) {
                await doc.ref.delete();
            }
        }
    }

    async appendEvent(request: AppendEventRequest): Promise<Event> {
        const { session } = request;
        const event = await super.appendEvent(request);
        
        session.lastUpdateTime = Date.now();

        await this.maybeSummarizeSession(session, event);

        const limitRaw = Number(process.env.SESSION_EVENT_LIMIT);
        const maxEvents = Number.isFinite(limitRaw) ? limitRaw : 50;
        if (maxEvents > 0 && session.events.length > maxEvents) {
            session.events = session.events.slice(-maxEvents);
        }
        
        // Clean events to remove undefined values (Firestore doesn't allow them)
        const cleanEvents = session.events.map(e => JSON.parse(JSON.stringify(e)));
        
        // Update Firestore
        await this.db.collection('sessions').doc(session.id).update({
            events: cleanEvents,
            lastUpdateTime: Timestamp.fromMillis(session.lastUpdateTime),
            state: session.state || {},
        });

        return event;
    }

    private async maybeSummarizeSession(session: Session, event: Event): Promise<void> {
        if (!event.author || event.author === 'user') {
            return;
        }
        if (SUMMARY_SKIP_AUTHORS.has(event.author)) {
            return;
        }
        if (!isFinalResponse(event)) {
            return;
        }

        const triggerRaw = Number(process.env.SESSION_SUMMARY_TRIGGER);
        const keepRaw = Number(process.env.SESSION_SUMMARY_KEEP);
        const cooldownRaw = Number(process.env.SESSION_SUMMARY_COOLDOWN);

        const trigger = Number.isFinite(triggerRaw) ? triggerRaw : 40;
        const keep = Number.isFinite(keepRaw) ? keepRaw : 12;
        const cooldown = Number.isFinite(cooldownRaw) ? cooldownRaw : 20;

        if (trigger <= 0 || keep <= 0 || session.events.length <= trigger) {
            return;
        }

        const lastCountRaw = session.state?.[SUMMARY_EVENT_COUNT_KEY];
        const lastCount = typeof lastCountRaw === 'number' ? lastCountRaw : Number(lastCountRaw ?? 0);
        if (session.events.length < lastCount + cooldown) {
            return;
        }

        const summaryEvents = session.events.slice(0, Math.max(0, session.events.length - keep));
        const existingSummary = typeof session.state?.[SUMMARY_STATE_KEY] === 'string'
            ? session.state[SUMMARY_STATE_KEY]
            : '';

        const summary = await summarizeConversation({
            events: summaryEvents,
            existingSummary,
        });

        if (!summary) {
            return;
        }

        session.state = {
            ...session.state,
            [SUMMARY_STATE_KEY]: summary,
            [SUMMARY_EVENT_COUNT_KEY]: session.events.length,
        };
        session.events = session.events.slice(-keep);
    }

    async updateSession(request: { appName: string; userId: string; sessionId: string; state: any }): Promise<void> {
        await this.db.collection('sessions').doc(request.sessionId).update({
            state: request.state,
            lastUpdateTime: Timestamp.now(),
        });
    }
}
