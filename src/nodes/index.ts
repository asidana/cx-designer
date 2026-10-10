/**
 * Node Registration — registers all built-in nodes.
 * 
 * Import this file to register all nodes:
 *   import './nodes';
 */

import { nodeRegistry } from './registry';
export { nodeRegistry } from './registry';
import { voiceInputNode } from './voice/voiceInput';
import { voiceOutputNode } from './voice/voiceOutput';
import { chatInputNode } from './chat/chatInput';
import { chatOutputNode } from './chat/chatOutput';
import { pageAssistantNode } from './chat/pageAssistant';
import { intentClassifierNode } from './agentic/intentClassifier';
import { reasoningLoopNode } from './agentic/reasoningLoop';
import { webcrawlerNode } from './agentic/webcrawler';
import { ragNode } from './agentic/ragNode';
import { memoryNode } from './agentic/memoryNode';
import { slotCollectorNode } from './deterministic/slotCollector';
import { businessRuleNode } from './deterministic/businessRule';
import { humanHandoffNode } from './deterministic/humanHandoff';
import { guardrailNode } from './governance/guardrail';
import { sentinelNode } from './governance/sentinel';
import { httpRequestNode } from './integration/httpRequest';
import { conditionalRouterNode } from './control/conditionalRouter';
import { telephonyNode } from './integration/telephonyNode';
import { webhookNode } from './integration/webhookNode';
import { databaseNode } from './integration/databaseNode';
import { streamlinkNode } from './integration/streamlink';
import { subflowNode } from './control/subflowNode';
import { parallelNode } from './control/parallelNode';
import { waitNode } from './control/waitNode';

// Register built-in nodes
export function registerBuiltInNodes(): void {
  // Voice Layer
  nodeRegistry.register(voiceInputNode);
  nodeRegistry.register(voiceOutputNode);

  // Chat Layer
  nodeRegistry.register(chatInputNode);
  nodeRegistry.register(chatOutputNode);
  nodeRegistry.register(pageAssistantNode);
  
  // Agentic Layer
  nodeRegistry.register(intentClassifierNode);
  nodeRegistry.register(reasoningLoopNode);
  nodeRegistry.register(webcrawlerNode);
  nodeRegistry.register(ragNode);
  nodeRegistry.register(memoryNode);
  
  // Deterministic Layer
  nodeRegistry.register(slotCollectorNode);
  nodeRegistry.register(businessRuleNode);
  nodeRegistry.register(humanHandoffNode);
  
  // Control Flow
  nodeRegistry.register(conditionalRouterNode);
  nodeRegistry.register(subflowNode);
  nodeRegistry.register(parallelNode);
  nodeRegistry.register(waitNode);
  
  // Governance
  nodeRegistry.register(guardrailNode);
  nodeRegistry.register(sentinelNode);
  
  // Integration
  nodeRegistry.register(httpRequestNode);
  nodeRegistry.register(telephonyNode);
  nodeRegistry.register(webhookNode);
  nodeRegistry.register(databaseNode);
  nodeRegistry.register(streamlinkNode);
}

// Auto-register on import
registerBuiltInNodes();

// Register framework adapters
import '../adapters';
