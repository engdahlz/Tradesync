import { getGenAiClient } from '../services/genaiClient.js';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_MAX_DELETES = 200;
const DEFAULT_GRACE_SECONDS = 300;
const DEFAULT_DISPLAY_PREFIX = 'rag-context-';

function parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    return value.trim().toLowerCase() === 'true';
}

function parseTime(value?: string): number | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
}

export async function handleCleanupRagCaches(): Promise<void> {
    const cacheEnabled = process.env.RAG_CONTEXT_CACHE_ENABLED === 'true';
    const cleanupEnabled = parseBoolean(process.env.RAG_CONTEXT_CACHE_CLEANUP_ENABLED, true);

    if (!cacheEnabled || !cleanupEnabled) {
        console.log(`[TradeSync] RAG cache cleanup skipped: enabled=${cacheEnabled}, cleanup=${cleanupEnabled}`);
        return;
    }

    const displayPrefix = process.env.RAG_CONTEXT_CACHE_DISPLAY_PREFIX || DEFAULT_DISPLAY_PREFIX;
    const pageSize = parseNumber(process.env.RAG_CONTEXT_CACHE_CLEANUP_PAGE_SIZE, DEFAULT_PAGE_SIZE);
    const maxDeletes = parseNumber(process.env.RAG_CONTEXT_CACHE_CLEANUP_MAX_DELETES, DEFAULT_MAX_DELETES);
    const graceSeconds = parseNumber(process.env.RAG_CONTEXT_CACHE_CLEANUP_GRACE_SECONDS, DEFAULT_GRACE_SECONDS);
    const maxAgeSeconds = parseNumber(process.env.RAG_CONTEXT_CACHE_MAX_AGE_SECONDS, 0);

    const graceMs = graceSeconds * 1000;
    const maxAgeMs = maxAgeSeconds > 0 ? maxAgeSeconds * 1000 : 0;
    const now = Date.now();

    const ai = getGenAiClient();
    let scanned = 0;
    let deleted = 0;
    let skipped = 0;
    let errors = 0;

    try {
        const pager = await ai.caches.list({ config: { pageSize } });
        for await (const cached of pager) {
            scanned += 1;
            if (!cached.displayName || !cached.displayName.startsWith(displayPrefix)) {
                skipped += 1;
                continue;
            }

            const expireMs = parseTime(cached.expireTime);
            const updateMs = parseTime(cached.updateTime);
            const createMs = parseTime(cached.createTime);
            const staleByExpire = expireMs !== null && expireMs + graceMs <= now;
            const ageMs = updateMs ?? createMs;
            const staleByAge = maxAgeMs > 0 && ageMs !== null && ageMs + maxAgeMs <= now;

            if (!staleByExpire && !staleByAge) {
                continue;
            }

            if (!cached.name) {
                continue;
            }

            try {
                await ai.caches.delete({ name: cached.name });
                deleted += 1;
            } catch (error) {
                errors += 1;
                console.warn(`[TradeSync] Failed to delete cache ${cached.name}:`, error);
            }

            if (deleted >= maxDeletes) {
                break;
            }
        }
    } catch (error) {
        console.error('[TradeSync] RAG cache cleanup failed to list caches:', error);
        return;
    }

    console.log(
        `[TradeSync] RAG cache cleanup done: scanned=${scanned}, deleted=${deleted}, skipped=${skipped}, errors=${errors}`
    );
}
