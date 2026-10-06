/**
 * Webhook Node — receive and send webhooks
 * 
 * Handles incoming webhooks and sends outgoing webhook notifications.
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface WebhookConfig {
  direction: 'incoming' | 'outgoing';
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  secret?: string;
  retryCount?: number;
}

export const webhookNode: NodeDefinition = {
  type: 'integration.webhook',
  category: 'integration',
  label: 'Webhook',
  description: 'Receive and send webhook notifications',
  icon: '🔗',
  color: '#6366f1',
  inputs: [
    { id: 'input', type: 'any', label: 'Trigger' }
  ],
  outputs: [
    { id: 'response', type: 'json', label: 'Response' }
  ],
  configSchema: [
    {
      name: 'direction',
      label: 'Direction',
      type: 'select',
      options: [
        { label: 'Incoming', value: 'incoming' },
        { label: 'Outgoing', value: 'outgoing' }
      ],
      default: 'outgoing'
    },
    {
      name: 'url',
      label: 'Webhook URL',
      type: 'string',
      placeholder: 'https://example.com/webhook',
      description: 'URL for outgoing webhooks'
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' }
      ],
      default: 'POST'
    },
    {
      name: 'secret',
      label: 'Webhook Secret',
      type: 'password',
      description: 'Secret for webhook signature verification'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as WebhookConfig;
    
    // In real implementation:
    // For incoming: parse webhook payload
    // For outgoing: send HTTP request to webhook URL

    return {
      outputs: {
        response: { success: true }
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (config['direction'] === 'outgoing' && !config['url']) {
      errors.push({ field: 'url', message: 'URL is required for outgoing webhooks' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  get config(): WebhookConfig {
    return this._config;
  }

  private _config: WebhookConfig = {
    direction: 'outgoing',
    method: 'POST'
  };
};
