/**
 * Copilot Action node — T5. Emits AG-UI/A2UI UI parts (cards, forms,
 * lists) so a copilot host renders a structured surface instead of prose.
 * Optional `approval` flag surfaces a confirm affordance for
 * frontend-executed actions (copilot channel capability).
 */

import { NodeDefinition, NodeConfig, ExecutionContext, NodeResult } from '../../types/node';

interface CopilotActionConfig {
  kind: string; // card | form | list | information
  title: string;
  description?: string;
  actionLabel?: string;
  protocol: 'a2ui' | 'ag-ui';
  approval: boolean;
}

const ALLOWED_KINDS = ['card', 'form', 'list', 'information'];

export const copilotActionNode: NodeDefinition = {
  type: 'agentic.copilot_action',
  category: 'agentic',
  label: 'Copilot Action',
  description: 'Emit AG-UI / A2UI UI parts with optional approval',
  icon: '🃏',
  color: '#6366f1',
  inputs: [{ id: 'text', type: 'text', label: 'Context Text' }],
  outputs: [{ id: 'uiParts', type: 'json', label: 'UI Parts' }],
  configSchema: [
    {
      name: 'kind',
      label: 'Directive kind',
      type: 'select',
      options: [
        { label: 'Card', value: 'card' },
        { label: 'Form', value: 'form' },
        { label: 'List', value: 'list' },
        { label: 'Information', value: 'information' }
      ],
      default: 'card'
    },
    { name: 'title', label: 'Title', type: 'string', default: 'Suggested action' },
    { name: 'description', label: 'Description', type: 'textarea', default: '' },
    { name: 'actionLabel', label: 'Action label', type: 'string', default: 'Confirm' },
    {
      name: 'protocol',
      label: 'Protocol',
      type: 'select',
      options: [
        { label: 'A2UI (Google)', value: 'a2ui' },
        { label: 'AG-UI (CopilotKit)', value: 'ag-ui' }
      ],
      default: 'a2ui'
    },
    {
      name: 'approval',
      label: 'Requires approval',
      type: 'boolean',
      default: false,
      description: 'Require in-channel confirmation for frontend-executed actions'
    }
  ],
  config: { kind: 'card', title: 'Suggested action', description: '', actionLabel: 'Confirm', protocol: 'a2ui', approval: false },

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as CopilotActionConfig;
    const kind = ALLOWED_KINDS.includes(config.kind) ? config.kind : 'card';
    const previous = (context.variables.get('uiParts') as Array<Record<string, unknown>>) || [];

    const directive: Record<string, unknown> = {
      id: `cp_${Date.now().toString(36)}`,
      kind,
      data:
        kind === 'card'
          ? { title: config.title, description: config.description || undefined, icon: '🃏' }
          : kind === 'form'
            ? {
                title: config.title,
                actionLabel: config.actionLabel || 'Submit',
                fields: [
                  { id: 'reason', label: 'Reason', type: 'text' }
                ]
              }
            : kind === 'list'
              ? { title: config.title, items: [{ title: config.description || config.title, icon: '•' }] }
              : { title: config.title, text: config.description || '' }
    };

    const uiParts = [...previous, directive];
    return {
      outputs: { uiParts, approvalRequired: config.approval },
      nextNodes: [],
      variableUpdates: { uiParts, lastAction: { kind, title: config.title, approval: config.approval } },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (!ALLOWED_KINDS.includes(String(config['kind'] ?? 'card'))) {
      errors.push({ field: 'kind', message: 'Unknown directive kind' });
    }
    return { valid: errors.length === 0, errors };
  }
};