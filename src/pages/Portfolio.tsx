import { useState, useEffect, useCallback } from 'react'
import {
    Wallet,
    TrendingUp,
    PieChart,
    Plus,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    AlertCircle,
    RefreshCw,
    Info,
} from 'lucide-react'
import { generateBacktestReport } from '../utils/backtestReport'
import TradeModal from '../components/widgets/TradeModal'
import { fetchCurrentPrice, fetch24hChange } from '@/services/priceData'
import { fetchOrders, calculatePositions, calculateStats as calcPositionStats } from '@/services/portfolio'
import { useAuth } from '@/contexts/AuthContext'

interface Holding {
    symbol: string
    name: string
    amount: number
    avgPrice: number
    currentPrice: number
    value: number
    pnl: number
    pnlPercent: number
    allocation: number
}

interface PortfolioStats {
    totalValue: number
    totalPnl: number
    totalPnlPercent: number
    dayChange: number
    dayChangePercent: number
}

// Demo holdings - shown when no real orders exist (paper trading starting point)
const DEMO_HOLDINGS: Omit<Holding, 'currentPrice' | 'value' | 'pnl' | 'pnlPercent' | 'allocation'>[] = [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0.5, avgPrice: 62000 },
    { symbol: 'ETH', name: 'Ethereum', amount: 5, avgPrice: 3200 },
    { symbol: 'SOL', name: 'Solana', amount: 50, avgPrice: 130 },
]

// Symbol names mapping
const SYMBOL_NAMES: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    XRP: 'Ripple',
    ADA: 'Cardano',
    DOGE: 'Dogecoin',
    DOT: 'Polkadot',
    LINK: 'Chainlink',
}

async function calculate24hPortfolioChange(
    holdings: Holding[]
): Promise<{ dayChange: number; dayChangePercent: number }> {
    if (holdings.length === 0) {
        return { dayChange: 0, dayChangePercent: 0 }
    }

    let totalDayChange = 0
    let totalValue = 0

    for (const holding of holdings) {
        try {
            const change24h = await fetch24hChange(holding.symbol)
            const valueYesterday = holding.value / (1 + change24h.priceChangePercent / 100)
            const dayChangeForHolding = holding.value - valueYesterday
            totalDayChange += dayChangeForHolding
            totalValue += holding.value
        } catch {
            totalValue += holding.value
        }
    }

    const dayChangePercent = totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0

    return {
        dayChange: totalDayChange,
        dayChangePercent: isNaN(dayChangePercent) ? 0 : dayChangePercent,
    }
}

export default function Portfolio() {
    const { user } = useAuth()
    const [holdings, setHoldings] = useState<Holding[]>([])
    const [stats, setStats] = useState<PortfolioStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [usingDemoData, setUsingDemoData] = useState(false)
    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false)

    const loadPortfolio = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const userId = user?.uid || 'demo-user'
            const orders = await fetchOrders(userId)

            if (orders.length > 0) {
                const positions = await calculatePositions(orders)
                const posStats = calcPositionStats(positions)

                const holdingsFromOrders: Holding[] = positions.map(p => ({
                    symbol: p.symbol,
                    name: SYMBOL_NAMES[p.symbol] || p.symbol,
                    amount: p.amount,
                    avgPrice: p.avgPrice,
                    currentPrice: p.currentPrice,
                    value: p.value,
                    pnl: p.pnl,
                    pnlPercent: p.pnlPercent,
                    allocation: p.allocation,
                }))

                const dayChangeData = await calculate24hPortfolioChange(holdingsFromOrders)

                setHoldings(holdingsFromOrders)
                setStats({
                    totalValue: posStats.totalValue,
                    totalPnl: posStats.totalPnl,
                    totalPnlPercent: posStats.totalPnlPercent,
                    dayChange: dayChangeData.dayChange,
                    dayChangePercent: dayChangeData.dayChangePercent,
                })
                setUsingDemoData(false)
            } else {
                const holdingsWithPrices: Holding[] = []
                let totalValue = 0
                let totalCost = 0

                for (const holding of DEMO_HOLDINGS) {
                    try {
                        const currentPrice = await fetchCurrentPrice(holding.symbol)
                        const value = holding.amount * currentPrice
                        const cost = holding.amount * holding.avgPrice
                        const pnl = value - cost
                        const pnlPercent = (pnl / cost) * 100

                        holdingsWithPrices.push({
                            ...holding,
                            currentPrice,
                            value,
                            pnl,
                            pnlPercent,
                            allocation: 0,
                        })

                        totalValue += value
                        totalCost += cost
                    } catch (e) {
                        console.error(`Failed to fetch price for ${holding.symbol}:`, e)
                    }
                }

                holdingsWithPrices.forEach(h => {
                    h.allocation = (h.value / totalValue) * 100
                })

                const totalPnl = totalValue - totalCost
                const totalPnlPercent = (totalPnl / totalCost) * 100

                const dayChangeData = await calculate24hPortfolioChange(holdingsWithPrices)

                setHoldings(holdingsWithPrices.sort((a, b) => b.value - a.value))
                setStats({
                    totalValue,
                    totalPnl,
                    totalPnlPercent,
                    dayChange: dayChangeData.dayChange,
                    dayChangePercent: dayChangeData.dayChangePercent,
                })
                setUsingDemoData(true)
            }

            setLastUpdate(new Date())
        } catch (err) {
            console.error('Failed to load portfolio:', err)
            setError('Failed to load portfolio data. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [user?.uid])

    useEffect(() => {
        loadPortfolio()
        // Refresh every 30 seconds
        const interval = setInterval(loadPortfolio, 30000)
        return () => clearInterval(interval)
    }, [loadPortfolio])

    const handleGenerateReport = async () => {
        if (!stats) return
        setIsGenerating(true)
        try {
            await generateBacktestReport(holdings, stats, [])
        } finally {
            setIsGenerating(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-ts-purple animate-spin" />
                    <p className="text-sm text-slate-400">Loading portfolio with live prices...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-ts-red" />
                    <p className="text-sm text-slate-400">{error}</p>
                    <button onClick={loadPortfolio} className="btn-secondary flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Demo Notice */}
            {usingDemoData && (
                <div className="p-4 glass-card border-l-4 border-ts-yellow flex items-start gap-3">
                    <Info className="w-5 h-5 text-ts-yellow flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-slate-300">
                            <strong className="text-white">Demo Mode:</strong> Showing sample positions with{' '}
                            <strong className="text-ts-green">live Binance prices</strong>.
                            Connect to a real exchange or use the Execute Trade API to track actual positions.
                        </p>
                        {lastUpdate && (
                            <p className="text-xs text-slate-500 mt-1">
                                Last updated: {lastUpdate.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Wallet className="w-7 h-7 text-ts-purple" />
                        Portfolio
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your holdings with real-time prices
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadPortfolio}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {isGenerating ? 'Generating...' : 'Backtest Report'}
                    </button>
                    <button
                        onClick={() => setIsTradeModalOpen(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Execute Trade
                    </button>
                </div>
            </div>

            <TradeModal
                isOpen={isTradeModalOpen}
                onClose={() => {
                    setIsTradeModalOpen(false)
                    loadPortfolio() // Refresh after trade
                }}
            />

            {/* Portfolio Overview */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2 glass-card p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400 mb-1">Total Portfolio Value</p>
                                <p className="text-4xl font-bold text-white">
                                    ${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className={`flex items-center gap-1 ${stats.totalPnl >= 0 ? 'text-ts-green' : 'text-ts-red'}`}>
                                        {stats.totalPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                        <span className="font-medium">
                                            {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-sm">({stats.totalPnlPercent.toFixed(1)}%)</span>
                                    </span>
                                    <span className="text-sm text-slate-500">All time</span>
                                </div>
                            </div>
                            <div className={`w-24 h-24 rounded-full border-4 ${stats.totalPnlPercent >= 0 ? 'border-ts-green' : 'border-ts-red'} flex items-center justify-center`}>
                                <div className="text-center">
                                    <p className={`text-2xl font-bold ${stats.totalPnlPercent >= 0 ? 'text-ts-green' : 'text-ts-red'}`}>
                                        {stats.totalPnlPercent >= 0 ? '+' : ''}{stats.totalPnlPercent.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-slate-400">ROI</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-ts-green/20 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-ts-green" />
                            </div>
                            <span className="text-sm text-slate-400">24h Change</span>
                        </div>
                        <p className="text-2xl font-bold text-ts-green">
                            +${stats.dayChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-ts-green">+{stats.dayChangePercent.toFixed(1)}%</p>
                    </div>

                    <div className="glass-card p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-ts-purple/20 flex items-center justify-center">
                                <PieChart className="w-5 h-5 text-ts-purple" />
                            </div>
                            <span className="text-sm text-slate-400">Assets</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{holdings.length}</p>
                        <p className="text-sm text-slate-400">Active positions</p>
                    </div>
                </div>
            )}

            {/* Holdings Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Holdings</h3>
                    <span className="text-xs text-ts-green flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-ts-green animate-pulse" />
                        Live prices
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-700/30">
                                <th className="px-5 py-3 font-medium">Asset</th>
                                <th className="px-5 py-3 font-medium">Amount</th>
                                <th className="px-5 py-3 font-medium">Avg Price</th>
                                <th className="px-5 py-3 font-medium">Current Price</th>
                                <th className="px-5 py-3 font-medium">Value</th>
                                <th className="px-5 py-3 font-medium">P&L</th>
                                <th className="px-5 py-3 font-medium">Allocation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map((holding) => (
                                <tr
                                    key={holding.symbol}
                                    className="border-b border-slate-700/20 hover:bg-ts-bg-light/30 transition-colors"
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-ts-yellow flex items-center justify-center">
                                                <span className="text-xs font-bold text-ts-bg">
                                                    {holding.symbol.charAt(0)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{holding.symbol}</p>
                                                <p className="text-xs text-slate-400">{holding.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-white font-mono">
                                        {holding.amount.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-slate-400 font-mono">
                                        ${holding.avgPrice.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-white font-mono">
                                        ${holding.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-5 py-4 text-white font-mono font-medium">
                                        ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {holding.pnl >= 0 ? (
                                                <ArrowUpRight className="w-4 h-4 text-ts-green" />
                                            ) : (
                                                <ArrowDownRight className="w-4 h-4 text-ts-red" />
                                            )}
                                            <span
                                                className={`font-mono font-medium ${holding.pnl >= 0 ? 'text-ts-green' : 'text-ts-red'}`}
                                            >
                                                {holding.pnl >= 0 ? '+' : ''}${holding.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                            <span
                                                className={`text-xs ${holding.pnl >= 0 ? 'text-ts-green' : 'text-ts-red'}`}
                                            >
                                                ({holding.pnlPercent.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-ts-purple rounded-full"
                                                    style={{ width: `${holding.allocation}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">{holding.allocation.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
