import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type {
    BaseMemoryService,
    SearchMemoryRequest,
    SearchMemoryResponse,
    Session,
} from '@google/adk';
import { Timestamp } from 'firebase-admin/firestore';
import { generateEmbedding } from './knowledgeService.js';
import { summarizeConversation } from './summaryService.js';
import { TtlCache } from './cache.js';

const memoryCacheTtl = Number(process.env.MEMORY_CACHE_TTL_SECONDS ?? 120) * 1000;
const memoryCacheMax = Number(process.env.MEMORY_CACHE_MAX ?? 200);
const memorySearchLimit = Number(process.env.MEMORY_SEARCH_LIMIT ?? 5);
const memorySummaryWindow = Number(process.env.MEMORY_SUMMARY_WINDOW ?? 12);
const memorySummaryMinEvents = Number(process.env.MEMORY_SUMMARY_MIN_EVENTS ?? 6);
const memorySummaryMinChars = Number(process.env.MEMORY_SUMMARY_MIN_CHARS ?? 120);

const memoryCache = new TtlCache<SearchMemoryResponse>({ maxSize: memoryCacheMax, ttlMs: memoryCacheTtl });

function buildScopeKey(appName: string, userId: string): string {
    return `${appName}:${userId}`;
}

export class FirestoreMemoryService implements BaseMemoryService {
    constructor(private db: Firestore) {}

    async addSessionToMemory(session: Session): Promise<void> {
        const events = session.events || [];
        if (events.length < memorySummaryMinEvents) {
            return;
        }

        const window = memorySummaryWindow > 0
            ? events.slice(-memorySummaryWindow)
            : events;

        const summary = await summarizeConversation({ events: window });
        if (!summary) {
            return;
        }
        if (memorySummaryMinChars > 0 && summary.length < memorySummaryMinChars) {
            return;
        }

        const embedding = await generateEmbedding(summary, 'RETRIEVAL_DOCUMENT');
        const scopeKey = buildScopeKey(session.appName, session.userId);
        const timestamp = new Date().toISOString();

        await this.db.collection('memories').add({
            appName: session.appName,
            userId: session.userId,
            scopeKey,
            content: summary,
            embedding: FieldValue.vector(embedding),
            timestamp,
            createdAt: Timestamp.now(),
        });
    }

    async searchMemory(request: SearchMemoryRequest): Promise<SearchMemoryResponse> {
        const query = request.query?.trim();
        if (!query) {
            return { memories: [] };
        }

        const scopeKey = buildScopeKey(request.appName, request.userId);
        const cacheKey = `${scopeKey}:${query.toLowerCase()}`;
        const cached = memoryCache.get(cacheKey);
        if (cached) return cached;

        try {
            const vector = await generateEmbedding(query, 'RETRIEVAL_QUERY');
            const baseQuery = this.db.collection('memories').where('scopeKey', '==', scopeKey);
            const vectorQuery = baseQuery.findNearest('embedding', vector, {
                limit: memorySearchLimit,
                distanceMeasure: 'COSINE',
            });
            const snapshot = await vectorQuery.get();

            const memories = snapshot.docs.map(doc => {
                const data = doc.data() as any;
                return {
                    content: {
                        role: 'assistant',
                        parts: [{ text: data.content || '' }],
                    },
                    author: 'memory',
                    timestamp: data.timestamp || '',
                };
            }).filter(entry => entry.content.parts[0].text);

            const response = { memories };
            memoryCache.set(cacheKey, response);
            return response;
        } catch (error) {
            console.error('Memory search failed:', error);
            return { memories: [] };
        }
    }
}
