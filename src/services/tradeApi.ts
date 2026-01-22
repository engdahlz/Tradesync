const PROJECT_HASH = '6duofuu3ga'; // From deployment logs
const REGION = 'us-central1';
const IS_DEV = import.meta.env.DEV;

function getUrl(functionName: string) {
    if (IS_DEV) return `http://127.0.0.1:5001/tradesync-ai-prod/${REGION}/${functionName}`;
    return `https://${functionName.toLowerCase()}-${PROJECT_HASH}-uc.a.run.app`;
}

export interface TradeRequest {
    userId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    orderType: 'market' | 'limit';
    price?: number;
    isDryRun?: boolean;
}

export interface TradeResponse {
    success: boolean;
    orderId?: string;
    message: string;
    status?: string;
    mode?: 'LIVE' | 'PAPER';
}

export async function executeTrade(request: TradeRequest): Promise<TradeResponse> {
    // In dev, use local emulator. In prod, use deployed URL.
    // We assume executeTrade endpoint is at /executeTrade
    
    const payload = {
        ...request,
        idempotencyKey: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const response = await fetch(getUrl('executeTrade'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Trade execution failed');
    }

    return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBalance(): Promise<any> {
    const response = await fetch(getUrl('getBalance'));
    if (!response.ok) throw new Error('Failed to fetch balance');
    return response.json();
}
