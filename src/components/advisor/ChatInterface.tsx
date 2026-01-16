import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { advisorChat } from '@/services/api'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    sources?: Array<{ title: string; sourceType: string; excerpt: string }>
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
    const messagesEndRef = useRef<HTMLDivElement>(null)

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

        try {
            // Build conversation history for context
            const history = messages
                .filter(m => m.id !== '1') // Exclude initial message
                .map(m => ({ role: m.role, content: m.content }))

            // Call the real RAG API
            const response = await advisorChat(userInput, history)

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.response,
                timestamp: new Date(),
                sources: response.sources,
            }

            setMessages((prev) => [...prev, assistantMessage])
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'I apologize, but I encountered an error connecting to the knowledge base. Please try again.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col flex-1 min-h-0">
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
                            <div
                                className="text-sm whitespace-pre-wrap prose prose-sm max-w-none prose-headings:text-current prose-p:text-current prose-strong:text-current prose-ul:text-current"
                                dangerouslySetInnerHTML={{
                                    __html: message.content
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                        .replace(/\n/g, '<br />'),
                                }}
                            />
                            <p className="text-[10px] opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString()}
                            </p>
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
                                <span className="text-sm">Consulting knowledge base...</span>
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
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about trading strategies, psychology, or analysis..."
                        className="flex-1 bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        disabled={isLoading}
                    />
                    <button
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
