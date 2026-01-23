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
} from '@google/adk';
import { Firestore, Timestamp } from 'firebase-admin/firestore';

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

    async updateSession(request: { appName: string; userId: string; sessionId: string; state: any }): Promise<void> {
        await this.db.collection('sessions').doc(request.sessionId).update({
            state: request.state,
            lastUpdateTime: Timestamp.now(),
        });
    }
}
