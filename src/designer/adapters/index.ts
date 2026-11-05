/**
 * Framework Adapters Index
 * 
 * Register all framework adapters:
 *   import './adapters';
 */

import { nodeRegistry } from '../nodes/registry';
import { langGraphNode } from './langgraph/LangGraphAdapter';
import { strandsNode } from './strands/StrandsAdapter';
import { adkNode } from './adk/ADKAdapter';

export function registerFrameworkAdapters(): void {
  // Agent Framework Adapters
  nodeRegistry.register(langGraphNode);
  nodeRegistry.register(strandsNode);
  nodeRegistry.register(adkNode);
  
  // TODO: Register more adapters
  // nodeRegistry.register(langChainNode);
  // nodeRegistry.register(autoGenNode);
  // nodeRegistry.register(crewAINode);
  // nodeRegistry.register(pydanticAINode);
  // nodeRegistry.register(llamaIndexNode);
}

// Auto-register on import
registerFrameworkAdapters();
