import { Bot, BookOpen } from 'lucide-react'
import ChatInterface from '../components/advisor/ChatInterface'

export default function FinancialAdvisor() {
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Bot className="w-7 h-7 text-ts-green" />
                    Financial Advisor
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    AI-powered guidance grounded in classic trading literature
                </p>
            </div>

            {/* AI Chat - Full Width */}
            <div className="flex-1 glass-card flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ts-green to-ts-blue flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">AI Trading Coach</h3>
                            <p className="text-xs text-slate-400">Powered by Gemini 3 + RAG Knowledge Base</p>
                        </div>
                        <span className="ml-auto badge badge-green">Online</span>
                    </div>
                </div>
                <ChatInterface />
            </div>

            {/* Knowledge Base Info */}
            <div className="mt-4 p-4 glass-card">
                <div className="flex items-center gap-3 mb-3">
                    <BookOpen className="w-5 h-5 text-ts-yellow" />
                    <h4 className="font-medium text-white">RAG Knowledge Base</h4>
                    <span className="text-xs text-slate-400 ml-auto">5,742 chunks from 21 sources</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { title: 'Trading in the Zone', author: 'Mark Douglas', type: 'Psychology' },
                        { title: 'Technical Analysis of Financial Markets', author: 'Murphy', type: 'Technical' },
                        { title: 'The Intelligent Investor', author: 'Graham', type: 'Value' },
                        { title: 'Market Wizards', author: 'Schwager', type: 'Interviews' },
                    ].map((book, i) => (
                        <div key={i} className="p-3 bg-ts-bg rounded-lg border border-slate-700/30">
                            <p className="text-sm font-medium text-white truncate">{book.title}</p>
                            <p className="text-xs text-slate-400">{book.author}</p>
                            <span className="text-[10px] text-ts-green uppercase">{book.type}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
