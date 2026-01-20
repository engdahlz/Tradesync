import { useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { executeTrade, type TradeResponse } from '../../services/tradeApi'

interface TradeModalProps {
    isOpen: boolean
    onClose: () => void
    defaultSymbol?: string
}

export default function TradeModal({ isOpen, onClose, defaultSymbol = 'BTCUSDT' }: TradeModalProps) {
    const [symbol, setSymbol] = useState(defaultSymbol)
    const [side, setSide] = useState<'buy' | 'sell'>('buy')
    const [quantity, setQuantity] = useState('')
    const [isLive, setIsLive] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<TradeResponse | null>(null)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            // Basic validation
            if (!symbol || !quantity) throw new Error('Symbol and Quantity are required')

            const data = await executeTrade({
                symbol: symbol.toUpperCase(),
                side,
                quantity: Number(quantity),
                orderType: 'market',
                isDryRun: !isLive
            })
            
            setResult(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1e293b] border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Execute Trade</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Live Mode Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <span className="text-sm font-medium text-slate-300">Trading Mode</span>
                        <button
                            type="button"
                            onClick={() => setIsLive(!isLive)}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                                isLive ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/50'
                            }`}
                        >
                            {isLive ? '🔴 LIVE (REAL MONEY)' : '🟢 PAPER (SIMULATION)'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Symbol</label>
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-ts-blue"
                                placeholder="BTCUSDT"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Side</label>
                            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setSide('buy')}
                                    className={`flex-1 text-sm font-medium py-1 rounded ${side === 'buy' ? 'bg-ts-green text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSide('sell')}
                                    className={`flex-1 text-sm font-medium py-1 rounded ${side === 'sell' ? 'bg-ts-red text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Sell
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                        <input
                            type="number"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-ts-blue"
                            placeholder="0.00"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
                            <p className="text-green-400 font-medium mb-1">Trade Executed!</p>
                            <div className="text-slate-300 text-xs space-y-1">
                                <p>Order ID: {result.orderId}</p>
                                <p>Status: {result.status}</p>
                                <p>Mode: {result.mode}</p>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                            loading ? 'bg-slate-700 cursor-not-allowed' :
                            side === 'buy' ? 'bg-ts-green hover:bg-emerald-600 shadow-lg shadow-ts-green/20' : 'bg-ts-red hover:bg-rose-600 shadow-lg shadow-ts-red/20'
                        }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            `${side.toUpperCase()} ${symbol}`
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
