"""
Avanza Python Backend - Cloud Functions Entry Point

This module provides HTTP endpoints for fetching Swedish stock data
via the unofficial Avanza API.

Endpoints:
- get_stock_quote: Fetch real-time quote for a Swedish stock
"""

import os
import json
import functions_framework
from flask import jsonify, Request
from avanza_service import AvanzaService

# Initialize service (singleton pattern for session reuse)
_avanza_service = None


def get_avanza_service() -> AvanzaService:
    """Get or create the Avanza service singleton."""
    global _avanza_service
    if _avanza_service is None:
        _avanza_service = AvanzaService(
            username=os.environ.get('AVANZA_USERNAME', ''),
            password=os.environ.get('AVANZA_PASSWORD', ''),
            totp_secret=os.environ.get('AVANZA_TOTP_SECRET', ''),
        )
    return _avanza_service


@functions_framework.http
def get_stock_quote(request: Request):
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
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600',
        }
        return ('', 204, headers)

    # CORS headers for actual response
    headers = {'Access-Control-Allow-Origin': '*'}

    try:
        # Parse request
        request_json = request.get_json(silent=True)
        if not request_json or 'symbol' not in request_json:
            return jsonify({'error': 'Missing symbol parameter'}), 400, headers

        symbol = request_json['symbol']

        # Get service and fetch quote
        service = get_avanza_service()
        quote = service.get_quote(symbol)

        return jsonify(quote), 200, headers

    except Exception as e:
        return jsonify({'error': str(e)}), 500, headers


@functions_framework.http
def health(request: Request):
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'service': 'avanza-backend'}), 200
