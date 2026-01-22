import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, IChartApi, CandlestickData, Time } from 'lightweight-charts'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { fetchHistoricalData, OHLCV } from '@/services/priceData'
import { hslToHex } from '@/utils/colorUtils'

interface MainChartProps {
    symbol: string
}

interface SignalBadge {
    time: Time
    text: string
    color: string
    position: 'aboveBar' | 'belowBar'
}

// Detect signals from real data
function generateSignalsFromData(data: OHLCV[]): SignalBadge[] {
    const signals: SignalBadge[] = []
    const closes = data.map(d => d.close)

    for (let i = 20; i < data.length; i++) {
        // RSI oversold detection
        const recentCloses = closes.slice(i - 14, i)
        let gains = 0, losses = 0
        for (let j = 1; j < recentCloses.length; j++) {
            const change = recentCloses[j] - recentCloses[j - 1]
            if (change > 0) gains += change
            else losses -= change
        }
        const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses))

        // Add signal if RSI is oversold or overbought
        if (rsi < 30 && !signals.some(s => Math.abs((s.time as number) - data[i].time) < 3600 * 4)) {
            signals.push({
                time: data[i].time as Time,
                text: 'OVERSOLD',
                color: 'buy',
                position: 'belowBar',
            })
        } else if (rsi > 70 && !signals.some(s => Math.abs((s.time as number) - data[i].time) < 3600 * 4)) {
            signals.push({
                time: data[i].time as Time,
                text: 'OVERBOUGHT',
                color: 'sell',
                position: 'aboveBar',
            })
        }
    }

    // Limit to most recent 5 signals
    return signals.slice(-5)
}

export default function MainChart({ symbol }: MainChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    
    const [candleData, setCandleData] = useState<CandlestickData[]>([])
    const [signalBadges, setSignalBadges] = useState<SignalBadge[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch real data from Binance
    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const data = await fetchHistoricalData({
                symbol,
                interval: '1h',
                limit: 168, // 7 days of hourly data
            })

            const chartData: CandlestickData[] = data.map((d: OHLCV) => ({
                time: d.time as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }))

            setCandleData(chartData)

            // Generate signal badges based on real data patterns
            const signals = generateSignalsFromData(data)
            setSignalBadges(signals)

        } catch (err) {
            console.error('Failed to load chart data:', err)
            setError('Failed to load market data. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [symbol])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Helper to get CSS variable values (converted to Hex)
    const getThemeColor = (variable: string) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
        return hslToHex(value)
    }

    useEffect(() => {
        if (!chartContainerRef.current || candleData.length === 0) return

        // Get theme colors
        const backgroundColor = getThemeColor('--background')
        const textColor = getThemeColor('--foreground')
        const gridColor = getThemeColor('--secondary')
        const borderColor = getThemeColor('--border')
        const crosshairColor = getThemeColor('--primary')
        const greenColor = getThemeColor('--ts-green')
        const redColor = getThemeColor('--ts-red')

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: backgroundColor },
                textColor: textColor,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            crosshair: {
                mode: 1,
                vertLine: { color: borderColor, labelBackgroundColor: crosshairColor },
                horzLine: { color: borderColor, labelBackgroundColor: crosshairColor },
            },
            rightPriceScale: { borderColor: borderColor },
            timeScale: { borderColor: borderColor, timeVisible: true, secondsVisible: false },
        })

        chartRef.current = chart

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: greenColor,
            downColor: redColor,
            borderUpColor: greenColor,
            borderDownColor: redColor,
            wickUpColor: greenColor,
            wickDownColor: redColor,
        })

        candlestickSeries.setData(candleData)

        // Add markers for signals (resolve colors for canvas compatibility)
        if (signalBadges.length > 0) {
            const markers = signalBadges.map((badge) => ({
                time: badge.time,
                position: badge.position,
                color: badge.color === 'buy' ? greenColor : redColor,
                shape: 'arrowUp' as const,
                text: badge.text,
            }))
            candlestickSeries.setMarkers(markers)
        }

        const handleResize = () => {
            if (!chartContainerRef.current) return
            chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            })
        }

        window.addEventListener('resize', handleResize)
        chart.timeScale().fitContent()

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [candleData, signalBadges])

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white" style={{ minHeight: '300px' }}>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading {symbol} data...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white" style={{ minHeight: '300px' }}>
                <div className="flex flex-col items-center gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <button onClick={loadData} className="px-4 py-2 bg-secondary text-primary rounded-full font-medium hover:bg-secondary/80 flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={chartContainerRef}
            className="relative w-full h-full"
            style={{ minHeight: '300px' }}
        />
    )
}
