import { useState, useEffect } from 'react'
import { TrendingUp, Plus, ArrowRight, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import MainChart from '../components/charts/MainChart'
import WatchlistGrid from '../components/widgets/WatchlistGrid'
import StrategyPerformance from '../components/widgets/StrategyPerformance'
import { useBinanceWebSocket } from '../hooks/useBinanceWebSocket'
import { fetchCryptoNews, NewsArticle } from '../services/newsApi'
import { Activity } from 'lucide-react'

const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT']

const MarketIndex = ({
    name,
    value,
    change,
    percent,
    isLoading = false
}: {
    name: string
    value: string
    change: string
    percent: string
    isLoading?: boolean
}) => {
    const isPos = percent.startsWith('+')
    return (
        <div className="flex flex-col min-w-[140px] p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border-r border-border/50 last:border-0">
            <span className="text-sm font-medium text-foreground">{name}</span>
            {isLoading ? (
                <div className="mt-1 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
            ) : (
                <>
                    <div className="mt-1 flex items-end gap-2">
                        <span className="text-base font-medium">{value}</span>
                        <span className={`text-xs font-medium flex items-center ${isPos ? 'text-ts-green' : 'text-ts-red'}`}>
                            {isPos ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {percent}
                        </span>
                    </div>
                    <span className={`text-xs ${isPos ? 'text-ts-green' : 'text-ts-red'} opacity-80`}>{change}</span>
                </>
            )}
        </div>
    )
}

function formatPrice(price: number): string {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    if (price >= 1) return `$${price.toFixed(2)}`
    return `$${price.toFixed(4)}`
}

function formatChange(change: number): string {
    const sign = change >= 0 ? '+' : ''
    if (Math.abs(change) >= 1000) return `${sign}${change.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    if (Math.abs(change) >= 1) return `${sign}${change.toFixed(2)}`
    return `${sign}${change.toFixed(4)}`
}

function formatPercent(percent: number): string {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
}

const SYMBOL_NAMES: Record<string, string> = {
    BTCUSDT: 'Bitcoin',
    ETHUSDT: 'Ethereum',
    SOLUSDT: 'Solana',
    XRPUSDT: 'Ripple',
}

export default function Dashboard() {
    const [selectedSymbol] = useState('BTCUSDT')
    const [news, setNews] = useState<NewsArticle[]>([])
    const [newsLoading, setNewsLoading] = useState(true)

    const { data: tickerData, isConnected } = useBinanceWebSocket({
        symbols: CRYPTO_SYMBOLS,
        throttleMs: 500,
    })

    useEffect(() => {
        async function loadNews() {
            try {
                setNewsLoading(true)
                const response = await fetchCryptoNews({ pageSize: 5 })
                setNews(response.articles.slice(0, 3))
            } catch (error) {
                console.error('Failed to fetch news:', error)
            } finally {
                setNewsLoading(false)
            }
        }
        loadNews()
    }, [])

    const btcData = tickerData.get('BTCUSDT')

    return (
        <div className="space-y-8">
            {/* 1. Market Strip (Live Crypto Prices) */}
            <div className="w-full overflow-x-auto pb-2">
                <div className="flex items-center min-w-max border border-border rounded-xl p-2 bg-card">
                    {/* TODO: Traditional indices (S&P 500, Nasdaq, Dow Jones, Gold) require
                        a different API (e.g., Alpha Vantage, Yahoo Finance, or Finnhub).
                        For now, showing only crypto which we can get from Binance. */}
                    {CRYPTO_SYMBOLS.map((symbol) => {
                        const data = tickerData.get(symbol)
                        const name = SYMBOL_NAMES[symbol] || symbol.replace('USDT', '')
                        
                        if (!data) {
                            return (
                                <MarketIndex
                                    key={symbol}
                                    name={name}
                                    value="--"
                                    change="--"
                                    percent="+0.00%"
                                    isLoading={!isConnected}
                                />
                            )
                        }

                        return (
                            <MarketIndex
                                key={symbol}
                                name={name}
                                value={formatPrice(data.price)}
                                change={formatChange(data.priceChange)}
                                percent={formatPercent(data.priceChangePercent)}
                            />
                        )
                    })}
                </div>
            </div>

            {/* 2. Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Compare Markets Chart */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-normal text-foreground">Compare Markets</h2>
                        <div className="flex gap-2">
                            {['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'].map(tf => (
                                <button key={tf} className={tf === '1M' ? 'google-pill-active' : 'google-pill'}>
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Chart Card */}
                    <div className="m3-card p-6 h-[300px] lg:h-[400px] relative">
                        <div className="absolute top-6 left-6 z-10">
                            <h3 className="text-2xl font-normal mb-1">
                                {SYMBOL_NAMES[selectedSymbol] || selectedSymbol}
                            </h3>
                            <div className="flex items-center gap-2">
                                {btcData ? (
                                    <>
                                        <span className="text-3xl font-medium">{formatPrice(btcData.price)}</span>
                                        <span className={`flex items-center font-medium ${btcData.priceChangePercent >= 0 ? 'text-ts-green' : 'text-ts-red'}`}>
                                            {btcData.priceChangePercent >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                            {formatPercent(btcData.priceChangePercent)}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        <span className="text-muted-foreground">Loading price...</span>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Chart Placeholder / Component */}
                        <div className="h-full pt-16">
                            <MainChart symbol={selectedSymbol} />
                        </div>
                    </div>

                    {/* Today's financial news - Real data from newsApi.ts */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-normal text-foreground">Today's financial news</h2>
                            <button className="text-primary text-sm font-medium hover:underline">Top stories</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {newsLoading ? (
                                <>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className={`m3-card p-4 animate-pulse ${i === 1 ? 'md:col-span-2' : ''}`}>
                                            <div className="h-3 bg-muted rounded w-24 mb-3" />
                                            <div className="h-5 bg-muted rounded w-full mb-2" />
                                            <div className="h-5 bg-muted rounded w-3/4" />
                                        </div>
                                    ))}
                                </>
                            ) : news.length === 0 ? (
                                <div className="md:col-span-3 m3-card p-6 text-center text-muted-foreground">
                                    No news available at the moment
                                </div>
                            ) : (
                                <>
                                    {news.map((article, index) => (
                                        <a
                                            key={article.id}
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`m3-card p-4 hover:shadow-md transition-shadow cursor-pointer group flex flex-col ${index === 0 ? 'md:col-span-2' : ''}`}
                                        >
                                            <div className="text-xs text-muted-foreground mb-2">
                                                {article.source} • {article.relativeTime}
                                            </div>
                                            <h3 className={`font-medium ${index === 0 ? 'text-lg' : 'text-base'} mb-2 group-hover:text-primary transition-colors flex-1 line-clamp-2`}>
                                                {article.title}
                                            </h3>
                                            <div className="flex gap-2 mt-3">
                                                {article.sentiment && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                        article.sentiment === 'bullish' 
                                                            ? 'text-ts-green bg-ts-green/10'
                                                            : article.sentiment === 'bearish'
                                                            ? 'text-ts-red bg-ts-red/10'
                                                            : 'text-muted-foreground bg-muted'
                                                    }`}>
                                                        {article.sentiment}
                                                    </span>
                                                )}
                                                {article.topics?.slice(0, 1).map((topic) => (
                                                    <span
                                                        key={topic.topic}
                                                        className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider"
                                                    >
                                                        {topic.topic.replace('Financial Markets', 'Market').replace('Blockchain', 'Crypto')}
                                                    </span>
                                                ))}
                                            </div>
                                        </a>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Watchlist */}
                <div className="space-y-6">
                    {/* Strategy Performance Widget */}
                    <StrategyPerformance />

                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-normal text-foreground">Your Watchlist</h2>
                        <button className="p-1.5 hover:bg-secondary rounded-full text-primary">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="m3-card overflow-hidden">
                        <div className="p-0">
                            {/* Watchlist Header */}
                            <div className="grid grid-cols-3 px-4 py-2 border-b border-border bg-secondary/30 text-xs font-medium text-muted-foreground">
                                <span>Symbol</span>
                                <span className="text-right">Price</span>
                                <span className="text-right">Change</span>
                            </div>
                            {/* We can reuse WatchlistGrid logic but style it as a list */}
                            <div className="divide-y divide-border">
                                <WatchlistGrid />
                            </div>
                        </div>
                        <button className="w-full py-3 text-sm text-primary font-medium hover:bg-secondary/50 transition-colors border-t border-border">
                            View all watchlists
                        </button>
                    </div>

                    {/* Discover More */}
                    <div className="m3-card p-4">
                        <h3 className="font-medium mb-4">Discover more</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium group-hover:text-primary transition-colors">Market Movers</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-ts-green/10 flex items-center justify-center text-ts-green">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium group-hover:text-primary transition-colors">Crypto Trends</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
