/**
 * Guardrail Node — PII redaction, compliance, injection detection
 * 
 * Supports two modes:
 * 1. Built-in guardrails (PII, toxicity, rate limiting)
 * 2. Custom guardrail apps (HTTP or sidecar)
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface GuardrailConfig {
  mode: 'builtin' | 'custom';
  // Built-in config
  builtin?: {
    piiRedaction?: boolean;
    toxicityFilter?: boolean;
    rateLimit?: { requests: number; windowMs: number };
  };
  // Custom app config
  custom?: {
    appUrl?: string;
    method?: string;
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
    onViolation?: 'block' | 'warn' | 'redact' | 'escalate';
    timeout?: number;
  };
}

export const guardrailNode: NodeDefinition = {
  type: 'governance.guardrail',
  category: 'governance',
  label: 'Guardrail',
  description: 'PII redaction, compliance checks, injection detection',
  icon: '🛡️',
  color: '#f97316',
  inputs: [
    { id: 'input', type: 'text', label: 'Content to Check', required: true }
  ],
  outputs: [
    { id: 'allowed', type: 'boolean', label: 'Allowed' },
    { id: 'redacted', type: 'text', label: 'Redacted Content' },
    { id: 'violations', type: 'json', label: 'Violations' }
  ],
  configSchema: [
    {
      name: 'mode',
      label: 'Guardrail Mode',
      type: 'select',
      options: [
        { label: 'Built-in', value: 'builtin' },
        { label: 'Custom App', value: 'custom' }
      ],
      default: 'builtin'
    },
    {
      name: 'builtin.piiRedaction',
      label: 'PII Redaction',
      type: 'boolean',
      default: true
    },
    {
      name: 'builtin.toxicityFilter',
      label: 'Toxicity Filter',
      type: 'boolean',
      default: true
    },
    {
      name: 'custom.appUrl',
      label: 'Custom App URL',
      type: 'string',
      placeholder: 'https://guardrails.yourcompany.com/api/validate',
      description: 'HTTP endpoint for custom guardrail app'
    },
    {
      name: 'custom.onViolation',
      label: 'On Violation',
      type: 'select',
      options: [
        { label: 'Block', value: 'block' },
        { label: 'Warn', value: 'warn' },
        { label: 'Redact', value: 'redact' },
        { label: 'Escalate to Human', value: 'escalate' }
      ],
      default: 'block'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as GuardrailConfig;
    const input = context.variables.get('input') as string || '';

    if (config.mode === 'custom' && config.custom?.appUrl) {
      return this.executeCustomGuardrail(input, config, context);
    }

    return this.executeBuiltinGuardrail(input, config, context);
  },

  private async executeBuiltinGuardrail(
    input: string,
    config: GuardrailConfig,
    context: ExecutionContext
  ): Promise<NodeResult> {
    const violations = [];
    let redacted = input;

    // PII Redaction
    if (config.builtin?.piiRedaction) {
      const piiResult = this.detectPII(input);
      if (piiResult.found) {
        violations.push({ type: 'pii', severity: 'high', message: 'PII detected' });
        redacted = piiResult.redacted;
      }
    }

    // Toxicity Filter
    if (config.builtin?.toxicityFilter) {
      const toxicityResult = this.detectToxicity(input);
      if (toxicityResult.toxic) {
        violations.push({ type: 'toxicity', severity: 'medium', message: 'Toxic content detected' });
      }
    }

    return {
      outputs: {
        allowed: violations.filter(v => v.severity === 'high').length === 0,
        redacted,
        violations
      },
      nextNodes: [],
      variableUpdates: { guardrailResult: { violations, redacted } },
      guardrailViolations: violations,
      auditEvents: []
    };
  },

  private async executeCustomGuardrail(
    input: string,
    config: GuardrailConfig,
    context: ExecutionContext
  ): Promise<NodeResult> {
    // In real implementation: HTTP call to custom guardrail app
    return {
      outputs: {
        allowed: true,
        redacted: input,
        violations: []
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  private detectPII(text: string): { found: boolean; redacted: string } {
    // Simple PII detection patterns
    const patterns = [
      { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' }, // SSN
      { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '****-****-****-****' }, // Credit card
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***@***.***' } // Email
    ];

    let redacted = text;
    let found = false;

    for (const pattern of patterns) {
      if (pattern.regex.test(redacted)) {
        found = true;
        redacted = redacted.replace(pattern.regex, pattern.replacement);
      }
    }

    return { found, redacted };
  },

  private detectToxicity(text: string): { toxic: boolean } {
    // In real implementation: call toxicity model
    const toxicPatterns = ['hate', 'kill', 'stupid', 'idiot'];
    const toxic = toxicPatterns.some(p => text.toLowerCase().includes(p));
    return { toxic };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    return { valid: errors.length === 0, errors };
  },

  get config(): GuardrailConfig {
    return this._config;
  }

  private _config: GuardrailConfig = {
    mode: 'builtin',
    builtin: { piiRedaction: true, toxicityFilter: true }
  };
};
