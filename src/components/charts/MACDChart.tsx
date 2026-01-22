import { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import { hslToHex } from '@/utils/colorUtils'

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
    const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
    const signalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
    const histogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
    const zeroLineRef = useRef<ISeriesApi<"Line"> | null>(null)

    // Helper to get CSS variable values (converted to Hex)
    const getThemeColor = (variable: string) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
        return hslToHex(value)
    }

    useEffect(() => {
        if (!chartContainerRef.current) return

        // Get theme colors
        const backgroundColor = getThemeColor('--background')
        const textColor = getThemeColor('--foreground')
        const gridColor = getThemeColor('--secondary')
        const borderColor = getThemeColor('--border')
        const blueColor = getThemeColor('--ts-blue')
        const yellowColor = getThemeColor('--ts-yellow')
        const mutedColor = getThemeColor('--muted-foreground')

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
            rightPriceScale: {
                borderColor: borderColor,
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderColor: borderColor,
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
            color: blueColor,
            lineWidth: 2,
            priceLineVisible: false,
        })
        macdSeriesRef.current = macdLine

        // Signal Line
        const signalLine = chart.addLineSeries({
            color: yellowColor,
            lineWidth: 2,
            priceLineVisible: false,
        })
        signalSeriesRef.current = signalLine

        // Zero line
        const zeroLine = chart.addLineSeries({
            color: mutedColor,
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
        })
        zeroLineRef.current = zeroLine
        // Data setting moved to data effect

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
        if (!histogramSeriesRef.current || !macdSeriesRef.current || !signalSeriesRef.current || !zeroLineRef.current) return

        if (data.length > 0) {
            const greenColor = getThemeColor('--ts-green')
            const redColor = getThemeColor('--ts-red')
            histogramSeriesRef.current.setData(
                data.map((d) => ({
                    time: d.time,
                    value: d.histogram,
                    color: d.histogram >= 0 ? greenColor : redColor,
                }))
            )
            macdSeriesRef.current.setData(data.map((d) => ({ time: d.time, value: d.macd })))
            signalSeriesRef.current.setData(data.map((d) => ({ time: d.time, value: d.signal })))
            zeroLineRef.current.setData(data.map((d) => ({ time: d.time, value: 0 })))

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
