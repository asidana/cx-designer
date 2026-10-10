/**
 * Chat Output Node — markdown reply with citations and cards.
 *
 * Formats agent text as chat markdown, attaches citation sources and
 * optional rich cards / quick replies for webchat widgets to render.
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface ChatCard {
  title: string;
  subtitle?: string;
  buttons?: string[];
}

interface ChatOutputConfig {
  markdown: boolean;
  citations: boolean;
  cards: ChatCard[];
  quickReplies: string[];
}

export const chatOutputNode: NodeDefinition = {
  type: 'chat.output',
  category: 'chat',
  label: 'Chat Output',
  description: 'Markdown reply with citations, cards, and quick replies',
  icon: '💭',
  color: '#10b981',
  inputs: [
    { id: 'text', type: 'text', label: 'Reply Text', required: true }
  ],
  outputs: [
    { id: 'message', type: 'json', label: 'Chat Message' }
  ],
  configSchema: [
    {
      name: 'markdown',
      label: 'Render Markdown',
      type: 'boolean',
      default: true
    },
    {
      name: 'citations',
      label: 'Attach Citations',
      type: 'boolean',
      default: true,
      description: 'Append retrieved sources (ragSources) as citations'
    },
    {
      name: 'cards',
      label: 'Cards (JSON)',
      type: 'json',
      default: [],
      description: 'Array of {title, subtitle?, buttons?}'
    },
    {
      name: 'quickReplies',
      label: 'Quick Replies (JSON)',
      type: 'json',
      default: [],
      description: 'Array of short reply strings'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as ChatOutputConfig;
    const text = String(context.variables.get('input') || '');

    const sources = config.citations
      ? ((context.variables.get('ragSources') as Array<{ title: string }>) || [])
      : [];
    const message = {
      text,
      markdown: config.markdown !== false,
      citations: sources.map(s => s.title),
      cards: config.cards || [],
      quickReplies: config.quickReplies || []
    };

    return {
      outputs: { message },
      nextNodes: [],
      variableUpdates: { lastChatMessage: message },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (config['cards'] !== undefined && !Array.isArray(config['cards'])) {
      errors.push({ field: 'cards', message: 'Cards must be an array' });
    }
    return { valid: errors.length === 0, errors };
  },

  get config(): ChatOutputConfig {
    return this._config;
  }

  private _config: ChatOutputConfig = { markdown: true, citations: true, cards: [], quickReplies: [] };
};
