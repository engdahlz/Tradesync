import {
    Sparkles,
    Brain,
    BookOpen,
    Wand2,
    Activity,
    Layers,
    ShieldCheck,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react'
import ChatInterface from '../components/advisor/ChatInterface'

const quickPrompts = [
    {
        title: 'Market Brief',
        desc: 'Sammanfatta dagens viktigaste rörelser och risker.',
        tag: 'Macro',
    },
    {
        title: 'Strategy Scan',
        desc: 'Identifiera 3 setups med hög sannolikhet.',
        tag: 'Signals',
    },
    {
        title: 'Risk Check',
        desc: 'Granska portföljen för koncentrationsrisk.',
        tag: 'Risk',
    },
    {
        title: 'Earnings Impact',
        desc: 'Vilka rapporter påverkar veckan mest?',
        tag: 'Events',
    },
]

const radarSignals = [
    { symbol: 'BTC', bias: 'Bullish', confidence: 0.72, change: +1.8 },
    { symbol: 'AAPL', bias: 'Neutral', confidence: 0.54, change: -0.2 },
    { symbol: 'TSLA', bias: 'Bearish', confidence: 0.67, change: -2.1 },
    { symbol: 'NVDA', bias: 'Bullish', confidence: 0.81, change: +3.4 },
]

const knowledgeHighlights = [
    { title: 'The Intelligent Investor', type: 'Value' },
    { title: 'Trading in the Zone', type: 'Psychology' },
    { title: 'Market Wizards', type: 'Interviews' },
    { title: 'Advances in Financial ML', type: 'Quant' },
]

export default function AICenter() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-medium text-foreground">AI Command Center</h1>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground border border-border">
                            Gemini 3 + RAG
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Centraliserad arbetsyta för analys, strategi och beslutstöd.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="google-pill-active flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Thinking: High
                    </span>
                    <span className="google-pill flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Safety: Guarded
                    </span>
                    <span className="google-pill flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Sources: 5,742
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main AI Workspace */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="m3-card overflow-hidden">
                        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-base font-medium text-foreground">AI Analyst</h2>
                                <p className="text-xs text-muted-foreground">Live research + grounded citations</p>
                            </div>
                            <div className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-ts-green" />
                                Online
                            </div>
                        </div>
                        <div className="h-[520px]">
                            <ChatInterface />
                        </div>
                    </div>

                    <div className="m3-card p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-primary" />
                                <h3 className="text-base font-medium text-foreground">Prompt Studio</h3>
                            </div>
                            <span className="text-xs text-muted-foreground">Snabbstart för återkommande analyser</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {quickPrompts.map((prompt) => (
                                <div key={prompt.title} className="border border-border rounded-xl p-4 bg-muted/40">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-foreground">{prompt.title}</h4>
                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {prompt.tag}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{prompt.desc}</p>
                                    <button className="mt-3 text-xs font-medium text-primary hover:underline">
                                        Använd prompt →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Context & Insights */}
                <div className="space-y-6">
                    <div className="m3-card p-6 space-y-3">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            <h3 className="text-base font-medium text-foreground">AI Brief</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Marknaden visar ökad riskaptit i tech medan makrodata pekar på fortsatt
                            försiktighet. Följ volatilitetsutbrott i index och USD‑styrka.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-ts-green" />
                            Uppdaterad för 12 min sedan
                        </div>
                    </div>

                    <div className="m3-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <h3 className="text-base font-medium text-foreground">Signal Radar</h3>
                        </div>
                        <div className="space-y-3">
                            {radarSignals.map((signal) => {
                                const isPositive = signal.change >= 0
                                return (
                                    <div key={signal.symbol} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{signal.symbol}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {signal.bias} • {Math.round(signal.confidence * 100)}%
                                            </p>
                                        </div>
                                        <div className={`text-xs flex items-center gap-1 ${isPositive ? 'text-ts-green' : 'text-ts-red'}`}>
                                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {isPositive ? '+' : ''}{signal.change.toFixed(1)}%
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="m3-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-primary" />
                            <h3 className="text-base font-medium text-foreground">Knowledge Base</h3>
                        </div>
                        <div className="space-y-3">
                            {knowledgeHighlights.map((item) => (
                                <div key={item.title} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.type}</p>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        Active
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
