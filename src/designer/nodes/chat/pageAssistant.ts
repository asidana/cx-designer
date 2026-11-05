/**
 * Page Assistant Node — answer and act on the current web page.
 *
 * The platform-native alternative to third-party crawl APIs for
 * page-grounded assistance: the host page ships its URL, title, and
 * selection with every turn (see cx-webchat.js), and this node answers
 * in that context. Scoped actions (summarize, fill, click) run only
 * when allowed, with approval for anything mutating.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

interface PageAssistantConfig {
  scope: 'page' | 'site';
  allowSummarize: boolean;
  allowFill: boolean;
  requireApproval: boolean;
  systemPrompt?: string;
}

interface PageContext {
  url?: string;
  title?: string;
  selection?: string;
}

export const pageAssistantNode: NodeDefinition = {
  type: 'chat.page_assistant',
  category: 'chat',
  label: 'Page Assistant',
  description: 'Answer and act on the current web page (URL, title, selection)',
  icon: '📄',
  color: '#10b981',
  inputs: [
    { id: 'input', type: 'text', label: 'Question', required: true }
  ],
  outputs: [
    { id: 'answer', type: 'text', label: 'Answer' },
    { id: 'actions', type: 'json', label: 'Page Actions Taken' }
  ],
  configSchema: [
    {
      name: 'scope',
      label: 'Scope',
      type: 'select',
      options: [
        { label: 'Current page', value: 'page' },
        { label: 'Whole site', value: 'site' }
      ],
      default: 'page',
      description: 'Site scope resolves against the synced knowledge base'
    },
    {
      name: 'allowSummarize',
      label: 'Allow Summarize',
      type: 'boolean',
      default: true
    },
    {
      name: 'allowFill',
      label: 'Allow Form Fill',
      type: 'boolean',
      default: false,
      description: 'Let the assistant propose form fills (needs approval)'
    },
    {
      name: 'requireApproval',
      label: 'Require Approval',
      type: 'boolean',
      default: true,
      description: 'Any mutating page action needs approval first'
    },
    {
      name: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      placeholder: 'You assist visitors on this page...',
      description: 'Tone and bounds for page-grounded answers'
    }
  ],

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as PageAssistantConfig;
    const question = String(context.variables.get('input') || '');
    const page = (context.variables.get('pageContext') as PageContext) || {};

    // In production: page DOM/reader text joins the prompt (page scope)
    // or the site KB is searched (site scope); actions emit UI directives.
    const pageRef = page.title || page.url || 'this page';
    const answer = page.url
      ? `Based on "${pageRef}" (${page.url}): ${question}`
      : `I don't know which page you're on — open me from a page and ask again.`;

    const actions = [];
    if (/summar/i.test(question) && config.allowSummarize) {
      actions.push({ type: 'summarize', scope: config.scope, approved: !config.requireApproval });
    }

    return {
      outputs: { answer, actions },
      nextNodes: [],
      variableUpdates: {
        pageAnswer: answer,
        pageActions: actions,
        response: answer
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (config['allowFill'] && !config['requireApproval']) {
      errors.push({
        field: 'requireApproval',
        message: 'Form fill without approval is not allowed'
      });
    }
    return { valid: errors.length === 0, errors };
  },

  config: {
    scope: 'page',
    allowSummarize: true,
    allowFill: false,
    requireApproval: true
  },
};
