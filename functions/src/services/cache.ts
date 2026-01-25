type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

export class TtlCache<T> {
    private readonly cache = new Map<string, CacheEntry<T>>();
    private readonly maxSize: number;
    private readonly ttlMs: number;

    constructor(options: { maxSize: number; ttlMs: number }) {
        this.maxSize = Math.max(1, options.maxSize);
        this.ttlMs = Math.max(0, options.ttlMs);
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        if (this.ttlMs > 0 && entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }

    set(key: string, value: T): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        const expiresAt = this.ttlMs > 0 ? Date.now() + this.ttlMs : Number.MAX_SAFE_INTEGER;
        this.cache.set(key, { value, expiresAt });
    }

    clear(): void {
        this.cache.clear();
    }
}
