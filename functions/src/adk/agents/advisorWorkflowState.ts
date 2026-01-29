export const RESEARCH_STATE_KEYS = {
    signals: 'app:research_signals',
    technical: 'app:research_technical',
    news: 'app:research_news',
    rag: 'app:research_rag',
    memory: 'app:research_memory',
    portfolio: 'app:research_portfolio',
    search: 'app:research_search',
    vertexSearch: 'app:research_vertex_search',
    vertexRag: 'app:research_vertex_rag',
};

export const SUMMARY_STATE_KEY = 'app:summary';
export const MEMORY_EVENT_COUNT_KEY = 'app:memory_last_event_count';
export const SUMMARY_EVENT_COUNT_KEY = 'app:summary_last_event_count';
export const ROUTING_STATE_KEY = 'app:research_routing';

export const RAG_CACHE_STATE_KEYS = {
    cachedContent: 'app:rag_cached_content',
    cachedContentHash: 'app:rag_cached_content_hash',
    cachedContentExpiresAt: 'app:rag_cached_content_expires_at',
    cachedContentModel: 'app:rag_cached_content_model',
};
