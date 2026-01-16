import { useState } from 'react'
import { TrendingUp, Plus, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import MainChart from '../components/charts/MainChart'
import WatchlistGrid from '../components/widgets/WatchlistGrid'

// Helper for index strip
const MarketIndex = ({ name, value, change, percent }: { name: string, value: string, change: string, percent: string }) => {
    const isPos = percent.startsWith('+');
    return (
        <div className="flex flex-col min-w-[140px] p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border-r border-border/50 last:border-0">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <div className="mt-1 flex items-end gap-2">
                <span className="text-base font-medium">{value}</span>
                <span className={`text-xs font-medium flex items-center ${isPos ? 'text-ts-green' : 'text-ts-red'}`}>
                    {isPos ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                    {percent}
                </span>
            </div>
            <span className={`text-xs ${isPos ? 'text-ts-green' : 'text-ts-red'} opacity-80`}>{change}</span>
        </div>
    )
}

export default function Dashboard() {
    const [selectedSymbol] = useState('BTCUSDT')

    return (
        <div className="space-y-8">
            {/* 1. Market Strip (Indices) */}
            <div className="w-full overflow-x-auto pb-2">
                <div className="flex items-center min-w-max border border-border rounded-xl p-2 bg-card">
                    <MarketIndex name="S&P 500" value="4,783.45" change="+12.30" percent="+0.26%" />
                    <MarketIndex name="Nasdaq" value="15,055.65" change="+54.80" percent="+0.37%" />
                    <MarketIndex name="Dow Jones" value="37,592.98" change="-118.00" percent="-0.31%" />
                    <MarketIndex name="Bitcoin" value="$46,230.00" change="+1,200.00" percent="+2.65%" />
                    <MarketIndex name="Ethereum" value="$2,650.00" change="+85.00" percent="+3.31%" />
                    <MarketIndex name="Gold" value="$2,045.00" change="+15.00" percent="+0.75%" />
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
                                <button key={tf} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${tf === '1M' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}>
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Chart Card */}
                    <div className="m3-card p-6 h-[400px] relative">
                        <div className="absolute top-6 left-6 z-10">
                            <h3 className="text-2xl font-normal mb-1">{selectedSymbol === 'BTCUSDT' ? 'Bitcoin' : selectedSymbol}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-medium">$46,230.00</span>
                                <span className="flex items-center text-ts-green font-medium">
                                    <ArrowUpRight className="w-5 h-5" />
                                    2.65%
                                </span>
                            </div>
                        </div>
                        {/* Chart Placeholder / Component */}
                        <div className="h-full pt-16">
                            <MainChart symbol={selectedSymbol} />
                        </div>
                    </div>

                    {/* "Today's financial news" (Placeholder for News Section) */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-normal text-foreground">Today's financial news</h2>
                            <button className="text-primary text-sm font-medium hover:underline">Top stories</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* We can re-integrate NewsCard here later, keeping it simple for now */}
                            <div className="m3-card p-4">
                                <div className="text-xs text-muted-foreground mb-2">Reuters • 2 hours ago</div>
                                <h3 className="font-medium mb-2">Bitcoin surges past $46k as ETF volume spikes</h3>
                                <div className="flex gap-2 mt-3">
                                    <span className="text-xs font-medium text-ts-green bg-ts-green/10 px-2 py-0.5 rounded">BTC</span>
                                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">Market</span>
                                </div>
                            </div>
                            <div className="m3-card p-4">
                                <div className="text-xs text-muted-foreground mb-2">CoinDesk • 4 hours ago</div>
                                <h3 className="font-medium mb-2">Ethereum Dencun upgrade date confirmed by developers</h3>
                                <div className="flex gap-2 mt-3">
                                    <span className="text-xs font-medium text-ts-green bg-ts-green/10 px-2 py-0.5 rounded">ETH</span>
                                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">Tech</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Watchlist */}
                <div className="space-y-6">
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

// Re-import missing icon for bottom section
import { Activity } from 'lucide-react'
