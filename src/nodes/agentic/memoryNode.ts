/**
 * Memory Node — Short-term and long-term memory
 * 
 * Manages conversation history and persistent user memory.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

interface MemoryConfig {
  type: 'short_term' | 'long_term' | 'both';
  maxHistory: number;
  summaryEnabled: boolean;
  storage: 'memory' | 'redis' | 'postgres';
}

export const memoryNode: NodeDefinition & Record<string, any> = {
  type: 'agentic.memory',
  category: 'agentic',
  label: 'Memory',
  description: 'Manage conversation history and persistent user memory',
  icon: '💾',
  color: '#8b5cf6',
  inputs: [
    { id: 'input', type: 'text', label: 'User Message' }
  ],
  outputs: [
    { id: 'history', type: 'json', label: 'Conversation History' },
    { id: 'summary', type: 'text', label: 'Summary' }
  ],
  configSchema: [
    {
      name: 'type',
      label: 'Memory Type',
      type: 'select',
      options: [
        { label: 'Short-term (session)', value: 'short_term' },
        { label: 'Long-term (persistent)', value: 'long_term' },
        { label: 'Both', value: 'both' }
      ],
      default: 'both'
    },
    {
      name: 'maxHistory',
      label: 'Max History (messages)',
      type: 'number',
      default: 20,
      description: 'Maximum number of messages to keep in short-term memory'
    },
    {
      name: 'summaryEnabled',
      label: 'Enable Summarization',
      type: 'boolean',
      default: true,
      description: 'Automatically summarize old messages'
    },
    {
      name: 'storage',
      label: 'Storage Backend',
      type: 'select',
      options: [
        { label: 'In-Memory', value: 'memory' },
        { label: 'Redis', value: 'redis' },
        { label: 'PostgreSQL', value: 'postgres' }
      ],
      default: 'redis'
    }
  ],

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as MemoryConfig;
    
    // Get existing history
    const history = (context.variables.get('conversationHistory') as Array<{ role: string; content: string }>) || [];
    
    // Add current message
    const input = context.variables.get('input') as string;
    if (input) {
      history.push({ role: 'user', content: input });
    }
    
    // Trim to max history
    const trimmedHistory = history.slice(-config.maxHistory);
    
    // Generate summary if enabled
    let summary: string | null = null;
    if (config.summaryEnabled && trimmedHistory.length > 10) {
      summary = await this.summarize(trimmedHistory);
    }

    return {
      outputs: {
        history: trimmedHistory,
        summary
      },
      nextNodes: [],
      variableUpdates: {
        conversationHistory: trimmedHistory,
        conversationSummary: summary
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  async summarize(history: Array<{ role: string; content: string }>): Promise<string> {
    // In real implementation: call LLM to summarize
    return `Conversation with ${history.length} messages about various topics.`;
  },

  validate(_config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    return { valid: errors.length === 0, errors };
  },

  config: {
    type: 'both',
    maxHistory: 20,
    summaryEnabled: true,
    storage: 'redis'
  },
};
