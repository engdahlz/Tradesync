"""
Avanza Python Backend - Cloud Functions Entry Point

This module provides HTTP endpoints for fetching Swedish stock data
via the unofficial Avanza API.

Endpoints:
- get_stock_quote: Fetch real-time quote for a Swedish stock
"""

import os
import json
from firebase_functions import https_fn, options
from avanza_service import AvanzaService

# Initialize service (singleton pattern for session reuse)
_avanza_service = None


def get_avanza_service() -> AvanzaService:
    """Get or create the Avanza service singleton."""
    global _avanza_service
    if _avanza_service is None:
        _avanza_service = AvanzaService(
            username=os.environ.get("AVANZA_USERNAME", ""),
            password=os.environ.get("AVANZA_PASSWORD", ""),
            totp_secret=os.environ.get("AVANZA_TOTP_SECRET", ""),
        )
    return _avanza_service


@https_fn.on_request(
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"])
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
    cors=options.CorsOptions(cors_origins="*", cors_methods=["get", "post"])
)
def health(request: https_fn.Request) -> https_fn.Response:
    """Health check endpoint."""
    return https_fn.Response(
        json.dumps({"status": "ok", "service": "avanza-backend"}),
        status=200,
        headers={"Content-Type": "application/json"},
    )
