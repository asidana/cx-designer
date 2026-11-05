/**
 * Self-Help Answer node — T6. Resolves the turn against the deterministic
 * knowledge base and emits an article card as an A2UI directive, with a
 * plain-text fallback line for text-only channels.
 */

import { NodeDefinition, NodeConfig, ExecutionContext, NodeResult } from '../../types/node';
import { findArticle } from '../../selfhelp/articles';

interface SelfHelpConfig {
  defaultArticle: string; // article id override ("" = auto-match)
  includeBody: boolean;
}

export const selfhelpAnswerNode: NodeDefinition = {
  type: 'agentic.selfhelp_answer',
  category: 'agentic',
  label: 'Self-Help Answer',
  description: 'Answer from the knowledge base with an article card',
  icon: '📖',
  color: '#0ea5e9',
  inputs: [{ id: 'query', type: 'text', label: 'Turn Text', required: true }],
  outputs: [
    { id: 'article', type: 'json', label: 'Article Card' },
    { id: 'text', type: 'text', label: 'Plain Answer' }
  ],
  configSchema: [
    {
      name: 'defaultArticle',
      label: 'Force article id (blank = auto-match)',
      type: 'string',
      default: '',
      description: 'Pin a specific article (e.g. A-101) instead of keyword matching'
    },
    { name: 'includeBody', label: 'Include article body', type: 'boolean', default: false }
  ],
  config: { defaultArticle: '', includeBody: false },

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as SelfHelpConfig;
    const query = String(context.variables.get('input') || '');
    const article =
      (config.defaultArticle && findArticle(config.defaultArticle)) ||
      findArticle(query);

    if (!article) {
      return {
        outputs: { text: 'I could not find a matching article; a human agent will continue.', article: null },
        nextNodes: [],
        variableUpdates: { selfHelpArticle: null },
        guardrailViolations: [],
        auditEvents: []
      };
    }

    const line = `${article.title} — ${article.summary}`;
    return {
      outputs: {
        text: line,
        article: {
          id: article.id,
          title: article.title,
          summary: article.summary,
          body: config.includeBody ? article.body : undefined
        }
      },
      nextNodes: [],
      variableUpdates: { selfHelpArticle: article, selfHelpMatched: true },
      guardrailViolations: [],
      auditEvents: [{ id: `sh_${Date.now()}`, timestamp: Date.now(), nodeId: 'selfhelp', eventType: 'complete', data: { article: article.id }, latencyMs: 0 }]
    };
  },

  validate(): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    return { valid: true, errors: [] };
  }
};