import {
    BasePlugin,
    type BaseAgent,
    type BaseTool,
    type CallbackContext,
    type InvocationContext,
    type LlmRequest,
    type LlmResponse,
    type ToolContext,
    type Event,
} from '@google/adk';
import type { Content } from '@google/genai';

interface PluginMetrics {
    agentInvocations: number;
    modelCalls: number;
    toolCalls: number;
    errors: number;
}

export class TradeSyncPlugin extends BasePlugin {
    private metrics: PluginMetrics;

    constructor() {
        super('tradesync');
        this.metrics = {
            agentInvocations: 0,
            modelCalls: 0,
            toolCalls: 0,
            errors: 0,
        };
    }

    override async onUserMessageCallback({
        invocationContext,
        userMessage,
    }: {
        invocationContext: InvocationContext;
        userMessage: Content;
    }): Promise<Content | undefined> {
        const text = userMessage.parts?.[0] && 'text' in userMessage.parts[0]
            ? userMessage.parts[0].text ?? '[empty]'
            : '[non-text content]';
        console.log(`[TradeSync] User: "${text.slice(0, 100)}..."`);
        return undefined;
    }

    override async beforeRunCallback({
        invocationContext,
    }: {
        invocationContext: InvocationContext;
    }): Promise<Content | undefined> {
        console.log(`[TradeSync] Run started - Session: ${invocationContext.session?.id}`);
        return undefined;
    }

    override async beforeAgentCallback({
        agent,
        callbackContext,
    }: {
        agent: BaseAgent;
        callbackContext: CallbackContext;
    }): Promise<Content | undefined> {
        this.metrics.agentInvocations++;
        console.log(`[TradeSync] Agent: ${agent.name} (#${this.metrics.agentInvocations})`);
        return undefined;
    }

    override async afterAgentCallback({
        agent,
        callbackContext,
    }: {
        agent: BaseAgent;
        callbackContext: CallbackContext;
    }): Promise<Content | undefined> {
        console.log(`[TradeSync] Agent done: ${agent.name}`);
        return undefined;
    }

    override async beforeModelCallback({
        callbackContext,
        llmRequest,
    }: {
        callbackContext: CallbackContext;
        llmRequest: LlmRequest;
    }): Promise<LlmResponse | undefined> {
        this.metrics.modelCalls++;
        console.log(`[TradeSync] Model call #${this.metrics.modelCalls}`);
        return undefined;
    }

    override async afterModelCallback({
        callbackContext,
        llmResponse,
    }: {
        callbackContext: CallbackContext;
        llmResponse: LlmResponse;
    }): Promise<LlmResponse | undefined> {
        const usage = llmResponse.usageMetadata;
        if (usage) {
            console.log(`[TradeSync] Tokens: ${usage.totalTokenCount}`);
        }
        return undefined;
    }

    override async onModelErrorCallback({
        callbackContext,
        llmRequest,
        error,
    }: {
        callbackContext: CallbackContext;
        llmRequest: LlmRequest;
        error: Error;
    }): Promise<LlmResponse | undefined> {
        this.metrics.errors++;
        console.error(`[TradeSync] Model error:`, error.message);
        return undefined;
    }

    override async beforeToolCallback({
        tool,
        toolArgs,
        toolContext,
        invocationContext,
    }: {
        tool: BaseTool;
        toolArgs: Record<string, unknown>;
        toolContext: ToolContext;
        invocationContext: InvocationContext;
    }): Promise<Record<string, unknown> | undefined> {
        this.metrics.toolCalls++;
        console.log(`[TradeSync] Tool: ${tool.name} (${JSON.stringify(toolArgs).slice(0, 100)})`);

        if (tool.name === 'execute_trade') {
            const state = invocationContext.session?.state as any;
            if (!state?.pendingTradeConfirmed) {
                console.log(`[TradeSync] 🛑 Intercepting high-risk tool: execute_trade`);
                
                // Store pending trade and set awaiting confirmation
                if (invocationContext.session && invocationContext.sessionService) {
                    invocationContext.session.state = {
                        ...invocationContext.session.state,
                        pendingTrade: toolArgs,
                        awaitingConfirmation: true
                    };
                    
                    await (invocationContext.sessionService as any).updateSession({
                        appName: invocationContext.session.appName,
                        userId: invocationContext.session.userId,
                        sessionId: invocationContext.session.id,
                        state: invocationContext.session.state,
                    });
                }

                return {
                    blocked: true,
                    message: `⚠️ CONFIRM TRADE: Please confirm the execution of ${toolArgs.side} ${toolArgs.quantity} ${toolArgs.symbol} @ ${toolArgs.price || 'market'}. Respond with "CONFIRM" to proceed.`,
                };
            } else {
                console.log(`[TradeSync] ✅ execute_trade confirmed, allowing execution`);
                
                // Reset confirmation flags
                if (invocationContext.session && invocationContext.sessionService) {
                    const newState = { ...invocationContext.session.state };
                    delete newState.pendingTradeConfirmed;
                    delete newState.pendingTrade;
                    delete newState.awaitingConfirmation;
                    invocationContext.session.state = newState;

                    await (invocationContext.sessionService as any).updateSession({
                        appName: invocationContext.session.appName,
                        userId: invocationContext.session.userId,
                        sessionId: invocationContext.session.id,
                        state: invocationContext.session.state,
                    });
                }
                return undefined;
            }
        }

        return undefined;
    }

    override async afterToolCallback({
        tool,
        toolArgs,
        toolContext,
        result,
    }: {
        tool: BaseTool;
        toolArgs: Record<string, unknown>;
        toolContext: ToolContext;
        result: Record<string, unknown>;
    }): Promise<Record<string, unknown> | undefined> {
        console.log(`[TradeSync] Tool done: ${tool.name}`);
        return undefined;
    }

    override async onToolErrorCallback({
        tool,
        toolArgs,
        toolContext,
        error,
    }: {
        tool: BaseTool;
        toolArgs: Record<string, unknown>;
        toolContext: ToolContext;
        error: Error;
    }): Promise<Record<string, unknown> | undefined> {
        this.metrics.errors++;
        console.error(`[TradeSync] Tool error in ${tool.name}:`, error.message);
        return { error: true, message: error.message };
    }

    override async onEventCallback({
        invocationContext,
        event,
    }: {
        invocationContext: InvocationContext;
        event: Event;
    }): Promise<Event | undefined> {
        return undefined;
    }

    override async afterRunCallback({
        invocationContext,
    }: {
        invocationContext: InvocationContext;
    }): Promise<void> {
        console.log(`[TradeSync] Run done - Agents: ${this.metrics.agentInvocations}, Models: ${this.metrics.modelCalls}, Tools: ${this.metrics.toolCalls}`);
    }

    getMetrics(): PluginMetrics {
        return { ...this.metrics };
    }

    resetMetrics(): void {
        this.metrics = { agentInvocations: 0, modelCalls: 0, toolCalls: 0, errors: 0 };
    }
}
