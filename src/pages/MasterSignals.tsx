import { useState, useEffect } from 'react'
import { Zap, TrendingUp, TrendingDown, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { suggestStrategy } from '@/services/api'
import { fetchHistoricalData } from '@/services/priceData'
import { fetchTopAssets, toBinanceSymbol } from '@/services/assetApi'

interface Signal {
    id: string
    symbol: string
    action: 'BUY' | 'SELL' | 'HOLD'
    strategy: string
    reasoning: string
    confidence: number
    timestamp: string
    status: 'active' | 'executed' | 'expired'
    indicators?: {
        rsi: number
        macd: { histogram: number }
    }
}

export default function MasterSignals() {
    const [signals, setSignals] = useState<Signal[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [currentSymbol, setCurrentSymbol] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [symbolsToAnalyze, setSymbolsToAnalyze] = useState<string[]>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])

    useEffect(() => {
        const loadAssets = async () => {
            try {
                const assets = await fetchTopAssets(3)
                setSymbolsToAnalyze(assets.map(a => toBinanceSymbol(a.symbol)))
            } catch (e) {
                console.error('Failed to load top assets for analysis', e)
            }
        }
        loadAssets()
    }, [])

    const runAnalysis = async () => {
        setIsAnalyzing(true)
        setError(null)
        const newSignals: Signal[] = []

        try {
            for (const symbol of symbolsToAnalyze) {
                setCurrentSymbol(symbol)

                // Fetch real price data from Binance
                const priceData = await fetchHistoricalData({
                    symbol,
                    interval: '1h',
                    limit: 100,
                })

                const prices = priceData.map(d => d.close)
                const highs = priceData.map(d => d.high)
                const lows = priceData.map(d => d.low)

                // Call real suggestStrategy API
                const result = await suggestStrategy({
                    symbol,
                    prices,
                    highs,
                    lows,
                    closes: prices,
                })

                // Determine action based on signals
                let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
                let reasoning = result.aiAnalysis

                if (result.signals.length > 0) {
                    const bestSignal = result.signals.reduce((a, b) => a.strength > b.strength ? a : b)
                    action = bestSignal.direction === 'buy' ? 'BUY' : bestSignal.direction === 'sell' ? 'SELL' : 'HOLD'
                    reasoning = bestSignal.reasoning
                }

                newSignals.push({
                    id: symbol,
                    symbol,
                    action,
                    strategy: result.recommendedStrategy === 'mean_reversion' ? 'Mean Reversion' :
                        result.recommendedStrategy === 'momentum' ? 'Momentum' :
                            result.recommendedStrategy === 'pattern_recognition' ? 'Pattern Recognition' : 'Hold',
                    reasoning,
                    confidence: Math.round(result.confidence * 100),
                    timestamp: 'Just now',
                    status: 'active',
                    indicators: {
                        rsi: result.technicalIndicators.rsi,
                        macd: { histogram: result.technicalIndicators.macd.histogram },
                    },
                })
            }

            setSignals(newSignals)
            setCurrentSymbol(null)
        } catch (err) {
            console.error('Analysis failed:', err)
            setError('Failed to analyze markets. Please try again.')
        } finally {
            setIsAnalyzing(false)
            setCurrentSymbol(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <Zap className="w-7 h-7 text-ts-yellow" />
                        Master Signals
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        AI-powered trading signals using real-time Binance data + Gemini AI
                    </p>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing {currentSymbol || '...'}
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Run AI Analysis
                        </>
                    )}
                </button>
            </div>

            {/* Strategy Overview */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-ts-blue/10 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-ts-blue" />
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground">Mean Reversion</h4>
                            <p className="text-xs text-muted-foreground">RSI + Bollinger Bands</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Identifies oversold conditions using RSI(14) &lt; 30 combined with price below lower Bollinger Band.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-ts-green/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-ts-green" />
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground">Momentum</h4>
                            <p className="text-xs text-muted-foreground">MACD + ADX</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Detects strong trends using MACD crossovers confirmed by ADX &gt; 25 for trend strength.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-ts-purple/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-ts-purple" />
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground">Pattern Recognition</h4>
                            <p className="text-xs text-muted-foreground">Candlestick Analysis</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Identifies "Three White Soldiers" and other bullish/bearish candlestick patterns.
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 glass-card border-l-4 border-ts-red">
                    <p className="text-sm text-ts-red">{error}</p>
                </div>
            )}

            {/* Empty State */}
            {signals.length === 0 && !isAnalyzing && (
                <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
                    <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No signals generated yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Click "Run AI Analysis" to analyze BTC, ETH, and SOL using real-time market data and Gemini AI.
                    </p>
                </div>
            )}

            {/* Signals List */}
            {signals.length > 0 && (
                <div className="bg-card border border-border rounded-lg shadow-sm">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Active Signals</h3>
                        <span className="text-xs text-muted-foreground">Powered by Gemini 2.0 Flash</span>
                    </div>
                    <div className="divide-y divide-border">
                        {signals.map((signal) => (
                            <div
                                key={signal.id}
                                className="p-5 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${signal.action === 'BUY'
                                                ? 'bg-ts-green/20'
                                                : signal.action === 'SELL'
                                                    ? 'bg-ts-red/20'
                                                    : 'bg-slate-700/30'
                                                }`}
                                        >
                                            {signal.action === 'BUY' ? (
                                                <TrendingUp className="w-6 h-6 text-ts-green" />
                                            ) : signal.action === 'SELL' ? (
                                                <TrendingDown className="w-6 h-6 text-ts-red" />
                                            ) : (
                                                <AlertTriangle className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-semibold text-foreground">{signal.symbol}</h4>
                                                <span
                                                    className={`badge ${signal.action === 'BUY' ? 'badge-green' :
                                                        signal.action === 'SELL' ? 'badge-red' : 'badge-yellow'
                                                        }`}
                                                >
                                                    {signal.action}
                                                </span>
                                                <span className="badge badge-yellow">{signal.strategy}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground max-w-xl">
                                                {signal.reasoning}
                                            </p>
                                            {signal.indicators && (
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="text-xs text-slate-500">
                                                        RSI: <span className={signal.indicators.rsi < 30 ? 'text-ts-green' : signal.indicators.rsi > 70 ? 'text-ts-red' : 'text-slate-300'}>
                                                            {signal.indicators.rsi.toFixed(1)}
                                                        </span>
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        MACD: <span className={signal.indicators.macd.histogram > 0 ? 'text-ts-green' : 'text-ts-red'}>
                                                            {signal.indicators.macd.histogram > 0 ? '+' : ''}{signal.indicators.macd.histogram.toFixed(2)}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-2 mb-2">
                                            {signal.status === 'active' && (
                                                <span className="flex items-center gap-1 text-xs text-ts-green">
                                                    <div className="w-2 h-2 rounded-full bg-ts-green animate-pulse" />
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Confidence:</span>
                                            <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${signal.confidence >= 70 ? 'bg-ts-green' :
                                                        signal.confidence >= 50 ? 'bg-ts-yellow' : 'bg-ts-red'
                                                        }`}
                                                    style={{ width: `${signal.confidence}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-medium ${signal.confidence >= 70 ? 'text-ts-green' :
                                                signal.confidence >= 50 ? 'text-ts-yellow' : 'text-ts-red'
                                                }`}>
                                                {signal.confidence}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{signal.timestamp}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
