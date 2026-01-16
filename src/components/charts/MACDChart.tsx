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
                background: { color: '#ffffff' },
                textColor: '#202124',
            },
            grid: {
                vertLines: { color: '#f1f3f4' },
                horzLines: { color: '#f1f3f4' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            rightPriceScale: {
                borderColor: '#dadce0',
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderColor: '#dadce0',
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
            color: '#1a73e8', // Google Blue
            lineWidth: 2,
            priceLineVisible: false,
        })
        macdSeriesRef.current = macdLine

        // Signal Line
        const signalLine = chart.addLineSeries({
            color: '#fbbc04', // Google Yellow
            lineWidth: 2,
            priceLineVisible: false,
        })
        signalSeriesRef.current = signalLine

        // Zero line
        const zeroLine = chart.addLineSeries({
            color: '#5f6368', // Muted foreground
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
                    color: d.histogram >= 0 ? 'rgba(19, 115, 51, 0.5)' : 'rgba(165, 14, 14, 0.5)',
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
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-secondary/50 rounded">
                No Data
            </div>
        )
    }

    return <div ref={chartContainerRef} className="w-full h-full" />
}
