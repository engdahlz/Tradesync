import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2 } from 'lucide-react'
import { API_BASE } from '@/services/api'
import { ADVISOR_CHAT_STREAM_PATH } from '@/services/apiBase'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/contexts/AuthContext'

interface AIChatPanelProps {
    isOpen: boolean
    onClose: () => void
}

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    sources?: Array<{ title: string; excerpt: string; sourceType?: string; page?: number; score?: number }>
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm your Gemini AI financial assistant. Ask me about market trends, specific stocks, or trading strategies with grounded sources.",
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const sessionIdRef = useRef<string | null>(null)
    const { user } = useAuth()

    if (!sessionIdRef.current) {
        sessionIdRef.current = `panel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isOpen])

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim() || isLoading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)
        setStatus('Thinking...')

        const aiMsgId = (Date.now() + 1).toString()
        // Add an empty AI message that we'll stream into
        setMessages(prev => [...prev, {
            id: aiMsgId,
            role: 'assistant',
            content: '',
            timestamp: new Date()
        }])

        try {
            const history = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }))

            const response = await fetch(`${API_BASE}/${ADVISOR_CHAT_STREAM_PATH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: user?.uid || 'anonymous',
                    message: input,
                    conversationHistory: history,
                    sessionId: sessionIdRef.current
                }),
            })

            if (!response.ok) throw new Error('Failed to connect to stream')

            const reader = response.body?.getReader()
            if (!reader) throw new Error('No reader available')

            const decoder = new TextDecoder()
            let accumulatedContent = ''
            let currentEvent = 'message'
            let currentData = ''
            let buffer = ''

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
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => prev.map(m => 
                m.id === aiMsgId 
                    ? { ...m, content: "I'm having trouble connecting right now. Please try again." } 
                    : m
            ))
        } finally {
            setIsLoading(false)
            setStatus(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-ai/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-ai" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm sm:text-base text-foreground">Gemini Assistant</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Powered by Google AI</p>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 hover:bg-secondary rounded-full text-muted-foreground transition-colors"
                    aria-label="Close chat"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-surface-1">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm border shadow-sm ${msg.role === 'user'
                                ? 'bg-primary/10 text-foreground border-primary/20'
                                : 'bg-card border-border text-foreground border-l-2 border-l-ai/60'
                                }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-ai uppercase tracking-wider">
                                    <Sparkles className="w-3 h-3 text-ai" />
                                    <span>Gemini</span>
                                </div>
                            )}
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-inherit prose-headings:text-inherit prose-strong:text-inherit prose-code:text-primary-foreground/90 leading-relaxed">
                                <ReactMarkdown>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>

                            {msg.sources && msg.sources.length > 0 && (
                                <div className={`mt-4 pt-3 border-t ${msg.role === 'user' ? 'border-primary/30' : 'border-border/60'}`}>
                                    <p className="text-[10px] font-bold mb-2 opacity-80 uppercase tracking-wider">Sources & Context</p>
                                    <div className="grid gap-2">
                                        {msg.sources.map((s, i) => (
                                            <div key={i} className={`text-[10px] px-2 py-1 rounded-md border ${msg.role === 'user' ? 'bg-white/10 border-primary/20' : 'bg-surface-2 border-border'}`}>
                                                <div className="font-semibold">
                                                    {s.title}
                                                    {s.page !== undefined ? ` (p. ${s.page})` : ''}
                                                </div>
                                                {s.excerpt && <div className="opacity-70 mt-1">{s.excerpt}</div>}
                                                {s.score !== undefined && (
                                                    <div className="opacity-70 mt-1">Score: {s.score.toFixed(2)}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {(isLoading || status) && (
                    <div className="flex justify-start">
                        <div className="bg-surface-2 border border-border rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-ai animate-spin" />
                            <span className="text-xs text-muted-foreground">{status || 'Thinking...'}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background shrink-0">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Gemini anything..."
                        className="flex-1 pl-4 pr-12 py-3 bg-surface-2 border border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background focus:border-primary/30 transition-all shadow-inner"
                        aria-label="Chat input"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-1.5 p-2.5 bg-primary text-primary-foreground rounded-full hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
                        aria-label="Send message"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
