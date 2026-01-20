import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Brain, Activity, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Signal {
    id: string
    symbol: string
    action: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
    score: number
    reasoning: string
    createdAt: any
}

export default function StrategyPerformance() {
    const [signals, setSignals] = useState<Signal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const q = query(
            collection(db, 'signals'),
            orderBy('createdAt', 'desc'),
            limit(5)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Signal[]
            setSignals(data)
            setLoading(false)
        }, (error) => {
            console.error("Failed to fetch signals:", error)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return (
        <div className="glass-card p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-ts-blue/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-ts-blue" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">AI Strategy Engine</h3>
                        <p className="text-xs text-slate-400">Live market analysis</p>
                    </div>
                </div>
                <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Active
                </div>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-slate-500 text-sm">Loading signals...</div>
                ) : signals.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">No signals generated yet.</div>
                ) : (
                    <AnimatePresence>
                        {signals.map((signal) => (
                            <motion.div
                                key={signal.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{signal.symbol}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                            signal.action === 'BUY' ? 'bg-ts-green/20 text-ts-green' :
                                            signal.action === 'SELL' ? 'bg-ts-red/20 text-ts-red' :
                                            'bg-slate-600/20 text-slate-400'
                                        }`}>
                                            {signal.action}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {signal.createdAt?.toDate ? signal.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                                    </span>
                                </div>
                                
                                <p className="text-xs text-slate-300 line-clamp-2 mb-2">
                                    {signal.reasoning}
                                </p>

                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>Score: {(signal.score ?? 0).toFixed(0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-400">Confidence:</span>
                                        <span className={`font-medium ${
                                            (signal.confidence ?? 0) > 0.8 ? 'text-ts-green' : 'text-slate-300'
                                        }`}>
                                            {((signal.confidence ?? 0) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}
