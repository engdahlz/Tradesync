type CacheEntry<T> = {
    data: T;
    timestamp: number;
    expiresAt: number;
};

type CacheStore = Map<string, CacheEntry<unknown>>;

const cache: CacheStore = new Map();

const DEFAULT_TTL = {
    QUOTE: 30 * 1000,
    HISTORICAL: 60 * 60 * 1000,
    NEWS: 5 * 60 * 1000,
    FOREX: 60 * 60 * 1000,
    MACRO: 24 * 60 * 60 * 1000,
    TECHNICAL: 5 * 60 * 1000,
} as const;

function generateCacheKey(prefix: string, ...args: (string | number)[]): string {
    return `${prefix}:${args.join(':')}`;
}

export function getCached<T>(key: string): T | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
        return null;
    }

    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
    const now = Date.now();
    cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
    });
}

export function invalidateCache(pattern?: string): void {
    if (!pattern) {
        cache.clear();
        return;
    }

    for (const key of cache.keys()) {
        if (key.startsWith(pattern) || key.includes(pattern)) {
            cache.delete(key);
        }
    }
}

export function getCacheStats(): {
    size: number;
    keys: string[];
    oldestEntry: number | null;
    newestEntry: number | null;
} {
    const entries = Array.from(cache.entries());
    const timestamps = entries.map(([, entry]) => entry.timestamp);

    return {
        size: cache.size,
        keys: Array.from(cache.keys()),
        oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
        newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
}

export async function withCache<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
): Promise<T> {
    const cached = getCached<T>(key);
    if (cached !== null) {
        return cached;
    }

    const data = await fetcher();
    setCache(key, data, ttlMs);
    return data;
}

export const CacheKeys = {
    quote: (symbol: string) => generateCacheKey('quote', symbol),
    historical: (symbol: string, interval: string, limit: number) =>
        generateCacheKey('historical', symbol, interval, limit.toString()),
    news: (source: string, query: string) => generateCacheKey('news', source, query),
    forex: (base: string, quote: string) => generateCacheKey('forex', base, quote),
    macro: (series: string) => generateCacheKey('macro', series),
    technical: (symbol: string, indicator: string, period: number) =>
        generateCacheKey('technical', symbol, indicator, period.toString()),
} as const;

export { DEFAULT_TTL };

const PERSISTENT_STORAGE_KEY = 'tradesync_cache';

export function persistCacheToStorage(): void {
    try {
        const serializable: Record<string, CacheEntry<unknown>> = {};
        for (const [key, entry] of cache.entries()) {
            if (Date.now() < entry.expiresAt) {
                serializable[key] = entry;
            }
        }
        localStorage.setItem(PERSISTENT_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
        console.warn('Failed to persist cache to localStorage');
    }
}

export function loadCacheFromStorage(): void {
    try {
        const stored = localStorage.getItem(PERSISTENT_STORAGE_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored) as Record<string, CacheEntry<unknown>>;
        const now = Date.now();

        for (const [key, entry] of Object.entries(parsed)) {
            if (entry.expiresAt > now) {
                cache.set(key, entry);
            }
        }
    } catch {
        console.warn('Failed to load cache from localStorage');
    }
}

export function setupCacheAutoPersist(intervalMs: number = 60000): () => void {
    const intervalId = setInterval(persistCacheToStorage, intervalMs);

    window.addEventListener('beforeunload', persistCacheToStorage);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('beforeunload', persistCacheToStorage);
    };
}
