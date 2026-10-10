/**
 * Custom Node SDK — build your own node types
 * 
 * Usage:
 *   import { CustomNodeSDK } from './sdk/CustomNodeSDK';
 *   
 *   const myNode = CustomNodeSDK.create({
 *     type: 'my.custom_node',
 *     category: 'integration',
 *     label: 'My Custom Node',
 *     description: 'Does something custom',
 *     icon: '🔧',
 *     color: '#ff6b6b',
 *     inputs: [{ id: 'input', type: 'text', label: 'Input' }],
 *     outputs: [{ id: 'output', type: 'text', label: 'Output' }],
 *     configSchema: [...],
 *     execute: async (context) => {
 *       const input = context.variables.get('input');
 *       // Your custom logic here
 *       return {
 *         outputs: { output: `Processed: ${input}` },
 *         nextNodes: [],
 *         variableUpdates: {},
 *         guardrailViolations: [],
 *         auditEvents: []
 *       };
 *     }
 *   });
 *   
 *   nodeRegistry.register(myNode);
 */

import { NodeDefinition, NodeConfig, ExecutionContext, NodeResult, ConfigSchemaField, HandleDefinition } from '../types/node';
import { nodeRegistry } from '../nodes/registry';

export interface CustomNodeConfig {
  type: string;
  category: NodeDefinition['category'];
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  configSchema: ConfigSchemaField[];
  execute: (context: ExecutionContext) => Promise<NodeResult>;
  validate?: (config: NodeConfig) => { valid: boolean; errors: Array<{ field: string; message: string }> };
}

export class CustomNodeSDK {
  /**
   * Create a custom node definition
   */
  static create(config: CustomNodeConfig): NodeDefinition {
    return {
      type: config.type as NodeDefinition['type'],
      category: config.category,
      label: config.label,
      description: config.description,
      icon: config.icon,
      color: config.color,
      inputs: config.inputs,
      outputs: config.outputs,
      configSchema: config.configSchema,
      execute: config.execute,
      validate: config.validate || (() => ({ valid: true, errors: [] }))
    };
  }

  /**
   * Register a custom node
   */
  static register(config: CustomNodeConfig): void {
    const node = this.create(config);
    nodeRegistry.register(node);
  }

  /**
   * Create a simple HTTP node
   */
  static createHttpNode(config: {
    type: string;
    label: string;
    description: string;
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
  }): NodeDefinition {
    return this.create({
      type: config.type,
      category: 'integration',
      label: config.label,
      description: config.description,
      icon: '🌐',
      color: '#6366f1',
      inputs: [{ id: 'input', type: 'any', label: 'Input' }],
      outputs: [
        { id: 'response', type: 'json', label: 'Response' },
        { id: 'status', type: 'number', label: 'Status Code' }
      ],
      configSchema: [
        { name: 'url', label: 'URL', type: 'string', default: config.url, required: true },
        { name: 'method', label: 'Method', type: 'select', options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' }
        ], default: config.method || 'GET' }
      ],
      execute: async (_context: ExecutionContext): Promise<NodeResult> => {
        // In real implementation: make HTTP request
        return {
          outputs: { response: {}, status: 200 },
          nextNodes: [],
          variableUpdates: {},
          guardrailViolations: [],
          auditEvents: []
        };
      }
    });
  }

  /**
   * Create a simple LLM node
   */
  static createLLMNode(config: {
    type: string;
    label: string;
    description: string;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
  }): NodeDefinition {
    return this.create({
      type: config.type,
      category: 'agentic',
      label: config.label,
      description: config.description,
      icon: '🧠',
      color: '#8b5cf6',
      inputs: [{ id: 'input', type: 'text', label: 'User Input', required: true }],
      outputs: [{ id: 'response', type: 'text', label: 'LLM Response' }],
      configSchema: [
        { name: 'model', label: 'Model', type: 'select', options: [
          { label: 'GPT-4o', value: 'gpt-4o' },
          { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
          { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' }
        ], default: config.model || 'gpt-4o' },
        { name: 'systemPrompt', label: 'System Prompt', type: 'textarea', default: config.systemPrompt || '' },
        { name: 'temperature', label: 'Temperature', type: 'number', default: config.temperature ?? 0.7 }
      ],
      execute: async (_context: ExecutionContext): Promise<NodeResult> => {
        // In real implementation: call LLM
        return {
          outputs: { response: 'LLM response' },
          nextNodes: [],
          variableUpdates: {},
          guardrailViolations: [],
          auditEvents: []
        };
      }
    });
  }

  /**
   * Create a simple guardrail node
   */
  static createGuardrailNode(config: {
    type: string;
    label: string;
    description: string;
    checkType: 'pii' | 'toxicity' | 'injection' | 'custom';
    customUrl?: string;
  }): NodeDefinition {
    return this.create({
      type: config.type,
      category: 'governance',
      label: config.label,
      description: config.description,
      icon: '🛡️',
      color: '#f97316',
      inputs: [{ id: 'input', type: 'text', label: 'Content to Check', required: true }],
      outputs: [
        { id: 'allowed', type: 'boolean', label: 'Allowed' },
        { id: 'violations', type: 'json', label: 'Violations' }
      ],
      configSchema: [
        { name: 'checkType', label: 'Check Type', type: 'select', options: [
          { label: 'PII', value: 'pii' },
          { label: 'Toxicity', value: 'toxicity' },
          { label: 'Injection', value: 'injection' },
          { label: 'Custom', value: 'custom' }
        ], default: config.checkType },
        { name: 'customUrl', label: 'Custom URL', type: 'string', default: config.customUrl || '' }
      ],
      execute: async (_context: ExecutionContext): Promise<NodeResult> => {
        // In real implementation: run guardrail check
        return {
          outputs: { allowed: true, violations: [] },
          nextNodes: [],
          variableUpdates: {},
          guardrailViolations: [],
          auditEvents: []
        };
      }
    });
  }
}

// ============================================
// Example: Create a custom node
// ============================================

/*
import { CustomNodeSDK } from './sdk/CustomNodeSDK';

// Register a custom sentiment analysis node
CustomNodeSDK.register({
  type: 'my.sentiment_analysis',
  category: 'agentic',
  label: 'Sentiment Analysis',
  description: 'Analyze sentiment of user message',
  icon: '😊',
  color: '#ec4899',
  inputs: [{ id: 'input', type: 'text', label: 'Text', required: true }],
  outputs: [
    { id: 'sentiment', type: 'text', label: 'Sentiment' },
    { id: 'score', type: 'number', label: 'Score' }
  ],
  configSchema: [
    { name: 'model', label: 'Model', type: 'select', options: [
      { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
      { label: 'Claude Haiku', value: 'claude-haiku-4-20250514' }
    ], default: 'gpt-4o-mini' }
  ],
  execute: async (context) => {
    const text = context.variables.get('input') as string;
    
    // Call your sentiment analysis logic
    const result = await analyzeSentiment(text);
    
    return {
      outputs: {
        sentiment: result.sentiment,
        score: result.score
      },
      nextNodes: [],
      variableUpdates: { sentiment: result.sentiment },
      guardrailViolations: [],
      auditEvents: []
    };
  }
});
*/
