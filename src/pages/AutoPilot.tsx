import { useState, useEffect } from 'react'
import { 
    Play, 
    Pause, 
    Plus, 
    Trash2, 
    Activity, 
    Zap, 
    Terminal,
    Loader2,
    BookTemplate
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { 
    getStrategies, 
    createStrategy, 
    updateStrategy, 
    deleteStrategy, 
    getStrategyLogs, 
    type Strategy, 
    type StrategyLog 
} from '@/services/strategyService'

const PRESET_STRATEGIES = [
    {
        name: 'BTC Momentum Scalper',
        assets: 'BTC, ETH',
        riskProfile: 'AGGRESSIVE',
        mode: 'PAPER',
        amount: 500,
        description: 'High-frequency scalping on major cryptos using RSI & MACD.'
    },
    {
        name: 'Blue Chip Swing',
        assets: 'AAPL, MSFT, NVDA',
        riskProfile: 'MODERATE',
        mode: 'PAPER',
        amount: 1000,
        description: 'Swing trading large cap tech stocks based on daily trends.'
    },
    {
        name: 'Safe Haven Accumulator',
        assets: 'GLD, SLV, KO',
        riskProfile: 'CONSERVATIVE',
        mode: 'PAPER',
        amount: 200,
        description: 'Low-risk accumulation of defensive assets during volatility.'
    },
    {
        name: 'Swedish Large Cap',
        assets: 'VOLV-B.ST, ERIC-B.ST, SEB-A.ST',
        riskProfile: 'MODERATE',
        mode: 'PAPER',
        amount: 500,
        description: 'Trading strategy focused on major Swedish industrial & bank stocks.'
    }
]

export default function AutoPilot() {
    const { user } = useAuth()
    const [strategies, setStrategies] = useState<Strategy[]>([])
    const [logs, setLogs] = useState<StrategyLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

    // Form State
    const [newName, setNewName] = useState('')
    const [newAssets, setNewAssets] = useState('')
    const [newRisk, setNewRisk] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'>('MODERATE')
    const [newMode, setNewMode] = useState<'PAPER' | 'LIVE'>('PAPER')
    const [newAmount, setNewAmount] = useState(100)

    useEffect(() => {
        if (user) {
            loadData()
        }
    }, [user])

    useEffect(() => {
        if (!user) return
        loadLogs(selectedStrategy?.id)
        const interval = setInterval(() => loadLogs(selectedStrategy?.id), 10000)
        return () => clearInterval(interval)
    }, [user, selectedStrategy?.id])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const strats = await getStrategies(user!.uid)
            setStrategies(strats)
            setSelectedStrategy(prev => {
                if (strats.length === 0) return null
                if (!prev) return strats[0]
                const updated = strats.find(s => s.id === prev.id)
                return updated || strats[0]
            })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const loadLogs = async (strategyId?: string | null) => {
        if (!user) return
        if (!strategyId) {
            setLogs([])
            return
        }
        try {
            const recentLogs = await getStrategyLogs(user.uid, 20, strategyId || undefined)
            setLogs(recentLogs)
        } catch (error) {
            console.error(error)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        try {
            await createStrategy({
                userId: user.uid,
                name: newName,
                assets: newAssets.split(',').map(s => s.trim().toUpperCase()),
                interval: '1h',
                status: 'PAUSED',
                riskProfile: newRisk,
                maxPositionSize: newAmount,
                mode: newMode
            })
            setIsCreating(false)
            resetForm()
            loadData()
        } catch (error) {
            console.error(error)
        }
    }

    const resetForm = () => {
        setNewName('')
        setNewAssets('')
        setNewRisk('MODERATE')
        setNewMode('PAPER')
        setNewAmount(100)
        setSelectedPreset(null)
    }

    const applyPreset = (preset: typeof PRESET_STRATEGIES[0]) => {
        setNewName(preset.name)
        setNewAssets(preset.assets)
        setNewRisk(preset.riskProfile as any)
        setNewMode(preset.mode as any)
        setNewAmount(preset.amount)
        setSelectedPreset(preset.name)
    }

    const toggleStatus = async (strategy: Strategy) => {
        const newStatus = strategy.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        try {
            await updateStrategy(strategy.id, { status: newStatus })
            const updatedStrategy = { ...strategy, status: newStatus };
            setStrategies(prev => prev.map(s => s.id === strategy.id ? updatedStrategy : s))
            setSelectedStrategy(updatedStrategy);
        } catch (error) {
            console.error(error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this strategy?')) return
        try {
            await deleteStrategy(id)
            setStrategies(prev => {
                const next = prev.filter(s => s.id !== id)
                setSelectedStrategy(current => {
                    if (current?.id !== id) return current
                    return next[0] || null
                })
                return next
            })
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6 p-6">
            {/* Left: Strategy List */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-ts-yellow" />
                        Active Strategies
                    </h2>
                    <button 
                        onClick={() => { resetForm(); setIsCreating(true); }}
                        className="btn-primary p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ts-purple"
                        aria-label="Create strategy"
                        title="Create strategy"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : strategies.length === 0 ? (
                        <div className="text-center p-8 border border-dashed border-slate-700 rounded-xl">
                            <p className="text-slate-400">No strategies yet.</p>
                            <button onClick={() => { resetForm(); setIsCreating(true); }} className="text-ts-purple mt-2 hover:underline">Create one</button>
                        </div>
                    ) : (
                        strategies.map(strategy => (
                            <div 
                                key={strategy.id}
                                onClick={() => setSelectedStrategy(strategy)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                    selectedStrategy?.id === strategy.id 
                                        ? 'bg-surface-2 border-ts-purple' 
                                        : 'bg-surface-1 border-border hover:border-slate-600'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-white">{strategy.name}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        strategy.status === 'ACTIVE' 
                                            ? 'bg-ts-green/20 text-ts-green' 
                                            : 'bg-slate-700 text-slate-400'
                                    }`}>
                                        {strategy.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                                    <span className="bg-slate-800 px-1.5 py-0.5 rounded">{strategy.mode}</span>
                                    <span className="bg-slate-800 px-1.5 py-0.5 rounded">{strategy.riskProfile}</span>
                                    <span>{strategy.assets.join(', ')}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Details & Logs */}
            <div className="flex-1 flex flex-col gap-6">
                {selectedStrategy ? (
                    <div className="glass-card p-6 flex flex-col h-full">
                        <div className="flex justify-between items-start border-b border-slate-700/50 pb-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedStrategy.name}</h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    Running on {selectedStrategy.interval} interval • Max ${selectedStrategy.maxPositionSize}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => toggleStatus(selectedStrategy)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                        selectedStrategy.status === 'ACTIVE'
                                            ? 'bg-ts-yellow/10 text-ts-yellow hover:bg-ts-yellow/20'
                                            : 'bg-ts-green/10 text-ts-green hover:bg-ts-green/20'
                                    }`}
                                >
                                    {selectedStrategy.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    {selectedStrategy.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                                </button>
                                <button 
                                    onClick={() => handleDelete(selectedStrategy.id)}
                                    className="p-2 text-slate-400 hover:text-ts-red transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ts-red/60"
                                    aria-label="Delete strategy"
                                    title="Delete strategy"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col">
                            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <Terminal className="w-4 h-4" />
                                Execution Logs
                            </h3>
                            <div className="flex-1 overflow-y-auto bg-black/30 rounded-lg p-4 font-mono text-xs space-y-4 border border-slate-800">
                                {logs.length === 0 ? (
                                    <p className="text-slate-600 italic">No execution logs yet.</p>
                                ) : (
                                    logs
                                        .map(log => (
                                            <div key={log.id} className="border-l-2 border-slate-700 pl-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                                                    <span className={log.status === 'SUCCESS' ? 'text-ts-green' : 'text-ts-red'}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 whitespace-pre-wrap">{log.output || log.error}</p>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card h-full flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Select a strategy to view details</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row gap-6">
                        {/* Presets Column */}
                        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-700 md:pr-6 pb-6 md:pb-0">
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <BookTemplate className="w-4 h-4 text-ts-purple" />
                                Templates
                            </h4>
                            <div className="space-y-2">
                                {PRESET_STRATEGIES.map((preset) => {
                                    const isActive = selectedPreset === preset.name
                                    return (
                                        <button 
                                            key={preset.name}
                                            type="button"
                                            onClick={() => applyPreset(preset)}
                                            className={`w-full text-left p-3 rounded-lg cursor-pointer border transition-all ${
                                                isActive
                                                    ? 'bg-surface-2 border-ts-purple'
                                                    : 'bg-surface-1 border-transparent hover:border-slate-600 hover:bg-surface-2'
                                            }`}
                                            aria-pressed={isActive}
                                        >
                                            <p className="text-sm font-medium text-white">{preset.name}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{preset.description}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Form Column */}
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-4">New Auto-Pilot Strategy</h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Strategy Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full bg-surface-2 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-ts-purple outline-none"
                                        placeholder="e.g. BTC Momentum"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Assets (comma separated)</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newAssets}
                                        onChange={e => setNewAssets(e.target.value)}
                                        className="w-full bg-surface-2 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-ts-purple outline-none"
                                        placeholder="BTC, ETH, SOL"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Risk Profile</label>
                                        <select 
                                            value={newRisk}
                                            onChange={e => setNewRisk(e.target.value as any)}
                                            className="w-full bg-surface-2 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
                                        >
                                            <option value="CONSERVATIVE">Conservative</option>
                                            <option value="MODERATE">Moderate</option>
                                            <option value="AGGRESSIVE">Aggressive</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Mode</label>
                                        <select 
                                            value={newMode}
                                            onChange={e => setNewMode(e.target.value as any)}
                                            className="w-full bg-surface-2 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none"
                                        >
                                            <option value="PAPER">Paper Trading</option>
                                            <option value="LIVE">Live Trading</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Max Position Size ($)</label>
                                    <input 
                                        type="number" 
                                        required
                                        min="10"
                                        value={newAmount}
                                        onChange={e => setNewAmount(Number(e.target.value))}
                                        className="w-full bg-surface-2 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-ts-purple outline-none"
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-1 py-2 rounded-lg bg-ts-purple text-white hover:bg-ts-purple/90"
                                    >
                                        Create Strategy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
