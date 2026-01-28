import {
    BaseAgent,
    type Event,
    InvocationContext,
} from '@google/adk';

type BaseAgentConfig = ConstructorParameters<typeof BaseAgent>[0];

type SelectSubAgents = (context: InvocationContext) => BaseAgent[] | Promise<BaseAgent[]>;

export interface SelectiveParallelAgentConfig extends BaseAgentConfig {
    selectSubAgents?: SelectSubAgents;
}

export class SelectiveParallelAgent extends BaseAgent {
    private readonly selectSubAgents?: SelectSubAgents;

    constructor(config: SelectiveParallelAgentConfig) {
        super(config);
        this.selectSubAgents = config.selectSubAgents;
    }

    protected async *runAsyncImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
        const selected = this.selectSubAgents ? await this.selectSubAgents(context) : this.subAgents;
        const available = new Set(this.subAgents);
        const filtered: BaseAgent[] = [];
        for (const agent of selected) {
            if (available.has(agent) && !filtered.includes(agent)) {
                filtered.push(agent);
            }
        }
        if (filtered.length === 0) {
            return;
        }

        const agentRuns = filtered.map((subAgent) =>
            safeRunAgent(this, subAgent, context)
        );
        for await (const event of mergeAgentRuns(agentRuns)) {
            yield event;
        }
    }

    protected async *runLiveImpl(context: InvocationContext): AsyncGenerator<Event, void, void> {
        throw new Error('This is not supported yet for SelectiveParallelAgent.');
    }
}

function createBranchCtxForSubAgent(
    agent: BaseAgent,
    subAgent: BaseAgent,
    originalContext: InvocationContext
): InvocationContext {
    const invocationContext = new InvocationContext(originalContext);
    const branchSuffix = `${agent.name}.${subAgent.name}`;
    invocationContext.branch = invocationContext.branch
        ? `${invocationContext.branch}.${branchSuffix}`
        : branchSuffix;
    return invocationContext;
}

async function* mergeAgentRuns(
    agentRuns: Array<AsyncGenerator<Event, void, void>>
): AsyncGenerator<Event, void, void> {
    const pendingPromises = new Map<number, Promise<{ result: IteratorResult<Event, void>; index: number }>>();
    for (const [index, generator] of agentRuns.entries()) {
        const promise = generator.next().then((result) => ({ result, index }));
        pendingPromises.set(index, promise);
    }
    while (pendingPromises.size > 0) {
        const { result, index } = await Promise.race(pendingPromises.values());
        if (result.done) {
            pendingPromises.delete(index);
            continue;
        }
        yield result.value;
        const nextPromise = agentRuns[index].next().then((result2) => ({ result: result2, index }));
        pendingPromises.set(index, nextPromise);
    }
}

async function* safeRunAgent(
    parentAgent: BaseAgent,
    subAgent: BaseAgent,
    context: InvocationContext
): AsyncGenerator<Event, void, void> {
    const branchContext = createBranchCtxForSubAgent(parentAgent, subAgent, context);
    try {
        for await (const event of subAgent.runAsync(branchContext)) {
            yield event;
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[SelectiveParallelAgent] Sub-agent ${subAgent.name} failed: ${message}`);
        await recordAgentFailure(branchContext, subAgent);
    }
}

async function recordAgentFailure(context: InvocationContext, subAgent: BaseAgent): Promise<void> {
    const outputKey = (subAgent as { outputKey?: string }).outputKey;
    if (!outputKey || !context.session) {
        return;
    }

    context.session.state = {
        ...(context.session.state || {}),
        [outputKey]: 'Information unavailable.',
    };

    const sessionService = context.sessionService as {
        updateSession?: (request: { appName: string; userId: string; sessionId: string; state: any }) => Promise<void>;
    } | undefined;

    if (sessionService?.updateSession) {
        try {
            await sessionService.updateSession({
                appName: context.session.appName,
                userId: context.session.userId,
                sessionId: context.session.id,
                state: context.session.state,
            });
        } catch (error) {
            console.warn('[SelectiveParallelAgent] Failed to persist agent fallback state:', error);
        }
    }
}
