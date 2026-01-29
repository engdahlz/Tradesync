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
    Zap,
    Database,
    Radar,
    Target,
    Clock,
} from 'lucide-react'
import ChatInterface from '../components/advisor/ChatInterface'
import LiveVoiceAssistant from '../components/voice/LiveVoiceAssistant'

const quickPrompts = [
    {
        title: 'Market Brief',
        desc: 'Sammanfatta dagens viktigaste rörelser och risker.',
        tag: 'Macro',
    },
    {
        title: 'Strategy Scan',
        desc: 'Identifiera tre setups med hög sannolikhet.',
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

const memoryHighlights = [
    { title: 'Riskprofil', detail: 'Måttlig, max 2% per trade' },
    { title: 'Fokus', detail: 'Large cap + momentum' },
    { title: 'Watchlist', detail: 'NVDA, MSFT, BTC' },
]

const toolTrace = [
    { title: 'Market Pulse', detail: 'Live priser + volym', status: 'live' },
    { title: 'RAG Retrieval', detail: 'Bokkapitel + research', status: 'live' },
    { title: 'Memory Recall', detail: 'Preferenser + historik', status: 'ready' },
    { title: 'Scenario Stress', detail: 'Risk + drawdown', status: 'queued' },
]

const aiMetrics = [
    { label: 'Model', value: 'Gemini 3 Pro', detail: 'Long-context reasoning' },
    { label: 'Grounding', value: '5,742 chunks', detail: 'Böcker + research' },
    { label: 'Memory', value: 'Persistent', detail: 'Preferensdrivet' },
    { label: 'Pipeline', value: 'Streaming', detail: 'Tool trace live' },
]

export default function AICenter() {
    const statusStyles: Record<string, { dot: string; text: string; label: string }> = {
        live: { dot: 'bg-ts-green', text: 'text-ts-green', label: 'Live' },
        ready: { dot: 'bg-ts-blue', text: 'text-ts-blue', label: 'Ready' },
        queued: { dot: 'bg-ts-yellow', text: 'text-ts-yellow', label: 'Queued' },
    }

    return (
        <div className="ai-backdrop space-y-8">
            <section className="ai-hero p-6 md:p-8 reveal-up">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="ai-orb w-11 h-11">
                                <Sparkles className="w-5 h-5 text-ai" />
                            </div>
                            <span className="ai-chip ai-chip-strong">
                                AI Center
                            </span>
                            <span className="ai-chip">
                                Gemini 3 + RAG
                            </span>
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-display tracking-tight text-foreground">
                                AI Command Center
                            </h1>
                            <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl">
                                Centraliserad arbetsyta för analys, strategi och beslutstöd med spårbara källor,
                                minne och live marknadsdata.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="ai-chip">
                                <Brain className="w-3.5 h-3.5" />
                                Thinking: High
                            </span>
                            <span className="ai-chip">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Safety: Guarded
                            </span>
                            <span className="ai-chip">
                                <Layers className="w-3.5 h-3.5" />
                                Sources: 5,742
                            </span>
                            <span className="ai-chip">
                                <Activity className="w-3.5 h-3.5" />
                                Signals: Live
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-[560px]">
                        {aiMetrics.map((metric) => (
                            <div key={metric.label} className="ai-metric">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    {metric.label}
                                </p>
                                <p className="text-sm font-semibold text-foreground mt-1">
                                    {metric.value}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    {metric.detail}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
                <div className="space-y-6">
                    <section className="ai-panel overflow-hidden reveal-up" style={{ animationDelay: '0.05s' }}>
                        <div className="border-b border-border px-6 py-4 flex items-center gap-3 bg-white/70">
                            <div className="ai-orb w-10 h-10">
                                <Brain className="w-5 h-5 text-ai" />
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
                        <div className="h-[560px] md:h-[620px] bg-surface-1">
                            <ChatInterface />
                        </div>
                        <div className="px-6 py-3 border-t border-border bg-white/70 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-ai" />
                                Streamad analys med tool trace
                            </div>
                            <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-ai" />
                                RAG + privat dataanslutning
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-ai" />
                                Sessionsminne aktivt
                            </div>
                        </div>
                    </section>

                    <section className="ai-panel p-6 space-y-4 reveal-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-ai" />
                                <h3 className="text-base font-medium text-foreground">Prompt Studio</h3>
                            </div>
                            <span className="text-xs text-muted-foreground">Snabbstart för återkommande analyser</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {quickPrompts.map((prompt) => (
                                <div key={prompt.title} className="ai-tile">
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
                    </section>

                    <section className="ai-panel p-6 space-y-4 reveal-up" style={{ animationDelay: '0.15s' }}>
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-ai" />
                            <h3 className="text-base font-medium text-foreground">Decision Canvas</h3>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            Kombinera scenarioanalys, riskramverk och signaler i en sammanhängande beslutsvy.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { title: 'Scenario', desc: 'Bull, base, bear med volatilitet.' },
                                { title: 'Risk Lens', desc: 'Max drawdown + position sizing.' },
                                { title: 'Confidence', desc: 'AI-självförtroende + källor.' },
                            ].map((item) => (
                                <div key={item.title} className="ai-tile">
                                    <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                                    <p className="text-xs text-muted-foreground mt-2">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <LiveVoiceAssistant />

                    <section className="ai-panel p-6 space-y-3 reveal-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-ai" />
                            <h3 className="text-base font-medium text-foreground">AI Brief</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Tech visar fortsatt riskaptit medan makrodata signalerar försiktighet. Följ
                            volatilitetsutbrott i index, USD‑styrka och oväntade rapportöverraskningar.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-ts-green" />
                            Uppdaterad för 12 min sedan
                        </div>
                    </section>

                    <section className="ai-panel p-6 space-y-4 reveal-up" style={{ animationDelay: '0.14s' }}>
                        <div className="flex items-center gap-2">
                            <Radar className="w-5 h-5 text-ai" />
                            <h3 className="text-base font-medium text-foreground">Tool Trace</h3>
                        </div>
                        <div className="space-y-3">
                            {toolTrace.map((step) => {
                                const style = statusStyles[step.status] || statusStyles.live
                                return (
                                    <div key={step.title} className="flex items-start gap-3">
                                        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full ${style.dot}`} />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-foreground">{step.title}</p>
                                                <span className={`text-[10px] uppercase tracking-wide ${style.text}`}>
                                                    {style.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{step.detail}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    <section className="ai-panel p-6 reveal-up" style={{ animationDelay: '0.18s' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-ai" />
                            <h3 className="text-base font-medium text-foreground">Signal Radar</h3>
                        </div>
                        <div className="space-y-3">
                            {radarSignals.map((signal) => {
                                const isPositive = signal.change >= 0
                                return (
                                    <div key={signal.symbol} className="flex items-center justify-between border border-border rounded-xl px-3 py-2 bg-white/70">
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
                    </section>

                    <section className="ai-panel p-6 space-y-4 reveal-up" style={{ animationDelay: '0.22s' }}>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-ai" />
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
                        <div className="border-t border-border pt-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-ai" />
                                <p className="text-sm font-medium text-foreground">Memory Snapshots</p>
                            </div>
                            {memoryHighlights.map((item) => (
                                <div key={item.title} className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{item.title}</span>
                                    <span className="text-foreground">{item.detail}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    )
}
