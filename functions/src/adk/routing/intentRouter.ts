import {
    ANALYSIS_KEYWORDS,
    ASSET_KEYWORDS,
    COMPARE_KEYWORDS,
    COMMODITY_KEYWORDS,
    FRESH_KEYWORDS,
    INDEX_KEYWORDS,
    KNOWLEDGE_KEYWORDS,
    KNOWN_TICKERS,
    MEMORY_KEYWORDS,
    NEWS_KEYWORDS,
    PORTFOLIO_KEYWORDS,
    QUICK_QUESTION_PHRASES,
    SIGNAL_KEYWORDS,
    SOURCE_KEYWORDS,
    STOP_SYMBOLS,
    TECH_KEYWORDS,
    TRADE_KEYWORDS,
} from './intentConfig.js';

export type SelectionIntent = {
    symbols: string[];
    hasSymbol: boolean;
    wantsNews: boolean;
    wantsTechnical: boolean;
    wantsSignals: boolean;
    wantsKnowledge: boolean;
    wantsMemory: boolean;
    wantsPortfolio: boolean;
    wantsFresh: boolean;
    wantsSources: boolean;
    isTradeRequest: boolean;
    isAnalysisRequest: boolean;
    isQuickQuestion: boolean;
};

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeForMatching(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function textHasAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => {
        if (keyword.includes(' ') || keyword.includes('&') || keyword.includes('/')) {
            return text.includes(keyword);
        }
        return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(text);
    });
}

function normalizeSymbolCandidate(value: string): string {
    return value
        .trim()
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/[^A-Za-z0-9./-]+$/, '')
        .toUpperCase();
}

function isSymbolCandidate(value: string): boolean {
    if (!value) return false;
    if (STOP_SYMBOLS.has(value)) return false;
    if (!/[A-Z]/.test(value)) return false;
    if (value.length === 2 && !KNOWN_TICKERS.has(value)) return false;
    return true;
}

function findSymbolCandidates(rawText: string): string[] {
    const candidates = new Set<string>();
    if (!rawText) return [];

    const addCandidate = (value: string) => {
        const normalized = normalizeSymbolCandidate(value);
        if (isSymbolCandidate(normalized)) {
            candidates.add(normalized);
        }
    };

    for (const match of rawText.matchAll(/\$([A-Za-z]{1,10})\b/g)) {
        addCandidate(match[1]);
    }

    for (const match of rawText.matchAll(/\bCRYPTO:([A-Za-z0-9./-]{1,15})\b/gi)) {
        addCandidate(match[1]);
    }

    for (const match of rawText.matchAll(/\b([A-Za-z]{1,10}(?:[-./][A-Za-z0-9]{1,10})+)\b/g)) {
        addCandidate(match[1]);
    }

    for (const match of rawText.matchAll(/\b([A-Za-z]{2,6}USDT)\b/gi)) {
        addCandidate(match[1]);
    }

    const upperTokens = rawText.match(/\b[A-Z]{2,6}\b/g) ?? [];
    for (const token of upperTokens) {
        addCandidate(token);
    }

    const lowerTokens = rawText.toLowerCase().match(/\b[a-z]{2,6}\b/g) ?? [];
    for (const token of lowerTokens) {
        const upper = token.toUpperCase();
        if (KNOWN_TICKERS.has(upper)) {
            addCandidate(upper);
        }
    }

    return Array.from(candidates);
}

function hasSymbolHint(rawText: string): { hasSymbol: boolean; symbols: string[] } {
    const symbols = findSymbolCandidates(rawText);
    const text = normalizeForMatching(rawText).toLowerCase();
    const hasKeyword = textHasAny(text, ASSET_KEYWORDS)
        || textHasAny(text, INDEX_KEYWORDS)
        || textHasAny(text, COMMODITY_KEYWORDS);
    return { hasSymbol: symbols.length > 0 || hasKeyword, symbols };
}

export function analyzeIntent(rawText: string): SelectionIntent {
    const text = normalizeForMatching(rawText).toLowerCase();
    const symbolHint = hasSymbolHint(rawText);
    const wantsNews = textHasAny(text, NEWS_KEYWORDS);
    const wantsTechnical = textHasAny(text, TECH_KEYWORDS);
    const wantsSignals = textHasAny(text, SIGNAL_KEYWORDS);
    const wantsKnowledge = textHasAny(text, KNOWLEDGE_KEYWORDS);
    const wantsMemory = textHasAny(text, MEMORY_KEYWORDS);
    const wantsPortfolio = textHasAny(text, PORTFOLIO_KEYWORDS);
    const wantsFresh = textHasAny(text, FRESH_KEYWORDS);
    const wantsSources = textHasAny(text, SOURCE_KEYWORDS);
    const isTradeRequest = textHasAny(text, TRADE_KEYWORDS);
    const isAnalysisRequest = textHasAny(text, ANALYSIS_KEYWORDS) || textHasAny(text, COMPARE_KEYWORDS);
    const isQuickQuestion = textHasAny(text, QUICK_QUESTION_PHRASES);

    return {
        symbols: symbolHint.symbols,
        hasSymbol: symbolHint.hasSymbol,
        wantsNews,
        wantsTechnical,
        wantsSignals,
        wantsKnowledge,
        wantsMemory,
        wantsPortfolio,
        wantsFresh,
        wantsSources,
        isTradeRequest,
        isAnalysisRequest,
        isQuickQuestion,
    };
}
