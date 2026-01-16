import { useEffect, useState, useRef } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { fetchSparklineData } from '@/services/priceData'

interface CryptoCardProps {
    symbol: string
    price: number
    priceChangePercent: number
    flashDirection: 'up' | 'down' | null
}

const symbolIcons: Record<string, string> = {
    BTCUSDT: '₿',
    ETHUSDT: 'Ξ',
    SOLUSDT: '◎',
    BNBUSDT: 'BNB',
    XRPUSDT: 'XRP',
    ADAUSDT: '₳',
    DOGEUSDT: 'Ð',
    DOTUSDT: '●',
}

const symbolColors: Record<string, string> = {
    BTCUSDT: 'bg-amber-500',
    ETHUSDT: 'bg-indigo-500',
    SOLUSDT: 'bg-gradient-to-r from-purple-500 to-green-400',
    BNBUSDT: 'bg-yellow-500',
    XRPUSDT: 'bg-slate-400',
    ADAUSDT: 'bg-blue-500',
    DOGEUSDT: 'bg-amber-400',
    DOTUSDT: 'bg-pink-500',
}

// Mini sparkline chart component
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || data.length < 2) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = canvas.width
        const height = canvas.height
        const min = Math.min(...data)
        const max = Math.max(...data)
        const range = max - min || 1

        ctx.clearRect(0, 0, width, height)
        ctx.beginPath()
        ctx.strokeStyle = positive ? '#22c55e' : '#ef4444'
        ctx.lineWidth = 1.5

        data.forEach((value, i) => {
            const x = (i / (data.length - 1)) * width
            const y = height - ((value - min) / range) * height
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        })

        ctx.stroke()
    }, [data, positive])

    return <canvas ref={canvasRef} width={60} height={24} className="opacity-70" />
}

export default function CryptoCard({
    symbol,
    price,
    priceChangePercent,
    flashDirection,
}: CryptoCardProps) {
    const [_isFlashing, setIsFlashing] = useState(false)
    const [flashClass, setFlashClass] = useState('')
    const [sparkline, setSparkline] = useState<number[]>([])

    // Flash-on-change effect
    useEffect(() => {
        if (flashDirection) {
            setFlashClass(flashDirection === 'up' ? 'flash-green' : 'flash-red')
            setIsFlashing(true)

            const timer = setTimeout(() => {
                setIsFlashing(false)
                setFlashClass('')
            }, 500)

            return () => clearTimeout(timer)
        }
    }, [flashDirection, price])

    // Fetch sparkline data once
    useEffect(() => {
        const baseSymbol = symbol.replace('USDT', '')
        fetchSparklineData(baseSymbol).then(setSparkline).catch(() => { })
    }, [symbol])

    const isPositive = priceChangePercent >= 0
    const displaySymbol = symbol.replace('USDT', '')
    const iconChar = symbolIcons[symbol] || displaySymbol.charAt(0)
    const iconColor = symbolColors[symbol] || 'bg-slate-500'

    const formatPrice = (p: number) => {
        if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 })
        if (p >= 1) return p.toFixed(2)
        return p.toFixed(4)
    }

    return (
        <div
            className={`flex items-center justify-between py-3 px-4 transition-colors duration-200 hover:bg-secondary/50 cursor-pointer ${flashClass}`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`w-8 h-8 rounded-full ${iconColor} flex items-center justify-center text-white shrink-0`}
                >
                    <span className="text-xs font-bold">
                        {iconChar.length <= 3 ? iconChar : displaySymbol.charAt(0)}
                    </span>
                </div>
                <div>
                    <p className="font-medium text-foreground text-sm leading-none">{displaySymbol}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Crypto</p>
                </div>
            </div>

            {/* Sparkline chart - Hide on very small screens */}
            {sparkline.length > 0 && (
                <div className="hidden min-[340px]:block w-16">
                    <Sparkline data={sparkline} positive={isPositive} />
                </div>
            )}

            <div className="text-right min-w-[80px]">
                <p className="font-medium text-foreground text-sm leading-none mb-0.5">
                    ${formatPrice(price)}
                </p>
                <div
                    className={`flex items-center justify-end gap-0.5 text-xs font-medium ${isPositive ? 'text-ts-green' : 'text-ts-red'
                        }`}
                >
                    {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                    ) : (
                        <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span>{priceChangePercent.toFixed(2)}%</span>
                </div>
            </div>
        </div>
    )
}


