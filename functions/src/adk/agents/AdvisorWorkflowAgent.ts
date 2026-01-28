import { SequentialAgent } from '@google/adk';
import { SelectiveParallelAgent } from './SelectiveParallelAgent.js';
import { advisorSynthesisAgent, researchAgents } from './research/index.js';
import { selectResearchAgents } from '../routing/researchRouting.js';

const advisorResearchParallel = new SelectiveParallelAgent({
    name: 'advisor_research_parallel',
    description: 'Runs selected research agents in parallel.',
    subAgents: researchAgents,
    selectSubAgents: selectResearchAgents,
});

export const advisorWorkflowAgent = new SequentialAgent({
    name: 'advisor_workflow_agent',
    description: 'Parallel research + synthesis workflow for trading advice.',
    subAgents: [advisorResearchParallel, advisorSynthesisAgent],
});
