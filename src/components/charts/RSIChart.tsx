import { useEffect, useRef } from 'react'
import { createChart, IChartApi, LineData, ISeriesApi } from 'lightweight-charts'
import { hslToHex } from '@/utils/colorUtils'

interface RSIChartProps {
    data?: LineData[]
}

export default function RSIChart({ data = [] }: RSIChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)

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

        // Create chart with synchronized TimeScale styling
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
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderColor: borderColor,
                visible: false, // Hide time scale for sub-charts per @tradesync-frontend-expert
            },
            crosshair: {
                mode: 0,
            },
        })

        chartRef.current = chart

        // Add RSI line series
        const rsiSeries = chart.addLineSeries({
            color: blueColor,
            lineWidth: 2,
            priceLineVisible: false,
        })
        rsiSeriesRef.current = rsiSeries

        // Add overbought/oversold zones
        // Static lines removed as they require data to be useful/visible in this library context safely without mock time

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

    // React to data changes
    useEffect(() => {
        if (!rsiSeriesRef.current) return

        if (data.length > 0) {
            rsiSeriesRef.current.setData(data)

            // Re-add static lines based on data time range for visual consistency
            // For simplicity in this refactor, just the main series is key.
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
