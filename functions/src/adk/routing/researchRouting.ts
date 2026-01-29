import type { BaseAgent, InvocationContext } from '@google/adk';
import type { Content } from '@google/genai';
import { ROUTING_STATE_KEY } from '../agents/advisorWorkflowState.js';
import {
    memoryResearchAgent,
    newsResearchAgent,
    ragResearchAgent,
    searchResearchAgent,
    signalsResearchAgent,
    technicalResearchAgent,
    vertexRagAgent,
    vertexSearchAgent,
    portfolioResearchAgent,
} from '../agents/research/index.js';
import { enableGoogleSearch, enableVertexRag, enableVertexSearch } from '../agents/research/researchConfig.js';
import { analyzeIntent, type SelectionIntent } from './intentRouter.js';
import { classifyIntentWithLlm } from './intentClassifier.js';
import { advisorWorkflowMode, enableRoutingLlmFallback, isAdvisorWorkflowFast } from './routingConfig.js';

type ClassificationSource = 'heuristic' | 'llm';

type SelectionResult = {
    agents: BaseAgent[];
    reasons: Record<string, string[]>;
    intent: SelectionIntent;
    classifier: ClassificationSource;
};

function extractUserText(content?: Content): string {
    if (!content?.parts) return '';
    return content.parts
        .map(part => ('text' in part ? part.text ?? '' : ''))
        .join(' ')
        .trim();
}

function recordResearchSelection(context: InvocationContext, selection: SelectionResult): void {
    const selectedAgents = selection.agents.map(agent => agent.name);
    const payload = {
        selectedAgents,
        reasons: selection.reasons,
        intent: selection.intent,
        classifier: selection.classifier,
        workflowMode: advisorWorkflowMode,
        source: 'adk',
        createdAt: new Date().toISOString(),
        invocationId: context.invocationId,
    };

    console.log(`[TradeSync] Research routing (${context.invocationId}): ${JSON.stringify({
        selectedAgents,
        reasons: selection.reasons,
        intent: selection.intent,
        classifier: selection.classifier,
        workflowMode: advisorWorkflowMode,
    })}`);

    const session = context.session;
    if (!session) return;

    session.state = {
        ...(session.state || {}),
        [ROUTING_STATE_KEY]: payload,
    };

    const sessionService = context.sessionService as {
        updateSession?: (request: { appName: string; userId: string; sessionId: string; state: any }) => Promise<void>;
    } | undefined;

    if (sessionService?.updateSession) {
        void sessionService.updateSession({
            appName: session.appName,
            userId: session.userId,
            sessionId: session.id,
            state: session.state,
        }).catch((error) => {
            console.warn('[TradeSync] Failed to persist research routing:', error);
        });
    }
}

function buildResearchSelectionFromIntent(
    intent: SelectionIntent,
    classifier: ClassificationSource = 'heuristic'
): SelectionResult {
    const selected = new Set<BaseAgent>();
    const reasons: Record<string, string[]> = {};

    const addAgent = (agent: BaseAgent, reason: string) => {
        if (!selected.has(agent)) {
            selected.add(agent);
        }
        if (!reasons[agent.name]) {
            reasons[agent.name] = [];
        }
        if (!reasons[agent.name].includes(reason)) {
            reasons[agent.name].push(reason);
        }
    };

    const needsFullAnalysis = intent.hasSymbol && (
        intent.isAnalysisRequest
        || intent.isTradeRequest
        || (!intent.wantsNews && !intent.wantsTechnical && !intent.wantsSignals && !intent.wantsKnowledge)
    );

    if (intent.isQuickQuestion && !intent.hasSymbol && !intent.isTradeRequest) {
        addAgent(ragResearchAgent, 'concept question');
        if (intent.wantsMemory) {
            addAgent(memoryResearchAgent, 'user context');
        }
    } else {
        if (needsFullAnalysis) {
            addAgent(signalsResearchAgent, 'symbol analysis');
            addAgent(technicalResearchAgent, 'symbol analysis');
            addAgent(newsResearchAgent, 'symbol analysis');
        } else {
            if (intent.hasSymbol && (intent.wantsSignals || intent.isTradeRequest)) {
                addAgent(signalsResearchAgent, 'signal request');
            }
            if (intent.hasSymbol && (intent.wantsTechnical || intent.isTradeRequest)) {
                addAgent(technicalResearchAgent, 'technical request');
            }
            if ((intent.hasSymbol && (intent.wantsNews || intent.wantsFresh)) || (!intent.hasSymbol && intent.wantsNews)) {
                addAgent(newsResearchAgent, 'news request');
            }
        }

        if (intent.wantsKnowledge || (!intent.hasSymbol && intent.isAnalysisRequest)) {
            addAgent(ragResearchAgent, 'knowledge context');
        }
        if (intent.wantsMemory || intent.isTradeRequest) {
            addAgent(memoryResearchAgent, 'user constraints');
        }
        if (intent.wantsPortfolio || intent.isTradeRequest) {
            addAgent(portfolioResearchAgent, 'portfolio context');
        }
    }

    if (enableGoogleSearch && (intent.wantsFresh || intent.wantsNews || intent.wantsSources)) {
        addAgent(searchResearchAgent, 'fresh sources');
    }
    if (enableVertexSearch && (intent.wantsFresh || intent.wantsSources)) {
        addAgent(vertexSearchAgent, 'private search');
    }
    if (enableVertexRag && (intent.wantsKnowledge || intent.wantsSources)) {
        addAgent(vertexRagAgent, 'private RAG');
    }

    if (selected.size === 0) {
        addAgent(ragResearchAgent, 'fallback');
    }

    return { agents: Array.from(selected), reasons, intent, classifier };
}

function pruneReasons(
    reasons: Record<string, string[]>,
    agents: BaseAgent[]
): Record<string, string[]> {
    const allowed = new Set(agents.map(agent => agent.name));
    const filtered: Record<string, string[]> = {};
    for (const [name, value] of Object.entries(reasons)) {
        if (allowed.has(name)) {
            filtered[name] = value;
        }
    }
    return filtered;
}

function isIntentEmpty(intent: SelectionIntent): boolean {
    return !(
        intent.hasSymbol
        || intent.wantsNews
        || intent.wantsTechnical
        || intent.wantsSignals
        || intent.wantsKnowledge
        || intent.wantsMemory
        || intent.wantsPortfolio
        || intent.wantsFresh
        || intent.wantsSources
        || intent.isTradeRequest
        || intent.isAnalysisRequest
        || intent.isQuickQuestion
    );
}

function isFallbackOnly(selection: SelectionResult): boolean {
    if (selection.agents.length !== 1) {
        return false;
    }
    const [agent] = selection.agents;
    if (agent !== ragResearchAgent) {
        return false;
    }
    return selection.reasons[agent.name]?.includes('fallback') ?? false;
}

function shouldUseLlmFallback(
    rawText: string,
    intent: SelectionIntent,
    selection: SelectionResult
): boolean {
    if (!enableRoutingLlmFallback) return false;
    if (!rawText.trim()) return false;
    if (intent.isTradeRequest || intent.isQuickQuestion) return false;
    if (isIntentEmpty(intent)) return true;
    return isFallbackOnly(selection);
}

function applyAdvisorWorkflowMode(selection: SelectionResult): SelectionResult {
    if (!isAdvisorWorkflowFast) {
        return selection;
    }

    const keepRag = selection.intent.wantsKnowledge
        || selection.intent.isQuickQuestion
        || (!selection.intent.hasSymbol && selection.intent.isAnalysisRequest);
    const keepNews = selection.intent.wantsNews
        || selection.intent.wantsFresh
        || selection.intent.wantsSources;

    const filteredAgents = selection.agents.filter((agent) => {
        if (agent === searchResearchAgent || agent === vertexSearchAgent || agent === vertexRagAgent) {
            return false;
        }
        if (agent === ragResearchAgent && !keepRag) {
            return false;
        }
        if (agent === newsResearchAgent && !keepNews) {
            return false;
        }
        return true;
    });

    if (filteredAgents.length === 0) {
        return selection;
    }

    return {
        ...selection,
        agents: filteredAgents,
        reasons: pruneReasons(selection.reasons, filteredAgents),
    };
}

async function buildResearchSelection(context: InvocationContext): Promise<SelectionResult> {
    const rawText = extractUserText(context.userContent);
    const heuristicIntent = analyzeIntent(rawText);
    let selection = buildResearchSelectionFromIntent(heuristicIntent, 'heuristic');

    if (shouldUseLlmFallback(rawText, heuristicIntent, selection)) {
        const llmIntent = await classifyIntentWithLlm(rawText);
        if (llmIntent) {
            selection = buildResearchSelectionFromIntent(llmIntent, 'llm');
        }
    }

    return applyAdvisorWorkflowMode(selection);
}

export async function selectResearchAgents(context: InvocationContext): Promise<BaseAgent[]> {
    const selection = await buildResearchSelection(context);
    recordResearchSelection(context, selection);
    return selection.agents;
}

export function getResearchRoutingDecision(rawText: string): {
    selectedAgents: string[];
    reasons: Record<string, string[]>;
    intent: SelectionIntent;
    classifier: ClassificationSource;
    workflowMode: string;
} {
    const intent = analyzeIntent(rawText);
    const selection = applyAdvisorWorkflowMode(buildResearchSelectionFromIntent(intent, 'heuristic'));
    return {
        selectedAgents: selection.agents.map(agent => agent.name),
        reasons: selection.reasons,
        intent: selection.intent,
        classifier: selection.classifier,
        workflowMode: advisorWorkflowMode,
    };
}
