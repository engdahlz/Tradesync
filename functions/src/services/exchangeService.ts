/**
 * Exchange Service Interface
 * Adapter pattern to unify different exchanges (Binance, Alpaca, etc.)
 */

export interface TradeResult {
    orderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    status: 'filled' | 'open' | 'failed';
    timestamp: number;
    fee?: number;
}

export interface Balance {
    currency: string;
    free: number;
    used: number;
    total: number;
}

export interface Ticker {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    volume: number;
}

export interface ExchangeService {
    /**
     * Get adapter name (e.g., 'Binance', 'Alpaca')
     */
    getName(): string;

    /**
     * Fetch current account balance
     */
    getBalance(): Promise<Balance[]>;

    /**
     * Fetch current price for a symbol
     */
    getTicker(symbol: string): Promise<Ticker>;

    /**
     * Place a market or limit order
     */
    placeOrder(
        symbol: string,
        side: 'buy' | 'sell',
        quantity: number,
        type: 'market' | 'limit',
        price?: number
    ): Promise<TradeResult>;

    /**
     * Cancel an open order
     */
    cancelOrder(orderId: string, symbol: string): Promise<boolean>;

    /**
     * Cancel ALL open orders (Kill Switch)
     */
    cancelAllOrders(symbol?: string): Promise<string[]>;
}
