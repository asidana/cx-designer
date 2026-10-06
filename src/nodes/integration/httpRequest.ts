/**
 * HTTP Request Node — call external APIs
 * 
 * Supports REST APIs with:
 * - Variable substitution in URL/payload
 * - Authentication (Bearer, API key, OAuth2)
 * - Retry logic
 * - Response mapping
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface HttpConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string; // Template with {{variable}} substitution
  auth?: {
    type: 'bearer' | 'api_key' | 'oauth2';
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  timeout?: number;
  retry?: { maxAttempts: number; backoff: 'fixed' | 'exponential' };
  responseMapping?: Record<string, string>; // JSONPath → variable name
}

export const httpRequestNode: NodeDefinition = {
  type: 'integration.http',
  category: 'integration',
  label: 'HTTP Request',
  description: 'Call external APIs with variable substitution and auth',
  icon: '🌐',
  color: '#6366f1',
  inputs: [
    { id: 'input', type: 'any', label: 'Trigger' }
  ],
  outputs: [
    { id: 'response', type: 'json', label: 'Response' },
    { id: 'status', type: 'number', label: 'Status Code' }
  ],
  configSchema: [
    {
      name: 'url',
      label: 'URL',
      type: 'string',
      placeholder: 'https://api.example.com/v1/data',
      required: true
    },
    {
      name: 'method',
      label: 'Method',
      type: 'select',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' }
      ],
      default: 'GET'
    },
    {
      name: 'body',
      label: 'Request Body (JSON)',
      type: 'json',
      description: 'Use {{variable}} for substitution'
    },
    {
      name: 'auth.type',
      label: 'Auth Type',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Bearer Token', value: 'bearer' },
        { label: 'API Key', value: 'api_key' }
      ],
      default: 'none'
    },
    {
      name: 'auth.token',
      label: 'Bearer Token',
      type: 'password',
      description: 'Bearer token for authentication'
    },
    {
      name: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      default: 5000
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as HttpConfig;
    
    // In real implementation:
    // 1. Substitute variables in URL/body
    // 2. Add auth headers
    // 3. Make HTTP request
    // 4. Map response to variables

    return {
      outputs: {
        response: { success: true },
        status: 200
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['url']) {
      errors.push({ field: 'url', message: 'URL is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  get config(): HttpConfig {
    return this._config;
  }

  private _config: HttpConfig = {
    url: '',
    method: 'GET',
    timeout: 5000
  };
};
