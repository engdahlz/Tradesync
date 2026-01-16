import { TechnicalAnalysis } from 'react-ts-tradingview-widgets'

interface TechnicalGaugeProps {
    symbol: string
}

export default function TechnicalGauge({ symbol }: TechnicalGaugeProps) {
    return (
        <div className="h-[280px] w-full">
            {/* 
       * Per @tradesync-frontend-expert:
       * Use react-ts-tradingview-widgets with colorTheme="dark" and isTransparent={true}
       * to blend with our Slate-900 background
       */}
            <TechnicalAnalysis
                symbol={symbol}
                colorTheme="dark"
                isTransparent={true}
                width="100%"
                height={280}
                interval="1h"
                showIntervalTabs={true}
            />
        </div>
    )
}
