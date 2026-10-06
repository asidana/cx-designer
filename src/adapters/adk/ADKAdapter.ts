/**
 * AWS ADK Adapter — integrates AWS Agent Development Kit agents as canvas nodes.
 * 
 * ADK provides:
 * - DynamoDB session persistence
 * - Bedrock guardrails
 * - Knowledge base integration
 * - Declarative agent definitions
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface ADKTool {
  name: string;
  description: string;
  function: string;
}

interface ADKKnowledgeBase {
  id: string;
  description: string;
}

interface ADKConfig {
  name: string;
  model: string;
  instruction: string;
  tools: ADKTool[];
  knowledgeBases: ADKKnowledgeBase[];
  session: {
    type: 'dynamodb';
    tableName: string;
  };
}

export class ADKAdapter {
  /**
   * Import an ADK agent definition → Flow JSON
   */
  static importFromADK(config: ADKConfig): Partial<import('../../types/node').FlowGraph> {
    return {
      name: config.name,
      version: '1.0.0',
      nodes: [
        {
          id: 'adk_agent',
          type: 'agentic.adk',
          position: { x: 100, y: 200 },
          data: {
            config: {
              name: config.name,
              model: config.model,
              instruction: config.instruction,
              tools: config.tools,
              knowledgeBases: config.knowledgeBases,
              session: config.session
            },
            label: config.name,
            description: 'AWS ADK agent with DynamoDB sessions'
          }
        }
      ],
      edges: []
    };
  }

  /**
   * Execute an ADK agent (runtime)
   */
  static async execute(
    config: ADKConfig,
    context: ExecutionContext
  ): Promise<NodeResult> {
    // In real implementation:
    // 1. Create ADK agent
    // 2. Get or create DynamoDB session
    // 3. Execute with knowledge bases
    // 4. Return result

    // Mock implementation
    return {
      outputs: {
        response: 'ADK agent response',
        sessionState: {}
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  }
}

/**
 * ADK Node Definition — for use in the canvas
 */
export const adkNode: NodeDefinition = {
  type: 'agentic.adk',
  category: 'agentic',
  label: 'AWS ADK Agent',
  description: 'AWS Agent Development Kit with DynamoDB sessions and knowledge bases',
  icon: '☁️',
  color: '#f59e0b',
  inputs: [
    { id: 'input', type: 'text', label: 'User Input', required: true }
  ],
  outputs: [
    { id: 'response', type: 'text', label: 'Agent Response' },
    { id: 'sessionState', type: 'json', label: 'Session State' }
  ],
  configSchema: [
    {
      name: 'name',
      label: 'Agent Name',
      type: 'string',
      placeholder: 'customer_support_agent',
      required: true
    },
    {
      name: 'model',
      label: 'Bedrock Model',
      type: 'select',
      options: [
        { label: 'Claude Sonnet 4', value: 'bedrock.claude-sonnet-4-20250514' },
        { label: 'Claude Haiku', value: 'bedrock.claude-haiku-4-20250514' },
        { label: 'Llama 3.3 70B', value: 'bedrock.llama-3.3-70b' }
      ],
      default: 'bedrock.claude-sonnet-4-20250514',
      required: true
    },
    {
      name: 'instruction',
      label: 'Instruction',
      type: 'textarea',
      placeholder: 'You are a customer support agent...',
      description: 'Agent instruction (system prompt)'
    },
    {
      name: 'tools',
      label: 'Tools (JSON)',
      type: 'json',
      default: [],
      description: 'Array of {name, description, function} objects'
    },
    {
      name: 'knowledgeBases',
      label: 'Knowledge Bases (JSON)',
      type: 'json',
      default: [],
      description: 'Array of {id, description} objects'
    },
    {
      name: 'session.tableName',
      label: 'DynamoDB Session Table',
      type: 'string',
      default: 'agent-sessions',
      description: 'DynamoDB table for session persistence'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as ADKConfig;
    
    // In real implementation:
    // 1. Create ADK agent
    // 2. Get or create DynamoDB session
    // 3. Execute with knowledge bases
    // 4. Return result

    return {
      outputs: {
        response: 'ADK agent response',
        sessionState: {}
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['name']) {
      errors.push({ field: 'name', message: 'Agent name is required' });
    }
    
    if (!config['model']) {
      errors.push({ field: 'model', message: 'Bedrock model is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  get config(): ADKConfig {
    return this._config;
  }

  private _config: ADKConfig = {
    name: 'agent',
    model: 'bedrock.claude-sonnet-4-20250514',
    instruction: '',
    tools: [],
    knowledgeBases: [],
    session: {
      type: 'dynamodb',
      tableName: 'agent-sessions'
    }
  };
};
