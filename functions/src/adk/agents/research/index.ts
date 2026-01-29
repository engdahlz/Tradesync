import {
    enableGoogleSearch,
    enableVertexRag,
    enableVertexSearch,
} from './researchConfig.js';
import { advisorSynthesisAgent } from './advisorSynthesisAgent.js';
import { memoryResearchAgent } from './memoryResearchAgent.js';
import { newsResearchAgent } from './newsResearchAgent.js';
import { ragResearchAgent } from './ragResearchAgent.js';
import { searchResearchAgent } from './searchResearchAgent.js';
import { signalsResearchAgent } from './signalsResearchAgent.js';
import { technicalResearchAgent } from './technicalResearchAgent.js';
import { vertexRagAgent } from './vertexRagAgent.js';
import { vertexSearchAgent } from './vertexSearchAgent.js';
import { portfolioResearchAgent } from './portfolioResearchAgent.js';

export {
    advisorSynthesisAgent,
    memoryResearchAgent,
    newsResearchAgent,
    ragResearchAgent,
    searchResearchAgent,
    signalsResearchAgent,
    technicalResearchAgent,
    vertexRagAgent,
    vertexSearchAgent,
    portfolioResearchAgent,
};

export const researchAgents = [
    signalsResearchAgent,
    technicalResearchAgent,
    newsResearchAgent,
    ragResearchAgent,
    memoryResearchAgent,
    portfolioResearchAgent,
    ...(enableGoogleSearch ? [searchResearchAgent] : []),
    ...(enableVertexSearch ? [vertexSearchAgent] : []),
    ...(enableVertexRag ? [vertexRagAgent] : []),
];
