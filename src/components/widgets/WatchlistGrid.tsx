import { useState, useEffect } from 'react'
import { useBinanceWebSocket } from '../../hooks/useBinanceWebSocket'
import CryptoCard from './CryptoCard'
import { fetchTopAssets, toBinanceSymbol } from '@/services/assetApi'
import { Loader2 } from 'lucide-react'

export default function WatchlistGrid() {
    const [symbols, setSymbols] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Load top assets from CoinCap
    useEffect(() => {
        const loadAssets = async () => {
            try {
                // Fetch top 6 assets
                const assets = await fetchTopAssets(6)
                const binanceSymbols = assets.map(a => toBinanceSymbol(a.symbol))
                setSymbols(binanceSymbols)
            } catch (err) {
                console.error('Failed to load watchlist assets:', err)
                // Fallback to defaults if API fails
                setSymbols(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'])
            } finally {
                setIsLoading(false)
            }
        }
        loadAssets()
    }, [])

    // specific symbols are filtered in the hook efficiently now
    const { data } = useBinanceWebSocket({ symbols })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-ts-blue animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {symbols.map((symbol) => {
                const ticker = data.get(symbol)

                return (
                    <CryptoCard
                        key={symbol}
                        symbol={symbol}
                        price={ticker?.price || 0}
                        priceChangePercent={ticker?.priceChangePercent || 0}
                        flashDirection={ticker?.flashDirection || null}
                    />
                )
            })}
        </div>
    )
}
