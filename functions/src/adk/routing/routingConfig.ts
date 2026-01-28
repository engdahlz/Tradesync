export const enableRoutingLlmFallback = process.env.ENABLE_ROUTING_LLM_FALLBACK !== 'false';

const workflowModeRaw = (process.env.ADVISOR_WORKFLOW_MODE ?? 'full').trim().toLowerCase();
export const advisorWorkflowMode = workflowModeRaw === 'fast' ? 'fast' : 'full';
export const isAdvisorWorkflowFast = advisorWorkflowMode === 'fast';
