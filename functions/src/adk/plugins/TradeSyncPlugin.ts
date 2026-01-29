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
import { createHash } from 'crypto';
import { MODEL_PRO } from '../../config.js';
import { getGenAiClient } from '../../services/genaiClient.js';
import {
    RESEARCH_STATE_KEYS,
    MEMORY_EVENT_COUNT_KEY,
    ROUTING_STATE_KEY,
    RAG_CACHE_STATE_KEYS,
} from '../agents/advisorWorkflowState.js';

interface PluginMetrics {
    agentInvocations: number;
    modelCalls: number;
    toolCalls: number;
    errors: number;
}

interface DurationStats {
    count: number;
    totalMs: number;
    minMs: number;
    maxMs: number;
}

interface RunTelemetry {
    startedAtMs: number;
    agentStartMs: Map<string, number>;
    toolStartMs: Map<string, number>;
    toolNamesByCallId: Map<string, string>;
    agentStats: Record<string, DurationStats>;
    toolStats: Record<string, DurationStats>;
}

function parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const ragContextCacheEnabled = process.env.RAG_CONTEXT_CACHE_ENABLED === 'true';
const ragContextCacheTtlSeconds = parseNumber(process.env.RAG_CONTEXT_CACHE_TTL_SECONDS, 3600);
const ragContextCacheMinChars = parseNumber(process.env.RAG_CONTEXT_CACHE_MIN_CHARS, 280);
const ragContextCacheModel = process.env.RAG_CONTEXT_CACHE_MODEL || MODEL_PRO;

function normalizeRagText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function readStateString(state: Record<string, unknown>, key: string): string {
    const value = state[key];
    return typeof value === 'string' ? value : '';
}

function hashRagText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

function isRagCacheEligible(text: string): boolean {
    if (!ragContextCacheEnabled) return false;
    if (!text || text.length < ragContextCacheMinChars) return false;
    const lower = text.toLowerCase();
    if (lower.includes('no rag lookup needed')) return false;
    if (lower.includes('no relevant information found')) return false;
    return true;
}

function parseExpireTime(expireTime: unknown): number | null {
    if (typeof expireTime !== 'string' || !expireTime) return null;
    const parsed = Date.parse(expireTime);
    return Number.isFinite(parsed) ? parsed : null;
}

function isExpired(expireTime: unknown): boolean {
    const parsed = parseExpireTime(expireTime);
    return parsed !== null && parsed <= Date.now();
}

function redactRagSection(instruction: string): string {
    const lines = instruction.split('\n');
    const startIndex = lines.findIndex(line => line.trimStart().startsWith('- Knowledge Base:'));
    if (startIndex === -1) return instruction;

    const indentMatch = lines[startIndex].match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    let endIndex = startIndex + 1;
    while (endIndex < lines.length) {
        const line = lines[endIndex];
        if (line.startsWith(`${indent}- `)) break;
        endIndex++;
    }

    const updatedLine = `${indent}- Knowledge Base: (cached context provided separately)`;
    return [...lines.slice(0, startIndex), updatedLine, ...lines.slice(endIndex)].join('\n');
}

function redactRagFromSystemInstruction(systemInstruction: unknown): unknown {
    if (typeof systemInstruction === 'string') {
        return redactRagSection(systemInstruction);
    }

    if (!systemInstruction || typeof systemInstruction !== 'object') {
        return systemInstruction;
    }

    const content = systemInstruction as Content;
    if (!Array.isArray(content.parts)) {
        return systemInstruction;
    }

    const parts = content.parts.map(part => {
        if ('text' in part && typeof part.text === 'string') {
            return { ...part, text: redactRagSection(part.text) };
        }
        return part;
    });

    return { ...content, parts };
}

export class TradeSyncPlugin extends BasePlugin {
    private metrics: PluginMetrics;
    private runTelemetry = new Map<string, RunTelemetry>();

    constructor() {
        super('tradesync');
        this.metrics = {
            agentInvocations: 0,
            modelCalls: 0,
            toolCalls: 0,
            errors: 0,
        };
    }

    private initTelemetry(invocationId: string): RunTelemetry {
        const telemetry: RunTelemetry = {
            startedAtMs: Date.now(),
            agentStartMs: new Map(),
            toolStartMs: new Map(),
            toolNamesByCallId: new Map(),
            agentStats: {},
            toolStats: {},
        };
        this.runTelemetry.set(invocationId, telemetry);
        return telemetry;
    }

    private recordStats(stats: Record<string, DurationStats>, key: string, durationMs: number): void {
        const existing = stats[key];
        if (!existing) {
            stats[key] = {
                count: 1,
                totalMs: durationMs,
                minMs: durationMs,
                maxMs: durationMs,
            };
            return;
        }
        existing.count += 1;
        existing.totalMs += durationMs;
        existing.minMs = Math.min(existing.minMs, durationMs);
        existing.maxMs = Math.max(existing.maxMs, durationMs);
    }

    private summarizeStats(stats: Record<string, DurationStats>): Record<string, {
        count: number;
        avgMs: number;
        minMs: number;
        maxMs: number;
        totalMs: number;
    }> {
        const summary: Record<string, {
            count: number;
            avgMs: number;
            minMs: number;
            maxMs: number;
            totalMs: number;
        }> = {};
        for (const [key, value] of Object.entries(stats)) {
            const avgMs = value.count > 0 ? Math.round(value.totalMs / value.count) : 0;
            summary[key] = {
                count: value.count,
                avgMs,
                minMs: value.minMs,
                maxMs: value.maxMs,
                totalMs: value.totalMs,
            };
        }
        return summary;
    }

    override async onUserMessageCallback({
        invocationContext,
        userMessage,
    }: {
        invocationContext: InvocationContext;
        userMessage: Content;
    }): Promise<Content | undefined> {
        void invocationContext;
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
        this.resetMetrics();
        this.initTelemetry(invocationContext.invocationId);
        console.log(`[TradeSync] Run started - Session: ${invocationContext.session?.id}`);
        const session = invocationContext.session;
        if (session) {
            session.state = {
                ...session.state,
                [RESEARCH_STATE_KEYS.signals]: '',
                [RESEARCH_STATE_KEYS.technical]: '',
                [RESEARCH_STATE_KEYS.news]: '',
                [RESEARCH_STATE_KEYS.rag]: '',
                [RESEARCH_STATE_KEYS.memory]: '',
                [RESEARCH_STATE_KEYS.search]: '',
                [RESEARCH_STATE_KEYS.vertexSearch]: '',
                [RESEARCH_STATE_KEYS.vertexRag]: '',
                [ROUTING_STATE_KEY]: '',
            };

            if (invocationContext.sessionService) {
                await (invocationContext.sessionService as any).updateSession({
                    appName: session.appName,
                    userId: session.userId,
                    sessionId: session.id,
                    state: session.state,
                });
            }
        }
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
        const telemetry = this.runTelemetry.get(callbackContext.invocationId)
            ?? this.initTelemetry(callbackContext.invocationId);
        telemetry.agentStartMs.set(agent.name, Date.now());
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
        const telemetry = this.runTelemetry.get(callbackContext.invocationId);
        const startedAt = telemetry?.agentStartMs.get(agent.name);
        if (telemetry && startedAt !== undefined) {
            const durationMs = Date.now() - startedAt;
            telemetry.agentStartMs.delete(agent.name);
            this.recordStats(telemetry.agentStats, agent.name, durationMs);
            console.log(`[TradeSync] Agent done: ${agent.name} (${durationMs}ms)`);
        } else {
            console.log(`[TradeSync] Agent done: ${agent.name}`);
        }
        if (agent.name === 'rag_research_agent' && ragContextCacheEnabled) {
            const session = callbackContext.invocationContext.session;
            const sessionService = callbackContext.invocationContext.sessionService;
            const ragText = normalizeRagText(session?.state?.[RESEARCH_STATE_KEYS.rag]);
            const existingName = readStateString(session.state, RAG_CACHE_STATE_KEYS.cachedContent);
            const existingHash = readStateString(session.state, RAG_CACHE_STATE_KEYS.cachedContentHash);
            const existingModel = readStateString(session.state, RAG_CACHE_STATE_KEYS.cachedContentModel);
            const existingExpiresAt = session.state?.[RAG_CACHE_STATE_KEYS.cachedContentExpiresAt];

            if (!isRagCacheEligible(ragText)) {
                if (existingName || existingHash) {
                    session.state = {
                        ...session.state,
                        [RAG_CACHE_STATE_KEYS.cachedContent]: '',
                        [RAG_CACHE_STATE_KEYS.cachedContentHash]: '',
                        [RAG_CACHE_STATE_KEYS.cachedContentExpiresAt]: '',
                        [RAG_CACHE_STATE_KEYS.cachedContentModel]: '',
                    };
                    if (sessionService) {
                        await (sessionService as any).updateSession({
                            appName: session.appName,
                            userId: session.userId,
                            sessionId: session.id,
                            state: session.state,
                        });
                    }
                }
                return undefined;
            }

            const ragHash = hashRagText(ragText);
            const cacheExpired = isExpired(existingExpiresAt);
            const cacheMatches = !!existingName && existingHash === ragHash && existingModel === ragContextCacheModel && !cacheExpired;
            if (cacheMatches) {
                return undefined;
            }

            try {
                const ai = getGenAiClient();
                const response = await ai.caches.create({
                    model: ragContextCacheModel,
                    config: {
                        contents: [{
                            role: 'user',
                            parts: [{ text: `Knowledge Base Context:\n${ragText}` }],
                        }],
                        displayName: `rag-context-${ragHash.slice(0, 10)}`,
                        ttl: `${ragContextCacheTtlSeconds}s`,
                    },
                });

                if (response?.name) {
                    session.state = {
                        ...session.state,
                        [RAG_CACHE_STATE_KEYS.cachedContent]: response.name,
                        [RAG_CACHE_STATE_KEYS.cachedContentHash]: ragHash,
                        [RAG_CACHE_STATE_KEYS.cachedContentExpiresAt]: response.expireTime ?? '',
                        [RAG_CACHE_STATE_KEYS.cachedContentModel]: ragContextCacheModel,
                    };
                    if (sessionService) {
                        await (sessionService as any).updateSession({
                            appName: session.appName,
                            userId: session.userId,
                            sessionId: session.id,
                            state: session.state,
                        });
                    }
                    console.log(`[TradeSync] RAG context cached: ${response.name}`);
                }
            } catch (error) {
                console.warn('[TradeSync] Failed to create RAG context cache:', error);
            }
        }

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

        if (callbackContext.agentName === 'advisor_synthesis_agent' && ragContextCacheEnabled) {
            const session = callbackContext.invocationContext.session;
            const ragText = normalizeRagText(session?.state?.[RESEARCH_STATE_KEYS.rag]);
            const cachedName = readStateString(session.state, RAG_CACHE_STATE_KEYS.cachedContent);
            const cachedHash = readStateString(session.state, RAG_CACHE_STATE_KEYS.cachedContentHash);
            const cachedModel = readStateString(session.state, RAG_CACHE_STATE_KEYS.cachedContentModel);
            const cachedExpiresAt = session.state?.[RAG_CACHE_STATE_KEYS.cachedContentExpiresAt];

            if (cachedName && ragText) {
                const ragHash = hashRagText(ragText);
                const cacheExpired = isExpired(cachedExpiresAt);
                const modelMatches = !cachedModel || cachedModel === (llmRequest.model ?? ragContextCacheModel);
                if (cacheExpired) {
                    session.state = {
                        ...session.state,
                        [RAG_CACHE_STATE_KEYS.cachedContent]: '',
                        [RAG_CACHE_STATE_KEYS.cachedContentHash]: '',
                        [RAG_CACHE_STATE_KEYS.cachedContentExpiresAt]: '',
                        [RAG_CACHE_STATE_KEYS.cachedContentModel]: '',
                    };
                    const sessionService = callbackContext.invocationContext.sessionService;
                    if (sessionService) {
                        await (sessionService as any).updateSession({
                            appName: session.appName,
                            userId: session.userId,
                            sessionId: session.id,
                            state: session.state,
                        });
                    }
                } else if (cachedHash === ragHash && modelMatches) {
                    llmRequest.config = llmRequest.config || {};
                    if (!llmRequest.config.cachedContent) {
                        llmRequest.config.cachedContent = cachedName;
                        llmRequest.config.systemInstruction = redactRagFromSystemInstruction(
                            llmRequest.config.systemInstruction
                        ) as any;
                        console.log('[TradeSync] Using cached RAG context for synthesis.');
                    }
                }
            }
        }

        return undefined;
    }

    override async afterModelCallback({
        callbackContext,
        llmResponse,
    }: {
        callbackContext: CallbackContext;
        llmResponse: LlmResponse;
    }): Promise<LlmResponse | undefined> {
        void callbackContext;
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
        void callbackContext;
        void llmRequest;
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
        const safeInvocationContext = invocationContext ?? toolContext.invocationContext;
        const invocationId = safeInvocationContext?.invocationId;
        if (invocationId) {
            const telemetry = this.runTelemetry.get(invocationId)
                ?? this.initTelemetry(invocationId);
            const callId = toolContext.functionCallId ?? tool.name;
            telemetry.toolStartMs.set(callId, Date.now());
            telemetry.toolNamesByCallId.set(callId, tool.name);
        }

        if (tool.name === 'execute_trade') {
            if (!safeInvocationContext) {
                return undefined;
            }
            const isDryRun = typeof toolArgs.isDryRun === 'boolean' ? toolArgs.isDryRun : undefined;
            const shouldDryRun = isDryRun ?? true;
            const liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
            const executeLive = liveTradingEnabled && shouldDryRun === false;

            if (!executeLive) {
                return undefined;
            }

            const state = safeInvocationContext.session?.state as any;
            if (!state?.pendingTradeConfirmed) {
                console.log(`[TradeSync] 🛑 Intercepting high-risk tool: execute_trade`);
                
                // Store pending trade and set awaiting confirmation
                if (safeInvocationContext.session && safeInvocationContext.sessionService) {
                    safeInvocationContext.session.state = {
                        ...safeInvocationContext.session.state,
                        pendingTrade: toolArgs,
                        awaitingConfirmation: true
                    };
                    
                    await (safeInvocationContext.sessionService as any).updateSession({
                        appName: safeInvocationContext.session.appName,
                        userId: safeInvocationContext.session.userId,
                        sessionId: safeInvocationContext.session.id,
                        state: safeInvocationContext.session.state,
                    });
                }

                return {
                    blocked: true,
                    message: `⚠️ CONFIRM TRADE: Please confirm the execution of ${toolArgs.side} ${toolArgs.quantity} ${toolArgs.symbol} @ ${toolArgs.price || 'market'}. Respond with "CONFIRM" to proceed.`,
                };
            } else {
                console.log(`[TradeSync] ✅ execute_trade confirmed, allowing execution`);
                
                // Reset confirmation flags
                if (safeInvocationContext.session && safeInvocationContext.sessionService) {
                    const newState = { ...safeInvocationContext.session.state };
                    delete newState.pendingTradeConfirmed;
                    delete newState.pendingTrade;
                    delete newState.awaitingConfirmation;
                    safeInvocationContext.session.state = newState;

                    await (safeInvocationContext.sessionService as any).updateSession({
                        appName: safeInvocationContext.session.appName,
                        userId: safeInvocationContext.session.userId,
                        sessionId: safeInvocationContext.session.id,
                        state: safeInvocationContext.session.state,
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
        void toolArgs;
        void result;
        const invocationId = toolContext.invocationContext?.invocationId;
        const telemetry = invocationId ? this.runTelemetry.get(invocationId) : undefined;
        const callId = toolContext.functionCallId ?? tool.name;
        const startedAt = telemetry?.toolStartMs.get(callId);
        if (telemetry && startedAt !== undefined) {
            const durationMs = Date.now() - startedAt;
            telemetry.toolStartMs.delete(callId);
            const toolName = telemetry.toolNamesByCallId.get(callId) ?? tool.name;
            this.recordStats(telemetry.toolStats, toolName, durationMs);
        }
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
        void toolArgs;
        void toolContext;
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
        void invocationContext;
        void event;
        return undefined;
    }

    override async afterRunCallback({
        invocationContext,
    }: {
        invocationContext: InvocationContext;
    }): Promise<void> {
        const telemetry = this.runTelemetry.get(invocationContext.invocationId);
        if (telemetry) {
            const totalMs = Date.now() - telemetry.startedAtMs;
            const agentStats = this.summarizeStats(telemetry.agentStats);
            const toolStats = this.summarizeStats(telemetry.toolStats);
            console.log(`[TradeSync] Run telemetry ${invocationContext.invocationId}: ${JSON.stringify({
                totalMs,
                agentStats,
                toolStats,
            })}`);
            this.runTelemetry.delete(invocationContext.invocationId);
        }

        console.log(`[TradeSync] Run done - Agents: ${this.metrics.agentInvocations}, Models: ${this.metrics.modelCalls}, Tools: ${this.metrics.toolCalls}`);

        const session = invocationContext.session;
        const memoryService = invocationContext.memoryService;
        const memoryEvery = Number(process.env.MEMORY_SAVE_EVERY_EVENTS ?? 6);

        if (!session || !memoryService || memoryEvery <= 0) {
            return;
        }

        const eventCount = session.events?.length ?? 0;
        const lastCountRaw = session.state?.[MEMORY_EVENT_COUNT_KEY];
        const lastCount = typeof lastCountRaw === 'number' ? lastCountRaw : Number(lastCountRaw ?? 0);

        if (eventCount >= lastCount + memoryEvery) {
            try {
                await memoryService.addSessionToMemory(session);
                session.state = {
                    ...session.state,
                    [MEMORY_EVENT_COUNT_KEY]: eventCount,
                };
                if (invocationContext.sessionService) {
                    await (invocationContext.sessionService as any).updateSession({
                        appName: session.appName,
                        userId: session.userId,
                        sessionId: session.id,
                        state: session.state,
                    });
                }
            } catch (error) {
                console.warn('[TradeSync] Memory save failed:', error);
            }
        }
    }

    getMetrics(): PluginMetrics {
        return { ...this.metrics };
    }

    resetMetrics(): void {
        this.metrics = { agentInvocations: 0, modelCalls: 0, toolCalls: 0, errors: 0 };
    }
}
