export const STOP_SYMBOLS = new Set([
    'USD', 'USDT', 'EUR', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY', 'AUD', 'CAD', 'NZD',
    'US', 'EU', 'UK', 'GDP', 'CPI', 'PMI', 'FOMC', 'FED', 'ECB', 'SEC', 'BOJ', 'IMF',
    'CEO', 'CFO', 'EPS', 'ETF', 'ETN', 'IPO', 'API', 'AI', 'LLM', 'RAG', 'YTD', 'YOY', 'QOQ',
]);

export const KNOWN_TICKERS = new Set([
    'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOG', 'GOOGL', 'META', 'NFLX', 'AMD', 'INTC', 'SMCI',
    'SPY', 'QQQ', 'IWM', 'DIA',
    'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'BNB', 'AVAX', 'DOT', 'LINK', 'MATIC',
    'GE', 'GM', 'F', 'T', 'V', 'MA', 'C', 'X',
    'VOLV_B', 'VOLV-B', 'VOLV-B.ST', 'ERIC_B', 'ERIC-B', 'ERIC-B.ST', 'ASSA_B', 'ASSA-B', 'ASSA-B.ST',
    'SEB_A', 'SEB-A', 'SEB-A.ST', 'SWED_A', 'SWED-A', 'SWED-A.ST', 'SAND', 'SAND.ST',
]);

export const INDEX_KEYWORDS = [
    's&p 500', 'sp500', 'sp 500', 'nasdaq', 'nasdaq 100', 'dow', 'dow jones', 'dax', 'ftse',
    'omx', 'omxs30', 'stoxx', 'vix',
];

export const COMMODITY_KEYWORDS = [
    'gold', 'silver', 'oil', 'brent', 'wti', 'natural gas', 'copper',
    'guld', 'silver', 'olja', 'gas',
];

export const ASSET_KEYWORDS = [
    'btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'xrp', 'ada', 'cardano', 'doge', 'dogecoin',
    'bnb', 'avax', 'dot', 'matic', 'link',
    'apple', 'tesla', 'nvidia', 'microsoft', 'amazon', 'google', 'meta', 'netflix',
    'crypto', 'krypto', 'stock', 'stocks', 'aktie', 'aktier', 'equity', 'equities', 'share', 'shares',
    'etf', 'forex', 'fx', 'index', 'commodity', 'futures', 'terminer',
];

export const NEWS_KEYWORDS = [
    'news', 'headline', 'sentiment', 'earnings', 'macro', 'report', 'filing', 'sec', 'press', 'rates',
    'nyhet', 'nyheter', 'rubrik', 'rapport', 'pressmeddelande', 'ranta', 'inflation',
];

export const TECH_KEYWORDS = [
    'chart', 'technical', 'trend', 'support', 'resistance', 'rsi', 'macd', 'moving average',
    'pattern', 'levels', 'price', 'volatility', 'price action',
    'diagram', 'graf', 'teknisk', 'stod', 'motstand', 'kurs', 'pris', 'niva', 'nivaer',
];

export const SIGNAL_KEYWORDS = [
    'signal', 'signals', 'scan', 'setup', 'alert', 'indicator', 'overbought', 'oversold',
    'signaler', 'overkop', 'oversald',
];

export const KNOWLEDGE_KEYWORDS = [
    'what is', 'explain', 'define', 'strategy', 'risk management', 'portfolio', 'allocation',
    'mean reversion', 'momentum', 'value investing', 'growth investing', 'pattern',
    'vad ar', 'forklara', 'definiera', 'strategi', 'riskhantering', 'portfolj', 'allokering',
];

export const MEMORY_KEYWORDS = [
    'my', 'me', 'i ', 'we', 'our', 'portfolio', 'risk', 'horizon', 'preference', 'constraint',
    'min', 'mina', 'mig', 'min portfolj', 'min profil', 'min risk',
];

export const PORTFOLIO_KEYWORDS = [
    'portfolio', 'holdings', 'positions', 'exposure', 'allocation', 'balance', 'pnl', 'profit', 'loss',
    'portfolj', 'innehav', 'positioner', 'exponering', 'allokering', 'balans', 'vinst', 'forlust',
];

export const FRESH_KEYWORDS = [
    'latest', 'today', 'recent', 'this week', 'this month', 'update', 'breaking', 'now',
    'senaste', 'idag', 'nyss', 'denna vecka', 'denna veckan', 'denna manad', 'just nu',
];

export const SOURCE_KEYWORDS = [
    'source', 'sources', 'citation', 'cite', 'report', 'study', 'paper',
    'kalla', 'kallor',
];

export const TRADE_KEYWORDS = [
    'buy', 'sell', 'long', 'short', 'enter', 'exit', 'trim', 'add', 'reduce', 'close', 'open',
    'position', 'allocate', 'allocation', 'rebalance', 'trade',
    'kop', 'salj', 'langa', 'korta', 'stang', 'oppna', 'position', 'rebalansera',
];

export const ANALYSIS_KEYWORDS = [
    'analyze', 'analysis', 'outlook', 'view', 'thoughts', 'opinion', 'idea', 'setup',
    'recommendation', 'forecast', 'thesis', 'should i',
    'analys', 'analysera', 'utsikt', 'tankar', 'syn', 'borde jag', 'ska jag', 'bor jag',
];

export const QUICK_QUESTION_PHRASES = [
    'what is', 'explain', 'define', 'difference between', 'how does', 'how to', 'meaning of', 'why is',
    'vad ar', 'vad betyder', 'hur fungerar', 'forklara', 'definiera', 'skillnad mellan',
];

export const COMPARE_KEYWORDS = [
    'compare', 'vs', 'versus',
    'jamfor', 'mot', 'kontra',
];
