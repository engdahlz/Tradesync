export declare function runMarketScan(): Promise<{
    timestamp: string;
    scanned: number;
    results: ({
        asset: string;
        signal: "BUY" | "SELL" | "HOLD";
        confidence: number;
        summary: string;
        error?: undefined;
    } | {
        asset: string;
        error: string;
        signal?: undefined;
        confidence?: undefined;
        summary?: undefined;
    })[];
}>;
//# sourceMappingURL=scheduledScanner.d.ts.map