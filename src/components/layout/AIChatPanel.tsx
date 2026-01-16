import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2 } from 'lucide-react'
import { advisorChat } from '@/services/api'
import ReactMarkdown from 'react-markdown'

interface AIChatPanelProps {
    isOpen: boolean
    onClose: () => void
}

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    sources?: Array<{ title: string; excerpt: string }>
}

export default function AIChatPanel({ isOpen, onClose }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm your Gemini AI financial assistant. Ask me about market trends, specific stocks, or trading strategies.",
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

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

        try {
            // Prepare history for API
            const history = messages.map(m => ({
                role: m.role,
                content: m.content
            }))

            const result = await advisorChat(userMsg.content, history)

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.response,
                timestamp: new Date(),
                sources: result.sources
            }
            setMessages(prev => [...prev, aiMsg])
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again.",
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
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
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-muted/20">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-tr-none shadow-md'
                                : 'bg-card border border-border text-foreground rounded-tl-none shadow-sm'
                                }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Gemini</span>
                                </div>
                            )}
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:text-inherit prose-headings:text-inherit prose-strong:text-inherit prose-code:text-primary-foreground/90 leading-relaxed">
                                <ReactMarkdown>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>

                            {msg.sources && msg.sources.length > 0 && (
                                <div className={`mt-4 pt-3 border-t ${msg.role === 'user' ? 'border-primary-foreground/20' : 'border-border/50'}`}>
                                    <p className="text-[10px] font-bold mb-2 opacity-80 uppercase tracking-wider">Sources & Context</p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.sources.map((s, i) => (
                                            <div key={i} className={`text-[10px] px-2 py-1 rounded-md border ${msg.role === 'user' ? 'bg-white/10 border-white/20' : 'bg-secondary border-border'} cursor-help transition-colors hover:bg-primary/5`}>
                                                {s.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground">Thinking...</span>
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
                        className="flex-1 pl-4 pr-12 py-3 bg-surface-2 border border-transparent rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background focus:border-primary/30 transition-all shadow-inner"
                        aria-label="Chat input"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-1.5 p-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
                        aria-label="Send message"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
