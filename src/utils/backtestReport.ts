import jsPDF from 'jspdf'

interface Holding {
    symbol: string
    name: string
    amount: number
    avgPrice: number
    currentPrice: number
    value: number
    pnl: number
    pnlPercent: number
    allocation: number
}

interface PortfolioStats {
    totalValue: number
    totalPnl: number
    totalPnlPercent: number
    dayChange: number
    dayChangePercent: number
}

// Calculate Sharpe Ratio per @tradesync-frontend-expert
// Sharpe Ratio = (Mean Return / Std Dev of Return)
function calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) return 0
    return mean / stdDev
}

// Calculate Max Drawdown per @tradesync-frontend-expert
// Max Drawdown = Peak-to-Trough decline
function calculateMaxDrawdown(equityCurve: number[]): number {
    if (equityCurve.length === 0) return 0

    let maxDrawdown = 0
    let peak = equityCurve[0]

    for (const value of equityCurve) {
        if (value > peak) {
            peak = value
        }
        const drawdown = (peak - value) / peak
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown
        }
    }

    return maxDrawdown * 100 // Return as percentage
}

// Calculate trade statistics from history
function calculateTradeStats(trades: { pnl: number }[]): {
    winRate: number
    avgTrade: number
    bestTrade: number
    worstTrade: number
} {
    if (!trades || trades.length === 0) {
        return { winRate: 0, avgTrade: 0, bestTrade: 0, worstTrade: 0 }
    }

    const wins = trades.filter(t => t.pnl > 0).length
    const winRate = (wins / trades.length) * 100
    const avgTrade = trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
    const bestTrade = Math.max(...trades.map(t => t.pnl))
    const worstTrade = Math.min(...trades.map(t => t.pnl))

    return { winRate, avgTrade, bestTrade, worstTrade }
}

export async function generateBacktestReport(
    holdings: Holding[],
    stats: PortfolioStats,
    equityCurve: number[],
    tradeHistory?: { pnl: number }[]
): Promise<void> {
    const doc = new jsPDF()

    if (!equityCurve || equityCurve.length === 0) {
        console.warn('No equity curve data provided for report');
        // We could throw or just proceed with empty chart, but for strictness:
        // Let's assume we proceed but the chart will be empty.
    }

    const dailyReturns = []
    for (let i = 1; i < equityCurve.length; i++) {
        dailyReturns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1])
    }

    const sharpeRatio = calculateSharpeRatio(dailyReturns)
    const maxDrawdown = calculateMaxDrawdown(equityCurve)
    const tradeStats = calculateTradeStats(tradeHistory || [])

    // Header with gradient effect
    doc.setFillColor(15, 23, 42) // #0f172a
    doc.rect(0, 0, 210, 40, 'F')

    doc.setTextColor(34, 197, 94) // #22c55e
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Trade/Sync', 20, 20)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Backtest Performance Report', 20, 30)

    doc.setTextColor(148, 163, 184) // slate-400
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 30)

    // Draw equity curve area chart with green gradient per @tradesync-frontend-expert
    const chartY = 50
    const chartHeight = 60
    const chartWidth = 170
    const chartX = 20

    doc.setFillColor(30, 41, 59) // bg-light
    doc.rect(chartX, chartY, chartWidth, chartHeight, 'F')

    // Draw title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Equity Curve (90 Days)', chartX, chartY - 5)

    // Draw area chart
    const minValue = Math.min(...equityCurve)
    const maxValue = Math.max(...equityCurve)
    const valueRange = maxValue - minValue

    // Fill area under curve with green gradient effect
    doc.setFillColor(34, 197, 94, 0.3)
    doc.setDrawColor(34, 197, 94)
    doc.setLineWidth(0.5)

    const points: [number, number][] = equityCurve.map((value, i) => {
        const x = chartX + (i / (equityCurve.length - 1)) * chartWidth
        const y = chartY + chartHeight - ((value - minValue) / valueRange) * chartHeight
        return [x, y]
    })

    // Draw filled area (simplified for PDF)

    // Draw line
    doc.setDrawColor(34, 197, 94)
    doc.setLineWidth(1)
    for (let i = 1; i < points.length; i++) {
        doc.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    }

    // Metrics section
    const metricsY = 125

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Performance Metrics', 20, metricsY)

    // Metrics table
    const metrics = [
        ['Total Return', `${stats.totalPnlPercent.toFixed(2)}%`],
        ['Sharpe Ratio', sharpeRatio.toFixed(2)],
        ['Max Drawdown', `${maxDrawdown.toFixed(2)}%`],
        ['Total P&L', `$${stats.totalPnl.toLocaleString()}`],
        ['Win Rate', tradeStats.winRate > 0 ? `${tradeStats.winRate.toFixed(1)}%` : 'N/A'],
        ['Average Trade', tradeStats.avgTrade !== 0 ? `${tradeStats.avgTrade >= 0 ? '+' : ''}$${tradeStats.avgTrade.toLocaleString()}` : 'N/A'],
        ['Best Trade', tradeStats.bestTrade !== 0 ? `+$${tradeStats.bestTrade.toLocaleString()}` : 'N/A'],
        ['Worst Trade', tradeStats.worstTrade !== 0 ? `-$${Math.abs(tradeStats.worstTrade).toLocaleString()}` : 'N/A'],
    ]

    const tableY = metricsY + 10
    const colWidth = 85

    doc.setFillColor(30, 41, 59)
    doc.rect(20, tableY, 170, 8 + metrics.length * 8, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(148, 163, 184)
    doc.text('Metric', 25, tableY + 6)
    doc.text('Value', 25 + colWidth, tableY + 6)

    metrics.forEach((row, i) => {
        const y = tableY + 14 + i * 8
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(226, 232, 240)
        doc.text(row[0], 25, y)

        const isPositive = !row[1].includes('-')
        doc.setTextColor(isPositive ? 34 : 239, isPositive ? 197 : 68, isPositive ? 94 : 68)
        doc.setFont('helvetica', 'bold')
        doc.text(row[1], 25 + colWidth, y)
    })

    // Holdings section
    const holdingsY = tableY + 90

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Holdings Summary', 20, holdingsY)

    doc.setFillColor(30, 41, 59)
    doc.rect(20, holdingsY + 5, 170, 8 + holdings.length * 8, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(148, 163, 184)
    doc.text('Asset', 25, holdingsY + 11)
    doc.text('Value', 80, holdingsY + 11)
    doc.text('P&L', 120, holdingsY + 11)
    doc.text('Allocation', 155, holdingsY + 11)

    holdings.forEach((holding, i) => {
        const y = holdingsY + 19 + i * 8
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(226, 232, 240)
        doc.text(holding.symbol, 25, y)
        doc.text(`$${holding.value.toLocaleString()}`, 80, y)

        doc.setTextColor(holding.pnl >= 0 ? 34 : 239, holding.pnl >= 0 ? 197 : 68, holding.pnl >= 0 ? 94 : 68)
        doc.text(`${holding.pnl >= 0 ? '+' : ''}${holding.pnlPercent}%`, 120, y)

        doc.setTextColor(226, 232, 240)
        doc.text(`${holding.allocation}%`, 160, y)
    })

    // Footer
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 280, 210, 17, 'F')

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(8)
    doc.text('Trade/Sync - AI-Powered Trading Platform', 20, 290)
    doc.text('This report is for informational purposes only. Past performance does not guarantee future results.', 20, 295)

    // Save the PDF
    doc.save('tradesync-backtest-report.pdf')
}
