import { useEffect, useRef } from 'react'
import { createChart, IChartApi, Time } from 'lightweight-charts'

interface MACDData {
    time: Time
    macd: number
    signal: number
    histogram: number
}



interface MACDChartProps {
    data?: MACDData[]
}

export default function MACDChart({ data = [] }: MACDChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const macdSeriesRef = useRef<any>(null)
    const signalSeriesRef = useRef<any>(null)
    const histogramSeriesRef = useRef<any>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#0f172a' },
                textColor: '#64748b',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            rightPriceScale: {
                borderColor: '#1e293b',
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderColor: '#1e293b',
                visible: false,
            },
            crosshair: {
                mode: 0,
            },
        })

        chartRef.current = chart

        // MACD Histogram
        const histogramSeries = chart.addHistogramSeries({
            priceLineVisible: false,
            priceFormat: {
                type: 'price',
                precision: 2,
            },
        })
        histogramSeriesRef.current = histogramSeries

        // MACD Line
        const macdLine = chart.addLineSeries({
            color: '#3b82f6',
            lineWidth: 2,
            priceLineVisible: false,
        })
        macdSeriesRef.current = macdLine

        // Signal Line
        const signalLine = chart.addLineSeries({
            color: '#f97316',
            lineWidth: 2,
            priceLineVisible: false,
        })
        signalSeriesRef.current = signalLine

        // Zero line
        const zeroLine = chart.addLineSeries({
            color: '#475569',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
        })
        zeroLine.setData(data.map((d) => ({ time: d.time, value: 0 })))

        const handleResize = () => {
            if (!chartContainerRef.current) return
            chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            })
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [])

    // Update data when props change
    useEffect(() => {
        if (!histogramSeriesRef.current || !macdSeriesRef.current || !signalSeriesRef.current) return

        if (data.length > 0) {
            histogramSeriesRef.current.setData(
                data.map((d) => ({
                    time: d.time,
                    value: d.histogram,
                    color: d.histogram >= 0 ? '#22c55e80' : '#ef444480',
                }))
            )
            macdSeriesRef.current.setData(data.map((d) => ({ time: d.time, value: d.macd })))
            signalSeriesRef.current.setData(data.map((d) => ({ time: d.time, value: d.signal })))

            if (chartRef.current) {
                chartRef.current.timeScale().fitContent()
            }
        }
    }, [data])

    if (data.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 bg-slate-900/50 rounded">
                No Data
            </div>
        )
    }

    return <div ref={chartContainerRef} className="w-full h-full" />
}
