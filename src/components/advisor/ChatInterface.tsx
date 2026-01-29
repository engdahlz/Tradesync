import { useState, useRef, useEffect, FormEvent, useCallback } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { API_BASE } from '@/services/api'
import { ADVISOR_CHAT_STREAM_PATH } from '@/services/apiBase'
import { useAuth } from '@/contexts/AuthContext'
import { createChart, ColorType } from 'lightweight-charts'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    sources?: Array<{ title: string; sourceType: string; excerpt: string; page?: number; score?: number }>
    chartData?: { symbol: string; data: any[] }
}

const initialMessages: Message[] = [
    {
        id: '1',
        role: 'assistant',
        content: `Welcome to Trade/Sync AI. I am your research analyst grounded in **5,742 curated chunks**.

I draw from sources like:

• **Trading in the Zone** (Mark Douglas) - Psychology & Discipline
• **The Intelligent Investor** (Graham) - Value Investing
• **Market Wizards** (Schwager) - Expert Interviews
• **Trading Systems & Methods** (Kaufman) - Quantitative Strategies

Ask me about trading psychology, technical analysis, or portfolio strategy.`,
        timestamp: new Date(),
    },
]

function ChartComponent({ data, symbol }: { data: any[], symbol: string }) {
    const chartContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            grid: {
                vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
                horzLines: { color: 'rgba(148, 163, 184, 0.1)' },
            },
        })

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        })

        candlestickSeries.setData(data)
        chart.timeScale().fitContent()

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth })
            }
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [data])

    return (
        <div className="mt-4 border border-border/50 rounded-xl overflow-hidden bg-surface-1 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">{symbol} - Daily</div>
            <div ref={chartContainerRef} className="w-full" />
        </div>
    )
}

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const shouldAutoScrollRef = useRef(true)
    const { user } = useAuth()
    const sessionIdRef = useRef<string | null>(null)

    if (!sessionIdRef.current) {
        sessionIdRef.current = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    const scrollToBottom = useCallback((force = false) => {
        if (!force && !shouldAutoScrollRef.current) return
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    const handleScroll = () => {
        const container = messagesContainerRef.current
        if (!container) return
        const threshold = 120
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        shouldAutoScrollRef.current = distanceFromBottom < threshold
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        const userInput = input
        setInput('')
        setIsLoading(true)
        setStatus('Thinking...')

        const aiMsgId = (Date.now() + 1).toString()

        const history = messages
            .filter(m => m.id !== '1')
            .map(m => ({ role: m.role, content: m.content }))

        const statusForTool = (name: string) => {
            switch (name) {
                case 'get_latest_market_signals':
                    return 'Checking market signals...'
                case 'technical_analysis':
                    return 'Running technical analysis...'
                case 'get_market_news':
                    return 'Fetching market news...'
                case 'search_knowledge_base':
                    return 'Searching knowledge base...'
                case 'search_memory':
                    return 'Looking up preferences...'
                case 'get_portfolio':
                    return 'Analyzing portfolio...'
                case 'vertex_ai_search':
                    return 'Searching private sources...'
                case 'vertex_ai_rag_retrieval':
                    return 'Retrieving grounded context...'
                case 'fetch_youtube_transcript':
                    return 'Fetching transcript...'
                case 'get_chart':
                    return 'Generating chart...'
                default:
                    return 'Using tool...'
            }
        }

        try {
            const response = await fetch(`${API_BASE}/${ADVISOR_CHAT_STREAM_PATH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.uid || 'anonymous',
                    message: userInput,
                    conversationHistory: history,
                    sessionId: sessionIdRef.current || undefined,
                }),
            })

            if (!response.ok) {
                throw new Error(`Stream error: ${response.status}`)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('No stream reader available')
            }

            const decoder = new TextDecoder()
            let accumulatedContent = ''
            let currentEvent = 'message'
            let currentData = ''
            let buffer = ''

            const upsertAssistantMessage = (update: (existing?: Message) => Message) => {
                setMessages((prev) => {
                    const index = prev.findIndex((message) => message.id === aiMsgId)
                    if (index === -1) {
                        return [...prev, update(undefined)]
                    }
                    const next = [...prev]
                    next[index] = update(next[index])
                    return next
                })
            }

            const handleEvent = (eventName: string, data: string) => {
                if (!eventName) return

                if (eventName === 'text') {
                    try {
                        const content = data.trim().startsWith('"') ? JSON.parse(data) : data
                        accumulatedContent += content
                        upsertAssistantMessage((existing) => ({
                            id: aiMsgId,
                            role: 'assistant',
                            content: accumulatedContent,
                            timestamp: existing?.timestamp ?? new Date(),
                            sources: existing?.sources,
                            chartData: existing?.chartData,
                        }))
                        setStatus(null)
                    } catch {
                        console.warn('Failed to parse stream data:', data)
                    }
                } else if (eventName === 'sources') {
                    try {
                        const parsed = JSON.parse(data)
                        upsertAssistantMessage((existing) => ({
                            id: aiMsgId,
                            role: 'assistant',
                            content: existing?.content ?? accumulatedContent,
                            timestamp: existing?.timestamp ?? new Date(),
                            sources: parsed,
                            chartData: existing?.chartData,
                        }))
                    } catch {
                        console.warn('Failed to parse sources data:', data)
                    }
                } else if (eventName === 'chart_data') {
                    try {
                        const parsed = JSON.parse(data)
                        upsertAssistantMessage((existing) => ({
                            id: aiMsgId,
                            role: 'assistant',
                            content: existing?.content ?? accumulatedContent,
                            timestamp: existing?.timestamp ?? new Date(),
                            sources: existing?.sources,
                            chartData: parsed,
                        }))
                    } catch {
                        console.warn('Failed to parse chart data:', data)
                    }
                } else if (eventName === 'function_call') {
                    try {
                        const parsed = JSON.parse(data)
                        const toolName = parsed?.name as string | undefined
                        setStatus(toolName ? statusForTool(toolName) : 'Using tool...')
                    } catch {
                        setStatus('Using tool...')
                    }
                } else if (eventName === 'error') {
                    try {
                        const message = data.trim().startsWith('"') ? JSON.parse(data) : data
                        const content = typeof message === 'string' ? message : 'AI backend error.'
                        accumulatedContent = accumulatedContent
                            ? `${accumulatedContent}\n\n${content}`
                            : content
                        upsertAssistantMessage((existing) => ({
                            id: aiMsgId,
                            role: 'assistant',
                            content: accumulatedContent,
                            timestamp: existing?.timestamp ?? new Date(),
                            sources: existing?.sources,
                            chartData: existing?.chartData,
                        }))
                        setStatus(null)
                    } catch {
                        setStatus('AI backend error.')
                    }
                } else if (eventName === 'done') {
                    setIsLoading(false)
                    setStatus(null)
                }
            }

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                while (buffer.includes('\n')) {
                    const lineEnd = buffer.indexOf('\n')
                    const line = buffer.slice(0, lineEnd).replace(/\r$/, '')
                    buffer = buffer.slice(lineEnd + 1)

                    if (line.startsWith('event:')) {
                        currentEvent = line.slice(6).trim()
                    } else if (line.startsWith('data:')) {
                        const dataPart = line.slice(5).trim()
                        currentData = currentData ? `${currentData}\n${dataPart}` : dataPart
                    } else if (line === '') {
                        handleEvent(currentEvent, currentData)
                        currentData = ''
                    }
                }
            }
            if (currentData) {
                handleEvent(currentEvent, currentData)
            }

            ;(window as unknown as { __tradesync_last_advisor_response?: string }).__tradesync_last_advisor_response =
                accumulatedContent
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                id: aiMsgId,
                role: 'assistant',
                content: 'I apologize, but I encountered an error connecting to the knowledge base. Please try again.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])

            ;(window as unknown as { __tradesync_last_advisor_response?: string }).__tradesync_last_advisor_response = errorMessage.content
        } finally {
            setIsLoading(false)
            setStatus(null)
        }
    }

    return (
        <div className="flex flex-col flex-1 min-h-0" data-testid="advisor-chat">
            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
            >
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''
                            }`}
                    >
                        <div
                            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${message.role === 'assistant'
                                ? 'bg-ai/10 text-ai'
                                : 'bg-primary/10 text-primary'
                                }`}
                        >
                            {message.role === 'assistant' ? (
                                <Bot className="w-4 h-4" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                        </div>
                        <div
                            className={`max-w-[80%] p-4 rounded-2xl border shadow-sm ${message.role === 'assistant'
                                ? 'bg-card text-foreground border-border border-l-2 border-l-ai/60'
                                : 'bg-primary/10 text-foreground border-primary/20'
                                }`}
                        >
                            <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-current prose-p:text-current prose-strong:text-current prose-ul:text-current">
                                <ReactMarkdown>
                                    {message.content.replace(/\n/g, '  \n')}
                                </ReactMarkdown>
                            </div>
                            
                            {message.chartData && (
                                <ChartComponent 
                                    data={message.chartData.data} 
                                    symbol={message.chartData.symbol} 
                                />
                            )}

                            <p className="text-[10px] opacity-60 mt-2">
                                {message.timestamp.toLocaleTimeString()}
                            </p>
                            {message.sources && message.sources.length > 0 && (
                                <div className="mt-4 border-t border-border/70 pt-3">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources</p>
                                    <div className="mt-2 space-y-2 text-[11px] text-muted-foreground">
                                        {message.sources.map((source, index) => (
                                            <div key={`${message.id}-source-${index}`} className="bg-surface-1 border border-border/70 rounded-lg p-2">
                                                <div className="font-semibold text-foreground">
                                                    {source.title}
                                                    {source.page !== undefined ? ` (p. ${source.page})` : ''}
                                                </div>
                                                {source.excerpt && <div className="opacity-80">{source.excerpt}</div>}
                                                {source.score !== undefined && (
                                                    <div className="opacity-70">Score: {source.score.toFixed(2)}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-ai/10 text-ai">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-surface-2 text-muted-foreground p-3 rounded-2xl border border-border">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">{status || 'Consulting knowledge base...'}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-white/70">
                <div className="flex gap-3">
                    <input
                        data-testid="advisor-chat-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about trading strategies, psychology, or analysis..."
                        className="flex-1 bg-surface-2 border border-transparent rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary/30 disabled:opacity-50 transition-all"
                        disabled={isLoading}
                    />
                    <button
                        data-testid="advisor-chat-send"
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-primary text-primary-foreground p-2.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    )
}
