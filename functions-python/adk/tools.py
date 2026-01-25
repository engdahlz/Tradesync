"""Tool implementations for TradeSync ADK (Python)."""

from __future__ import annotations

import os
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import firebase_admin
import requests
import pandas as pd
import yfinance as yf
from firebase_admin import firestore
from google.adk.tools import FunctionTool
from google.adk.tools.tool_context import ToolContext
from youtube_transcript_api import YouTubeTranscriptApi

from . import config
from .knowledge_service import search_knowledge

if not firebase_admin._apps:
    firebase_admin.initialize_app()


def _ts_functions_base_url() -> Optional[str]:
    if config.TS_FUNCTIONS_BASE_URL:
        return config.TS_FUNCTIONS_BASE_URL.rstrip('/')
    project = os.getenv('GOOGLE_CLOUD_PROJECT') or os.getenv('GCLOUD_PROJECT')
    if not project:
        return None
    return f"https://{config.FUNCTIONS_REGION}-{project}.cloudfunctions.net"


def _normalize_symbol(raw: str) -> str:
    return raw.strip().upper().replace(' ', '')


def _is_likely_forex(symbol: str) -> bool:
    return symbol.isalpha() and len(symbol) == 6


def _to_yahoo_symbol(symbol: str) -> str:
    cleaned = _normalize_symbol(symbol).replace('CRYPTO:', '')
    if cleaned.endswith('USDT'):
        return f"{cleaned.replace('USDT', '')}-USD"
    if cleaned in {'BTC', 'ETH', 'SOL', 'XRP', 'ADA'}:
        return f"{cleaned}-USD"
    if _is_likely_forex(cleaned):
        return f"{cleaned}=X"
    return cleaned


def _to_binance_pair(symbol: str) -> str:
    cleaned = _normalize_symbol(symbol).replace('CRYPTO:', '')
    if '/' in cleaned:
        return cleaned.replace('/', '')
    if cleaned.endswith('USDT'):
        return cleaned
    return f"{cleaned}USDT"


def _fetch_binance_series(symbol: str) -> Dict[str, Any]:
    pair = _to_binance_pair(symbol)
    url = f"https://api.binance.com/api/v3/klines?symbol={pair}&interval=1h&limit=60"
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    closes = [float(item[4]) for item in data]
    highs = [float(item[2]) for item in data]
    lows = [float(item[3]) for item in data]
    return {
        'symbol': symbol,
        'source': 'binance',
        'interval': '1h',
        'prices': closes,
        'highs': highs,
        'lows': lows,
        'closes': closes,
    }


def _fetch_yahoo_series(symbol: str) -> Dict[str, Any]:
    yahoo_symbol = _to_yahoo_symbol(symbol)
    period2 = datetime.now(timezone.utc)
    period1 = period2 - timedelta(days=90)
    data = yf.download(yahoo_symbol, start=period1, end=period2, interval='1d', progress=False)

    if data is None or data.empty:
        raise RuntimeError(f"Yahoo Finance has no data for {yahoo_symbol}")

    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    closes = data['Close'].dropna().tolist()
    highs = data['High'].fillna(data['Close']).tolist()
    lows = data['Low'].fillna(data['Close']).tolist()

    return {
        'symbol': symbol,
        'source': 'yahoo',
        'interval': '1d',
        'prices': closes,
        'highs': highs,
        'lows': lows,
        'closes': closes,
    }


def _fetch_price_series(symbol: str) -> Dict[str, Any]:
    normalized = _normalize_symbol(symbol)
    if normalized.startswith('CRYPTO:') or normalized.endswith('USDT'):
        try:
            return _fetch_binance_series(symbol)
        except Exception:
            return _fetch_yahoo_series(symbol)

    try:
        return _fetch_yahoo_series(symbol)
    except Exception:
        return _fetch_binance_series(symbol)


def _ema(values: List[float], period: int) -> List[float]:
    if not values:
        return []
    k = 2 / (period + 1)
    ema_values = []
    ema = values[0]
    for value in values:
        ema = value * k + ema * (1 - k)
        ema_values.append(ema)
    return ema_values


def _calculate_rsi(prices: List[float], period: int = 14) -> float:
    if len(prices) < period + 1:
        return 50.0
    gains = 0.0
    losses = 0.0
    for i in range(len(prices) - period, len(prices)):
        change = prices[i] - prices[i - 1]
        if change > 0:
            gains += change
        else:
            losses -= change
    avg_gain = gains / period
    avg_loss = losses / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _calculate_macd(prices: List[float]) -> Dict[str, float]:
    if len(prices) < 26:
        return {'value': 0.0, 'signal': 0.0, 'histogram': 0.0}
    ema_fast = _ema(prices, 12)
    ema_slow = _ema(prices, 26)
    macd_line = [fast - slow for fast, slow in zip(ema_fast, ema_slow)]
    signal_line = _ema(macd_line, 9)
    histogram = macd_line[-1] - signal_line[-1]
    return {
        'value': macd_line[-1],
        'signal': signal_line[-1],
        'histogram': histogram,
    }


def get_latest_market_signals() -> List[Dict[str, Any]] | Dict[str, Any]:
    """Retrieves the 10 most recent market scan signals including buy/sell recommendations."""
    db = firestore.client()
    query = db.collection('signals').order_by('createdAt', direction=firestore.Query.DESCENDING).limit(10)
    docs = query.get()
    if not docs:
        return {'message': 'No recent market signals found.'}

    results = []
    for doc in docs:
        data = doc.to_dict() or {}
        created_at = data.get('createdAt')
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        results.append({
            'id': doc.id,
            'symbol': data.get('symbol'),
            'action': data.get('action'),
            'confidence': data.get('confidence'),
            'score': data.get('score'),
            'reasoning': data.get('reasoning'),
            'price': data.get('price'),
            'createdAt': created_at,
            'rsi': data.get('rsi'),
            'macd': data.get('macd'),
            'sentimentScore': data.get('sentimentScore'),
        })
    return results


def technical_analysis(symbol: str) -> Dict[str, Any]:
    """Runs technical analysis on any asset (price trend, volatility, RSI, MACD)."""
    try:
        series = _fetch_price_series(symbol)
        closes = series['closes']
        current_price = closes[-1]
        avg_price = sum(closes) / len(closes)
        trend = 'bullish' if current_price > avg_price else 'bearish' if current_price < avg_price else 'neutral'
        volatility = max(closes) - min(closes)
        rsi = _calculate_rsi(closes)
        macd = _calculate_macd(closes)
        return {
            'symbol': symbol,
            'source': series['source'],
            'interval': series['interval'],
            'currentPrice': current_price,
            'avgPrice': f"{avg_price:.2f}",
            'trend': trend,
            'volatility': f"{volatility:.2f}",
            'priceCount': len(closes),
            'prices': closes[-10:],
            'highs': series['highs'][-10:],
            'lows': series['lows'][-10:],
            'closes': closes[-10:],
            'rsi': rsi,
            'macd': macd,
        }
    except Exception as exc:
        return {'error': True, 'symbol': symbol, 'message': str(exc)}


def get_market_news(tickers: str) -> List[Dict[str, Any]] | Dict[str, Any]:
    """Fetches news for global assets (Stocks, Crypto, Forex)."""
    base_url = _ts_functions_base_url()
    if not base_url:
        return {'error': True, 'message': 'Missing TS function base URL.'}

    response = requests.post(
        f"{base_url}/getMarketNews",
        json={'tickers': tickers, 'limit': 5},
        timeout=25,
    )
    if not response.ok:
        return {'error': True, 'message': f"Market news error: {response.status_code}"}

    payload = response.json() or {}
    news = payload.get('news', [])
    results = []
    for item in news:
        summary = item.get('summary') or item.get('description') or item.get('title') or ''
        results.append({
            'title': f"{item.get('title')} ({item.get('source')}) - [{item.get('time_published')}]",
            'summary': (summary[:200] + '...') if summary else '',
            'sentiment': item.get('sentiment') or 'Neutral',
            'source': item.get('source'),
            'time_published': item.get('time_published') or item.get('publishedAt'),
        })
    return results


def calculate_signal(symbol: str, sentiment_score: float, rsi: float, macd_histogram: float) -> Dict[str, Any]:
    """Calculates trading signal based on technical indicators (RSI, MACD) and sentiment."""
    score = 0.0
    reasons = []

    if rsi < 30:
        score += 25
        reasons.append(f"RSI oversold ({rsi:.1f})")
    elif rsi > 70:
        score -= 25
        reasons.append(f"RSI overbought ({rsi:.1f})")

    if macd_histogram > 0:
        score += 25
        reasons.append('MACD bullish')
    elif macd_histogram < 0:
        score -= 25
        reasons.append('MACD bearish')

    score += sentiment_score * 50
    if sentiment_score > 0.5:
        reasons.append('Strong positive sentiment')
    elif sentiment_score < -0.5:
        reasons.append('Strong negative sentiment')

    action = 'HOLD'
    confidence = 0.0
    if score >= 50:
        action = 'BUY'
        confidence = min(score / 100, 1)
    elif score <= -50:
        action = 'SELL'
        confidence = min(abs(score) / 100, 1)
    else:
        confidence = 1 - (abs(score) / 50)

    return {
        'symbol': symbol,
        'action': action,
        'confidence': f"{confidence:.2f}",
        'score': score,
        'reasoning': '. '.join(reasons) or 'Market conditions are neutral.',
    }


def search_knowledge_base(query: str) -> Dict[str, Any]:
    """Searches the RAG knowledge base for trading books, financial reports, and academic papers."""
    results = search_knowledge(query, 3)
    if not results:
        return {'found': False, 'message': 'No relevant information found in knowledge base.'}

    chunks = []
    for result in results:
        metadata = result.metadata or {}
        chunk: Dict[str, Any] = {
            'content': result.content,
            'source': metadata.get('title') or 'Unknown Source',
            'sourceType': metadata.get('sourceType') or 'rag',
        }
        page = metadata.get('page_number', metadata.get('pageNumber'))
        if page is not None:
            chunk['page'] = page
        if result.similarity != 0:
            chunk['score'] = result.similarity
        chunks.append(chunk)

    return {'found': True, 'chunks': chunks}


async def search_memory(query: str, limit: int = 5, tool_context: ToolContext | None = None):
    """Searches long-term memory for user preferences, past decisions, and saved context."""
    if tool_context is None:
        return {'error': True, 'message': 'Memory service unavailable.'}

    result = await tool_context.search_memory(query)
    memories = result.memories or []
    sliced = memories[:limit] if limit else memories[:5]

    formatted = []
    for memory in sliced:
        parts = memory.content.parts if memory.content else []
        text = ' '.join([part.text for part in parts if getattr(part, 'text', None)]).strip()
        if not text:
            continue
        formatted.append({
            'text': text,
            'author': memory.author,
            'timestamp': memory.timestamp,
        })
    return formatted


def _get_access_token() -> str:
    from google.auth.transport.requests import Request
    import google.auth

    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
    credentials.refresh(Request())
    if not credentials.token:
        raise RuntimeError('Failed to obtain GCP access token.')
    return credentials.token


def vertex_ai_search(query: str, page_size: int = 5) -> Dict[str, Any]:
    """Searches a private Vertex AI Search datastore for fresh, authoritative results."""
    endpoint = config.VERTEX_AI_SEARCH_ENDPOINT
    if not endpoint:
        project = os.getenv('GOOGLE_CLOUD_PROJECT') or os.getenv('GCLOUD_PROJECT')
        if not project or not config.VERTEX_AI_SEARCH_DATASTORE_ID:
            return {'error': True, 'message': 'Vertex AI Search not configured.'}
        endpoint = (
            f"https://discoveryengine.googleapis.com/v1/projects/{project}/locations/"
            f"{config.VERTEX_AI_SEARCH_LOCATION}/dataStores/{config.VERTEX_AI_SEARCH_DATASTORE_ID}/"
            f"servingConfigs/{config.VERTEX_AI_SEARCH_SERVING_CONFIG}:search"
        )

    token = _get_access_token()
    response = requests.post(
        endpoint,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
        json={
            'query': query,
            'pageSize': page_size,
            'contentSearchSpec': {'snippetSpec': {'maxSnippetCount': 1}},
        },
        timeout=30,
    )
    if not response.ok:
        return {'error': True, 'message': f"Vertex AI Search error: {response.status_code}"}

    data = response.json() or {}
    results = data.get('results', [])
    mapped = []
    for item in results:
        document = item.get('document', {})
        derived = document.get('derivedStructData', {})
        mapped.append({
            'title': derived.get('title') or document.get('title') or document.get('name') or 'Vertex AI Search Result',
            'uri': derived.get('link') or derived.get('url') or document.get('uri'),
            'snippet': derived.get('snippet') or (derived.get('extractive_answers') or [{}])[0].get('content', ''),
            'score': item.get('relevanceScore') or item.get('score'),
            'source': derived.get('source') or derived.get('publisher'),
        })
    return {'results': mapped}


def vertex_ai_rag_retrieval(query: str, top_k: int = 5) -> Dict[str, Any]:
    """Retrieves grounded context from Vertex AI RAG Engine."""
    endpoint = config.VERTEX_RAG_RETRIEVAL_ENDPOINT
    if not endpoint:
        project = os.getenv('GOOGLE_CLOUD_PROJECT') or os.getenv('GCLOUD_PROJECT')
        if not project or not config.VERTEX_RAG_CORPUS_ID:
            return {'error': True, 'message': 'Vertex RAG not configured.'}
        endpoint = (
            f"https://{config.VERTEX_RAG_LOCATION}-aiplatform.googleapis.com/v1/projects/{project}/locations/"
            f"{config.VERTEX_RAG_LOCATION}/ragCorpora/{config.VERTEX_RAG_CORPUS_ID}:retrieve"
        )

    token = _get_access_token()
    response = requests.post(
        endpoint,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
        json={'query': {'text': query}, 'topK': top_k},
        timeout=30,
    )
    if not response.ok:
        return {'error': True, 'message': f"Vertex AI RAG error: {response.status_code}"}

    data = response.json() or {}
    chunks = data.get('retrievedContexts') or data.get('contexts') or data.get('results') or []
    mapped = []
    for chunk in chunks:
        mapped.append({
            'content': chunk.get('text') or chunk.get('content') or (chunk.get('chunk') or {}).get('text', ''),
            'source': chunk.get('source') or chunk.get('uri') or (chunk.get('document') or {}).get('title') or 'Vertex AI RAG',
            'score': chunk.get('score') or chunk.get('similarity') or chunk.get('distance'),
        })
    mapped = [item for item in mapped if item.get('content')]
    return {'chunks': mapped}


async def execute_trade(
    symbol: str,
    side: str,
    quantity: float,
    order_type: str = 'market',
    price: Optional[float] = None,
    is_dry_run: Optional[bool] = None,
    tool_context: ToolContext | None = None,
):
    """Places a trade order. Defaults to paper trading unless is_dry_run is false and live trading is enabled."""
    if order_type == 'limit' and price is None:
        return {'success': False, 'status': 'failed', 'message': 'Limit orders require a price.'}

    session = tool_context.session if tool_context else None
    user_id = session.user_id if session else 'anonymous'
    state = session.state if session else {}

    live_trading_enabled = os.getenv('LIVE_TRADING_ENABLED', 'false').lower() == 'true'
    should_dry_run = True if is_dry_run is None else is_dry_run
    execute_live = live_trading_enabled and should_dry_run is False

    if execute_live and not state.get('pendingTradeConfirmed'):
        pending_trade = {
            'symbol': symbol,
            'side': side,
            'quantity': quantity,
            'orderType': order_type,
            'price': price,
            'isDryRun': should_dry_run,
            'createdAt': datetime.now(timezone.utc).isoformat(),
        }
        if session and tool_context:
            invocation = getattr(tool_context, '_invocation_context', None)
            service = invocation.session_service if invocation else None
            if service and hasattr(service, 'update_session'):
                session.state = {**state, 'pendingTrade': pending_trade, 'pendingTradeConfirmed': False}
                await service.update_session(
                    app_name=session.app_name,
                    user_id=session.user_id,
                    session_id=session.id,
                    state=session.state,
                )
        return {
            'success': False,
            'status': 'pending_confirmation',
            'message': 'Live trade requested. Ask the user to confirm to proceed.',
            'pendingTrade': pending_trade,
        }

    if execute_live and state.get('pendingTradeConfirmed') and session and tool_context:
        invocation = getattr(tool_context, '_invocation_context', None)
        service = invocation.session_service if invocation else None
        if service and hasattr(service, 'update_session'):
            session.state = {**state, 'pendingTradeConfirmed': False, 'pendingTrade': None}
            await service.update_session(
                app_name=session.app_name,
                user_id=session.user_id,
                session_id=session.id,
                state=session.state,
            )

    base_url = _ts_functions_base_url()
    if not base_url:
        return {'success': False, 'status': 'failed', 'message': 'Missing TS function base URL.'}

    idempotency_key = f"adk_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
    payload = {
        'userId': user_id,
        'symbol': symbol,
        'side': side,
        'quantity': quantity,
        'orderType': order_type,
        'price': price,
        'idempotencyKey': idempotency_key,
        'isDryRun': should_dry_run,
    }

    response = requests.post(f"{base_url}/executeTrade", json=payload, timeout=25)
    if not response.ok:
        return {'success': False, 'status': 'failed', 'message': f"Trade error: {response.status_code}"}
    return response.json()


async def confirm_trade(tool_context: ToolContext | None = None):
    """Confirms a pending trade request. Call this when the user explicitly agrees to a blocked or pending trade."""
    if tool_context is None:
        return 'No active session found.'
    session = tool_context.session
    state = dict(session.state)
    state['pendingTradeConfirmed'] = True
    session.state = state

    invocation_context = getattr(tool_context, '_invocation_context', None)
    service = invocation_context.session_service if invocation_context else None
    if service and hasattr(service, 'update_session'):
        await service.update_session(
            app_name=session.app_name,
            user_id=session.user_id,
            session_id=session.id,
            state=session.state,
        )
    return 'Trade confirmed. Retrying execution...'


def get_chart(symbol: str, period: str = '3mo') -> Dict[str, Any]:
    """Generates a visual price chart (candlesticks) for any asset."""
    base_url = _ts_functions_base_url()
    if not base_url:
        return {'error': 'Missing TS function base URL.'}
    response = requests.post(
        f"{base_url}/generate_chart",
        json={'symbol': symbol, 'period': period, 'interval': '1d'},
        timeout=60,
    )
    data = response.json() if response.ok else {}
    image_url = data.get('imageUrl')
    if not image_url:
        return {'error': 'Failed to generate chart'}
    return {
        'media': {
            'url': image_url,
            'contentType': 'image/png',
        }
    }


def _extract_video_id(url: str) -> Optional[str]:
    for token in ['v=', 'youtu.be/', 'youtube.com/embed/']:
        if token in url:
            part = url.split(token, 1)[1]
            return part.split('&')[0].split('?')[0]
    return None


def fetch_youtube_transcript(video_url: str) -> Dict[str, Any]:
    """Fetches the transcript of a YouTube video for analysis."""
    video_id = _extract_video_id(video_url)
    if not video_id:
        return {'error': True, 'message': 'Invalid YouTube URL'}

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        text = ' '.join([item.get('text', '') for item in transcript])
        text = text.replace('\n', ' ').strip()
        return {
            'success': True,
            'transcript': text[:10000],
            'videoId': video_id,
            'length': len(text),
        }
    except Exception:
        return {'error': True, 'message': 'Transcript unavailable for this video', 'videoId': video_id}


# Tool wrappers
latest_signals_tool = FunctionTool(get_latest_market_signals)
market_news_tool = FunctionTool(get_market_news)
technical_analysis_tool = FunctionTool(technical_analysis)
calculate_signal_tool = FunctionTool(calculate_signal)
knowledge_tool = FunctionTool(search_knowledge_base)
memory_search_tool = FunctionTool(search_memory)
vertex_search_tool = FunctionTool(vertex_ai_search)
vertex_rag_tool = FunctionTool(vertex_ai_rag_retrieval)
trade_execution_tool = FunctionTool(execute_trade)
confirm_trade_tool = FunctionTool(confirm_trade)
chart_tool = FunctionTool(get_chart)
fetch_transcript_tool = FunctionTool(fetch_youtube_transcript)

ALL_TOOLS = [
    latest_signals_tool,
    market_news_tool,
    technical_analysis_tool,
    calculate_signal_tool,
    knowledge_tool,
    memory_search_tool,
    vertex_search_tool,
    vertex_rag_tool,
    trade_execution_tool,
    confirm_trade_tool,
    chart_tool,
    fetch_transcript_tool,
]
