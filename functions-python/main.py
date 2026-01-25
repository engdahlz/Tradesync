"""
Avanza Python Backend - Cloud Functions Entry Point

This module provides HTTP endpoints for fetching Swedish stock data
via the unofficial Avanza API.

Endpoints:
- get_stock_quote: Fetch real-time quote for a Swedish stock
"""

import os
import json
import pandas as pd
from datetime import timedelta
import firebase_admin
from firebase_admin import storage
from firebase_functions import https_fn, options
from avanza_service import AvanzaService
from adk.handlers import advisorChatPy, advisorChatStreamPy

# Initialize Firebase Admin
if not firebase_admin._apps:
    firebase_admin.initialize_app()

# Initialize service (singleton pattern for session reuse)
_avanza_service = None


def _get_int_env(name: str, fallback: int) -> int:
    value = os.environ.get(name)
    try:
        return int(value) if value is not None else fallback
    except ValueError:
        return fallback


def get_avanza_service() -> AvanzaService:
    """Get or create the Avanza service singleton."""
    global _avanza_service
    if _avanza_service is None:
        _avanza_service = AvanzaService(
            username=os.environ.get("AVANZA_USERNAME", ""),
            password=os.environ.get("AVANZA_PASSWORD", ""),
            totp_secret=os.environ.get("AVANZA_TOTP_SECRET", ""),
            session_timeout=_get_int_env("AVANZA_SESSION_TIMEOUT", 600),
            max_auth_failures=_get_int_env("AVANZA_MAX_AUTH_FAILURES", 3),
            circuit_breaker_seconds=_get_int_env("AVANZA_CIRCUIT_BREAKER_SECONDS", 120),
        )
    return _avanza_service


@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public",
)
def get_stock_quote(request: https_fn.Request) -> https_fn.Response:
    """
    HTTP Cloud Function for fetching Swedish stock quotes.

    Request Body:
        {"symbol": "ERIC-B"}

    Response:
        {
            "symbol": "ERIC-B",
            "price": 89.50,
            "change": 1.20,
            "changePercent": 1.36,
            "open": 88.30,
            "high": 90.10,
            "low": 88.00,
            "volume": 5234567,
            "source": "avanza",
            "assetType": "swedish_stock",
            "timestamp": "2026-01-19T12:34:56.789Z"
        }
    """
    try:
        # Parse request
        request_json = request.get_json(silent=True)
        if not request_json or "symbol" not in request_json:
            return https_fn.Response(
                json.dumps({"error": "Missing symbol parameter"}),
                status=400,
                headers={"Content-Type": "application/json"},
            )

        symbol = request_json["symbol"]

        # Get service and fetch quote
        service = get_avanza_service()
        quote = service.get_quote(symbol)

        return https_fn.Response(
            json.dumps(quote), status=200, headers={"Content-Type": "application/json"}
        )

    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"},
        )


@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    memory=options.MemoryOption.GB_1,
    invoker="public",
)
def generate_chart(request: https_fn.Request) -> https_fn.Response:
    """
    HTTP Cloud Function for generating stock charts using yfinance and mplfinance.

    Request Body:
        {"symbol": "AAPL", "interval": "1d", "period": "1mo"}

    Response:
        {"imageUrl": "https://storage.googleapis.com/..."}
    """
    try:
        # Parse request
        request_json = request.get_json(silent=True)
        if not request_json or "symbol" not in request_json:
            return https_fn.Response(
                json.dumps({"error": "Missing symbol parameter"}),
                status=400,
                headers={"Content-Type": "application/json"},
            )

        symbol = request_json["symbol"]
        interval = request_json.get("interval", "1d")
        period = request_json.get("period", "1mo")

        # 1. Fetch data
        import yfinance as yf

        data = yf.download(symbol, period=period, interval=interval, progress=False)

        # Fix for yfinance multi-index columns
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)

        if data.empty:
            return https_fn.Response(
                json.dumps({"error": f"No data found for symbol {symbol}"}),
                status=404,
                headers={"Content-Type": "application/json"},
            )

        # 2. Generate chart
        import mplfinance as mpf

        temp_file = "/tmp/chart.png"

        # Ensure data is in the correct format for mplfinance
        # yfinance download usually returns a DataFrame with DatetimeIndex
        mpf.plot(
            data,
            type="candle",
            style="charles",
            mav=(20, 50),
            savefig=temp_file,
            title=f"{symbol} ({interval})",
            volume=True if "Volume" in data.columns else False,
        )

        # 3. Upload to Firebase Storage
        bucket = storage.bucket("tradesync-ai-prod-charts")
        # Use a timestamp or unique ID to avoid caching issues if needed,
        # but here we use symbol/interval/period
        blob_path = f"charts/{symbol}_{interval}_{period}.png"
        blob = bucket.blob(blob_path)
        blob.upload_from_filename(temp_file)

        # 4. Get Public URL
        public_url = f"https://storage.googleapis.com/{bucket.name}/{blob_path}"

        # Cleanup
        if os.path.exists(temp_file):
            os.remove(temp_file)

        return https_fn.Response(
            json.dumps({"imageUrl": public_url}),
            status=200,
            headers={"Content-Type": "application/json"},
        )

    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"},
        )


@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public",
)
def health(request: https_fn.Request) -> https_fn.Response:
    """Health check endpoint."""
    return https_fn.Response(
        json.dumps({"status": "ok", "service": "avanza-backend"}),
        status=200,
        headers={"Content-Type": "application/json"},
    )


@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"]),
    invoker="public",
)
def keep_avanza_alive(request: https_fn.Request) -> https_fn.Response:
    """Keep the Avanza session alive when the function instance is warm."""
    service = get_avanza_service()
    ok = service.keep_alive()
    return https_fn.Response(
        json.dumps({"ok": ok}),
        status=200 if ok else 500,
        headers={"Content-Type": "application/json"},
    )
