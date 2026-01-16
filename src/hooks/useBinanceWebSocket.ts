import { useState, useEffect, useRef, useCallback } from 'react'

interface TickerData {
    symbol: string
    price: number
    priceChange: number
    priceChangePercent: number
    high: number
    low: number
    volume: number
    lastUpdate: number
    flashDirection: 'up' | 'down' | null
}

interface UseBinanceWebSocketOptions {
    symbols: string[]
    throttleMs?: number // Default 100ms = max 10 updates/sec per @tradesync-realtime-infra
}

interface UseBinanceWebSocketReturn {
    data: Map<string, TickerData>
    isConnected: boolean
    error: Error | null
    reconnect: () => void
}

/**
 * WebSocket hook for Binance real-time data
 * Per @tradesync-realtime-infra:
 * - Connect directly to wss://stream.binance.com:9443
 * - Use throttled buffer (max 10 updates/sec)
 * - Implement flash-on-change logic
 */
export function useBinanceWebSocket({
    symbols,
    throttleMs = 100,
}: UseBinanceWebSocketOptions): UseBinanceWebSocketReturn {
    const [data, setData] = useState<Map<string, TickerData>>(new Map())
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const wsRef = useRef<WebSocket | null>(null)
    const bufferRef = useRef<Map<string, TickerData>>(new Map())
    const lastUpdateRef = useRef<number>(0)
    const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return
        }

        // Per user request: Use !miniTicker@arr for Master Signals real-time feed
        // This provides updates for ALL symbols, which we filter locally
        const wsUrl = 'wss://stream.binance.com:9443/ws/!miniTicker@arr'

        try {
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                setIsConnected(true)
                setError(null)
                console.log('[Trade/Sync] WebSocket connected to Binance (!miniTicker@arr)')
            }

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data)
                    // !miniTicker@arr returns an array of ticker objects
                    // [{ e: '24hrMiniTicker', s: 'BTCUSDT', c: '...', ... }]
                    const tickerList = Array.isArray(payload) ? payload : []

                    if (tickerList.length === 0) return

                    let hasUpdates = false
                    const now = Date.now()

                    tickerList.forEach((tickerData: any) => {
                        const symbol = tickerData.s

                        // Filter: Only process requested symbols
                        // If symbols array is empty, we could potentially track all, 
                        // but for performance we usually want to restrict it.
                        // Assuming current usage requires explicit symbols list.
                        if (symbols.length > 0 && !symbols.includes(symbol)) {
                            return
                        }

                        const newPrice = parseFloat(tickerData.c)
                        const openPrice = parseFloat(tickerData.o)
                        const high = parseFloat(tickerData.h)
                        const low = parseFloat(tickerData.l)
                        const volume = parseFloat(tickerData.q) // Use quote volume for USDT value

                        // Calculate changes (MiniTicker doesn't have P or p)
                        const priceChange = newPrice - openPrice
                        const priceChangePercent = ((newPrice - openPrice) / openPrice) * 100

                        const oldData = bufferRef.current.get(symbol)

                        // Flash direction
                        let flashDirection: 'up' | 'down' | null = null
                        if (oldData) {
                            if (newPrice > oldData.price) flashDirection = 'up'
                            else if (newPrice < oldData.price) flashDirection = 'down'
                        }

                        const ticker: TickerData = {
                            symbol,
                            price: newPrice,
                            priceChange,
                            priceChangePercent,
                            high,
                            low,
                            volume,
                            lastUpdate: now,
                            flashDirection,
                        }

                        bufferRef.current.set(symbol, ticker)
                        hasUpdates = true
                    })

                    if (!hasUpdates) return

                    // Throttle updates
                    if (now - lastUpdateRef.current >= throttleMs) {
                        setData(new Map(bufferRef.current))
                        lastUpdateRef.current = now
                    } else if (!throttleTimerRef.current) {
                        throttleTimerRef.current = setTimeout(() => {
                            setData(new Map(bufferRef.current))
                            lastUpdateRef.current = Date.now()
                            throttleTimerRef.current = null
                        }, throttleMs - (now - lastUpdateRef.current))
                    }

                } catch (err) {
                    console.error('[Trade/Sync] WebSocket message parse error:', err)
                }
            }

            ws.onerror = (event) => {
                console.error('[Trade/Sync] WebSocket error:', event)
                setError(new Error('WebSocket connection error'))
            }

            ws.onclose = () => {
                setIsConnected(false)
                console.log('[Trade/Sync] WebSocket disconnected')

                // Auto-reconnect
                setTimeout(() => {
                    if (wsRef.current?.readyState !== WebSocket.OPEN) {
                        connect()
                    }
                }, 5000)
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to connect'))
        }
    }, [symbols, throttleMs]) // Re-connect logic doesn't depend on symbols for the socket URL anymore, but filter depends on it

    const reconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close()
        }
        connect()
    }, [connect])

    useEffect(() => {
        connect()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current)
            }
        }
    }, [connect])

    return { data, isConnected, error, reconnect }
}

// Simulated version for development without actual WebSocket

