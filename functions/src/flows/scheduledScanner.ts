import { db } from '../config.js';
import { runAgent, sessionService } from '../adk/index.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

interface ActiveStrategy {
    id: string;
    userId: string;
    name: string;
    assets: string[];
    interval: string; // e.g., '1h', '4h', '1d'
    status: 'ACTIVE' | 'PAUSED';
    riskProfile: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    maxPositionSize: number;
    mode: 'PAPER' | 'LIVE';
    lastRun?: FirebaseFirestore.Timestamp;
    lastAttempt?: FirebaseFirestore.Timestamp;
    scanLockUntil?: FirebaseFirestore.Timestamp;
}

function parseIntervalToMs(interval: string | undefined): number | null {
    if (!interval) return null;
    const match = interval.trim().match(/^(\d+)\s*([smhd])$/i);
    if (!match) return null;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(value) || value <= 0) return null;
    switch (unit) {
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        default:
            return null;
    }
}

function toMillis(ts?: FirebaseFirestore.Timestamp): number | null {
    if (!ts) return null;
    try {
        return ts.toMillis();
    } catch {
        return null;
    }
}

export async function runMarketScan() {
    console.log('Starting autonomous market scan...');
    
    // 1. Fetch active strategies
    const strategiesSnapshot = await db.collection('strategies')
        .where('status', '==', 'ACTIVE')
        .get();

    if (strategiesSnapshot.empty) {
        console.log('No active strategies found.');
        return { success: true, scanned: 0 };
    }

    const results = [];

    // 2. Iterate through strategies
    for (const doc of strategiesSnapshot.docs) {
        const strategy = { id: doc.id, ...doc.data() } as ActiveStrategy;
        const now = Date.now();
        const intervalMs = parseIntervalToMs(strategy.interval) ?? 60 * 60 * 1000;
        const lockTtlMs = Math.min(intervalMs, 10 * 60 * 1000);

        const lease = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(doc.ref);
            const data = { id: fresh.id, ...fresh.data() } as ActiveStrategy;
            if (!fresh.exists || data.status !== 'ACTIVE') {
                return { shouldRun: false, reason: 'inactive' };
            }

            const lockUntilMs = toMillis(data.scanLockUntil);
            if (lockUntilMs && lockUntilMs > now) {
                return { shouldRun: false, reason: 'locked' };
            }

            const lastRunMs = toMillis(data.lastRun);
            const lastAttemptMs = toMillis(data.lastAttempt);
            const lastActivityMs = Math.max(lastRunMs ?? 0, lastAttemptMs ?? 0);
            if (lastActivityMs && now - lastActivityMs < intervalMs) {
                return { shouldRun: false, reason: 'interval' };
            }

            tx.update(doc.ref, {
                scanLockUntil: Timestamp.fromMillis(now + lockTtlMs),
                lastAttempt: FieldValue.serverTimestamp(),
            });
            return { shouldRun: true };
        });

        if (!lease.shouldRun) {
            results.push({ strategyId: strategy.id, status: 'skipped', reason: lease.reason });
            continue;
        }

        console.log(`Running strategy: ${strategy.name} (${strategy.id}) for user ${strategy.userId}`);

        // 3. Create a dedicated session for this run
        const sessionId = `autotrade_${strategy.id}_${Date.now()}`;
        await sessionService.createSession({
            appName: 'TradeSync',
            userId: strategy.userId,
            sessionId,
            state: {
                strategyContext: strategy,
                autoConfirmTrades: strategy.mode === 'LIVE',
                autoPilotRun: true
            }
        });

        // 4. Construct the prompt for the AutoTraderAgent
        const assetsList = strategy.assets.join(', ');
        const prompt = `
        AUTONOMOUS TRADING RUN
        Strategy: ${strategy.name}
        Risk Profile: ${strategy.riskProfile}
        Max Position Size: $${strategy.maxPositionSize}
        Mode: ${strategy.mode}
        Assets to Scan: ${assetsList}

        Please analyze these assets. If you find a high-probability setup that matches the risk profile:
        1. Verify with technicals and news.
        2. Check portfolio constraints.
        3. Execute the trade using 'execute_trade' with isDryRun=${strategy.mode === 'PAPER'}.
        
        If no trade is found, simply report "No trades executed".
        `;

        // 5. Run the agent
        let agentOutput = '';
        try {
            for await (const event of runAgent(strategy.userId, sessionId, prompt)) {
                for (const part of event.content?.parts ?? []) {
                    if ('text' in part && part.text) {
                        agentOutput += part.text;
                    }
                }
            }

            // 6. Log the run
            await db.collection('strategy_logs').add({
                strategyId: strategy.id,
                userId: strategy.userId,
                timestamp: FieldValue.serverTimestamp(),
                output: agentOutput,
                status: 'SUCCESS'
            });

            // Update last run time
            await doc.ref.update({
                lastRun: FieldValue.serverTimestamp(),
                scanLockUntil: FieldValue.delete()
            });

            results.push({ strategyId: strategy.id, status: 'success' });

        } catch (error) {
            console.error(`Error running strategy ${strategy.id}:`, error);
            
            await db.collection('strategy_logs').add({
                strategyId: strategy.id,
                userId: strategy.userId,
                timestamp: FieldValue.serverTimestamp(),
                error: String(error),
                status: 'FAILED'
            });

            await doc.ref.update({
                scanLockUntil: FieldValue.delete()
            });

            results.push({ strategyId: strategy.id, status: 'failed', error: String(error) });
        }
    }

    return { success: true, scanned: results.length, results };
}
