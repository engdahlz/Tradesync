import { getOrCreateSession, runAgent, sessionService } from '../adk/index.js';
import { ROUTING_STATE_KEY } from '../adk/agents/advisorWorkflowState.js';
import { getResearchRoutingDecision } from '../adk/routing/researchRouting.js';

const defaultPrompts = [
    'Analyze BTC and give me a quick outlook.',
    'Show me a chart of TSLA and key levels.',
    'Any latest news on Nvidia?',
    'Vad ar RSI och hur fungerar det?',
    'Borde jag kopa ETH idag?',
    'Compare SPY vs QQQ for the next month.',
    'Riskhantering for swing trading?',
];

async function persistRoutingState(
    userId: string,
    sessionId: string,
    routing: unknown
): Promise<void> {
    const session = await sessionService.getSession({
        appName: 'TradeSync',
        userId,
        sessionId,
    });

    if (!session) {
        return;
    }

    await sessionService.updateSession({
        appName: 'TradeSync',
        userId,
        sessionId,
        state: {
            ...(session.state || {}),
            [ROUTING_STATE_KEY]: routing,
        },
    });
}

async function runPrompt(userId: string, sessionId: string, message: string, dryRun: boolean): Promise<void> {
    let routing: unknown;

    if (!dryRun) {
        try {
            for await (const _ of runAgent(userId, sessionId, message)) {
                // Consume events to completion.
            }
        } catch (error) {
            console.warn('[RoutingTest] Agent run failed, falling back to heuristic routing.');
            console.warn(error);
            routing = {
                ...getResearchRoutingDecision(message),
                source: 'heuristic',
                createdAt: new Date().toISOString(),
            };
            await persistRoutingState(userId, sessionId, routing);
        }
    }

    if (dryRun) {
        routing = {
            ...getResearchRoutingDecision(message),
            source: 'heuristic',
            createdAt: new Date().toISOString(),
        };
        await persistRoutingState(userId, sessionId, routing);
    }

    const session = await sessionService.getSession({
        appName: 'TradeSync',
        userId,
        sessionId,
    });

    const routingState = routing ?? session?.state?.[ROUTING_STATE_KEY];
    console.log('\n--- Prompt ---');
    console.log(message);
    console.log('--- Routing ---');
    console.log(JSON.stringify(routingState, null, 2));
}

async function main() {
    const prompts = process.argv.slice(2);
    const messages = prompts.length > 0 ? prompts : defaultPrompts;
    const userId = process.env.ROUTING_TEST_USER || 'routing_test_user';
    const sessionId = process.env.ROUTING_TEST_SESSION || `routing_test_${Date.now()}`;
    const dryRun = process.env.ROUTING_TEST_DRY_RUN === 'true';

    const { session } = await getOrCreateSession(userId, sessionId);
    console.log(`Routing test session: ${session.id}`);

    for (const message of messages) {
        try {
            await runPrompt(userId, session.id, message, dryRun);
        } catch (error) {
            console.error(`[RoutingTest] Failed for prompt: "${message}"`);
            console.error(error);
        }
    }
}

main().catch((error) => {
    console.error('[RoutingTest] Unhandled error:', error);
    process.exit(1);
});
