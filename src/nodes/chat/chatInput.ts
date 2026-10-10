/**
 * Chat Input Node — chat/webchat message entry.
 *
 * Reads the turn text from session input and exposes configured quick
 * replies for the widget to render. Typing indicators are a channel
 * concern (see chatRuntime) and need no configuration here.
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface ChatInputConfig {
  quickReplies: string[];
}

export const chatInputNode: NodeDefinition = {
  type: 'chat.input',
  category: 'chat',
  label: 'Chat Input',
  description: 'Chat message entry with quick replies',
  icon: '💬',
  color: '#10b981',
  inputs: [],
  outputs: [
    { id: 'text', type: 'text', label: 'Message Text' },
    { id: 'quickReplies', type: 'json', label: 'Quick Replies' }
  ],
  configSchema: [
    {
      name: 'quickReplies',
      label: 'Quick Replies (JSON)',
      type: 'json',
      default: [],
      description: 'Array of short reply strings, e.g. ["Track order", "Talk to human"]'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as ChatInputConfig;
    const text = String(context.variables.get('input') || '');

    return {
      outputs: {
        text,
        quickReplies: config.quickReplies || []
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (config['quickReplies'] !== undefined && !Array.isArray(config['quickReplies'])) {
      errors.push({ field: 'quickReplies', message: 'Quick replies must be an array' });
    }
    return { valid: errors.length === 0, errors };
  },

  get config(): ChatInputConfig {
    return this._config;
  }

  private _config: ChatInputConfig = { quickReplies: [] };
};
