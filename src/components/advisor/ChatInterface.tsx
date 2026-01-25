import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { API_BASE } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    sources?: Array<{ title: string; sourceType: string; excerpt: string; page?: number; score?: number }>
}

const initialMessages: Message[] = [
    {
        id: '1',
        role: 'assistant',
        content: `Welcome to Trade/Sync AI Advisor! 👋

I'm your personal trading coach, grounded in **5,742 chunks** of trading wisdom including:

• **Trading in the Zone** (Mark Douglas) - Psychology & Discipline
• **The Intelligent Investor** (Graham) - Value Investing
• **Market Wizards** (Schwager) - Expert Interviews
• **Trading Systems & Methods** (Kaufman) - Quantitative Strategies

Ask me about trading psychology, technical analysis, or investment strategies!`,
        timestamp: new Date(),
    },
]

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const { user } = useAuth()
    const sessionIdRef = useRef<string | null>(null)

    if (!sessionIdRef.current) {
        sessionIdRef.current = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

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
        setMessages((prev) => [
            ...prev,
            {
                id: aiMsgId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
            },
        ])

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
            const response = await fetch(`${API_BASE}/advisorChatStream`, {
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

            const handleEvent = (eventName: string, data: string) => {
                if (!eventName) return

                if (eventName === 'text') {
                    try {
                        const content = data.trim().startsWith('"') ? JSON.parse(data) : data
                        accumulatedContent += content
                        setMessages(prev => prev.map(m =>
                            m.id === aiMsgId ? { ...m, content: accumulatedContent } : m
                        ))
                        setStatus(null)
                    } catch {
                        console.warn('Failed to parse stream data:', data)
                    }
                } else if (eventName === 'sources') {
                    try {
                        const parsed = JSON.parse(data)
                        setMessages(prev => prev.map(m =>
                            m.id === aiMsgId ? { ...m, sources: parsed } : m
                        ))
                    } catch {
                        console.warn('Failed to parse sources data:', data)
                    }
                } else if (eventName === 'function_call') {
                    try {
                        const parsed = JSON.parse(data)
                        const toolName = parsed?.name as string | undefined
                        setStatus(toolName ? statusForTool(toolName) : 'Using tool...')
                    } catch {
                        setStatus('Using tool...')
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
            setMessages((prev) => prev.map(m => (m.id === aiMsgId ? errorMessage : m)))

            ;(window as unknown as { __tradesync_last_advisor_response?: string }).__tradesync_last_advisor_response = errorMessage.content
        } finally {
            setIsLoading(false)
            setStatus(null)
        }
    }

    return (
        <div className="flex flex-col flex-1 min-h-0" data-testid="advisor-chat">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''
                            }`}
                    >
                        <div
                            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${message.role === 'assistant'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            {message.role === 'assistant' ? (
                                <Bot className="w-4 h-4" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                        </div>
                        <div
                            className={`max-w-[80%] p-3 rounded-xl ${message.role === 'assistant'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted text-foreground'
                                }`}
                        >
                            <div className="text-sm prose prose-sm max-w-none prose-headings:text-current prose-p:text-current prose-strong:text-current prose-ul:text-current">
                                <ReactMarkdown>
                                    {message.content.replace(/\n/g, '  \n')}
                                </ReactMarkdown>
                            </div>
                            <p className="text-[10px] opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString()}
                            </p>
                            {message.sources && message.sources.length > 0 && (
                                <div className="mt-3 border-t border-primary-foreground/20 pt-2">
                                    <p className="text-[10px] uppercase tracking-wider opacity-80">Sources</p>
                                    <div className="mt-2 space-y-2 text-[11px] opacity-90">
                                        {message.sources.map((source, index) => (
                                            <div key={`${message.id}-source-${index}`}>
                                                <div className="font-semibold">
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
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-muted text-muted-foreground p-3 rounded-xl">
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
            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
                <div className="flex gap-3">
                    <input
                        data-testid="advisor-chat-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about trading strategies, psychology, or analysis..."
                        className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        disabled={isLoading}
                    />
                    <button
                        data-testid="advisor-chat-send"
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    )
}
