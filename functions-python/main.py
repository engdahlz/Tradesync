"""
Avanza Python Backend - Heroku Entry Point

This module provides HTTP endpoints for fetching Swedish stock data
via the unofficial Avanza API.
"""

import os
from flask import Flask, request, jsonify
from avanza_service import AvanzaService

app = Flask(__name__)

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

@app.route('/get_stock_quote', methods=['POST', 'OPTIONS'])
def get_stock_quote():
    """
    HTTP Endpoint for fetching Swedish stock quotes.
    Request Body: {"symbol": "ERIC-B"}
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600',
        }

    headers = {'Access-Control-Allow-Origin': '*'}

    try:
        request_json = request.get_json(silent=True)
        if not request_json or 'symbol' not in request_json:
            return jsonify({'error': 'Missing symbol parameter'}), 400, headers

        symbol = request_json['symbol']
        service = get_avanza_service()
        quote = service.get_quote(symbol)

        return jsonify(quote), 200, headers

    except Exception as e:
        return jsonify({'error': str(e)}), 500, headers

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'service': 'avanza-backend'}), 200

# Default route for root access
@app.route('/', methods=['POST', 'GET'])
def index():
    if request.method == 'GET':
        return health()
    return get_stock_quote()

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)

