"""
Avanza Service - Python wrapper for the unofficial Avanza API

This module provides a clean interface for:
- Authentication (TOTP-based 2FA)
- Session management (keep-alive)
- Fetching stock quotes
- Rate limiting (jitter-based polling)
"""

import os
import time
import random
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import pyotp
from avanza import Avanza


class AvanzaService:
    """
    Service wrapper for Avanza API with session management.
    
    Features:
    - Zero-touch TOTP authentication
    - Session persistence (reuses connection)
    - Automatic reconnection on session expiry
    - Rate limiting with jitter
    """
    
    def __init__(
        self,
        username: str,
        password: str,
        totp_secret: str,
        session_timeout: int = 600,  # 10 minutes
    ):
        self.username = username
        self.password = password
        self.totp_secret = totp_secret
        self.session_timeout = session_timeout
        
        self._client: Optional[Avanza] = None
        self._last_auth_time: float = 0
        self._lock = threading.Lock()
        
        # Rate limiting
        self._last_request_time: float = 0
        self._min_request_interval: float = 1.0  # 1 second base
    
    def _generate_totp(self) -> str:
        """Generate TOTP code for 2FA."""
        totp = pyotp.TOTP(self.totp_secret)
        return totp.now()
    
    def _ensure_authenticated(self) -> Avanza:
        """Ensure we have a valid authenticated session."""
        with self._lock:
            now = time.time()
            
            # Check if session expired
            if self._client is None or (now - self._last_auth_time) > self.session_timeout:
                self._authenticate()
            
            return self._client
    
    def _authenticate(self) -> None:
        """Authenticate with Avanza using TOTP."""
        totp_code = self._generate_totp()
        
        self._client = Avanza({
            'username': self.username,
            'password': self.password,
            'totpSecret': self.totp_secret,
        })
        
        self._last_auth_time = time.time()
    
    def _apply_rate_limit(self) -> None:
        """Apply rate limiting with jitter to avoid detection."""
        now = time.time()
        elapsed = now - self._last_request_time
        
        # Calculate wait time with jitter (±15%)
        base_interval = self._min_request_interval
        jitter = random.uniform(-0.15, 0.15) * base_interval
        required_interval = base_interval + jitter
        
        if elapsed < required_interval:
            time.sleep(required_interval - elapsed)
        
        self._last_request_time = time.time()
    
    def _clean_symbol(self, symbol: str) -> str:
        """Clean and normalize ticker symbol."""
        # Remove common suffixes
        cleaned = symbol.upper()
        for suffix in ['.ST', ':STO', ':XSTO', '-SE']:
            if cleaned.endswith(suffix):
                cleaned = cleaned[:-len(suffix)]
        return cleaned
    
    def _search_instrument(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Search for instrument by symbol."""
        client = self._ensure_authenticated()
        self._apply_rate_limit()
        
        results = client.search_for_stock(symbol)
        
        if not results or 'hits' not in results:
            return None
        
        hits = results.get('hits', [])
        if not hits:
            return None
        
        # Find best match (exact symbol match preferred)
        for hit in hits:
            if hit.get('tickerSymbol', '').upper() == symbol.upper():
                return hit
        
        # Return first result if no exact match
        return hits[0] if hits else None
    
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Get real-time quote for a Swedish stock.
        
        Args:
            symbol: Stock ticker (e.g., "ERIC-B", "VOLV-B.ST")
        
        Returns:
            UnifiedQuote-compatible dictionary
        """
        cleaned_symbol = self._clean_symbol(symbol)
        
        # Search for the instrument
        instrument = self._search_instrument(cleaned_symbol)
        if not instrument:
            raise ValueError(f"Instrument not found: {symbol}")
        
        orderbook_id = instrument.get('orderbookId')
        if not orderbook_id:
            raise ValueError(f"No orderbook ID for: {symbol}")
        
        # Get the orderbook (quote data)
        client = self._ensure_authenticated()
        self._apply_rate_limit()
        
        orderbook = client.get_orderbook(str(orderbook_id), 'STOCK')
        
        # Extract and format data
        quote_data = orderbook.get('orderbook', {})
        change_data = orderbook.get('change', {})
        
        last_price = quote_data.get('lastPrice', 0)
        change_value = quote_data.get('change', 0)
        change_percent = quote_data.get('changePercent', 0)
        
        return {
            'symbol': cleaned_symbol,
            'price': float(last_price) if last_price else 0,
            'change': float(change_value) if change_value else 0,
            'changePercent': float(change_percent) if change_percent else 0,
            'open': float(quote_data.get('openPrice', 0)) if quote_data.get('openPrice') else None,
            'high': float(quote_data.get('highestPrice', 0)) if quote_data.get('highestPrice') else None,
            'low': float(quote_data.get('lowestPrice', 0)) if quote_data.get('lowestPrice') else None,
            'volume': int(quote_data.get('totalVolumeTraded', 0)) if quote_data.get('totalVolumeTraded') else None,
            'source': 'avanza',
            'assetType': 'swedish_stock',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
    
    def keep_alive(self) -> bool:
        """
        Send a lightweight request to keep the session alive.
        
        Call this periodically (every 5-10 minutes) if no other
        requests are being made.
        """
        try:
            client = self._ensure_authenticated()
            self._apply_rate_limit()
            client.get_overview()
            return True
        except Exception:
            return False
