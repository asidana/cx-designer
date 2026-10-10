/**
 * Sentinel Node — agent gateway on the canvas.
 *
 * Runs the full Sentinel pipeline (rate limit → rule engine →
 * PII redaction → injection scan) at a chosen phase. Drop one before
 * every LLM call and every side-effecting tool to make the trust
 * boundary visible in the flow itself.
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';
import { Sentinel, SentinelPhase } from '../../sentinel/sentinel';
import { Rule } from '../../sentinel/ruleEngine';

interface SentinelNodeConfig {
  phase: SentinelPhase;
  rules: Rule[];
  piiRedaction: boolean;
  phiRedaction: boolean;
  injectionScan: boolean;
  failClosed: boolean;
}

export const sentinelNode: NodeDefinition = {
  type: 'governance.sentinel',
  category: 'governance',
  label: 'Sentinel',
  description: 'Agent gateway: rate limit, rules, PII redaction, injection scan',
  icon: '🛡️',
  color: '#f97316',
  inputs: [
    { id: 'input', type: 'text', label: 'Content to Guard', required: true }
  ],
  outputs: [
    { id: 'allowed', type: 'boolean', label: 'Allowed' },
    { id: 'action', type: 'text', label: 'Action (allow/block/redact/escalate)' },
    { id: 'content', type: 'text', label: 'Cleared Content' },
    { id: 'violations', type: 'json', label: 'Violations' }
  ],
  configSchema: [
    {
      name: 'phase',
      label: 'Phase',
      type: 'select',
      options: [
        { label: 'Pre-LLM', value: 'pre_llm' },
        { label: 'Post-LLM', value: 'post_llm' },
        { label: 'Pre-Tool', value: 'pre_tool' },
        { label: 'Post-Tool', value: 'post_tool' }
      ],
      default: 'pre_llm',
      required: true,
      description: 'Where in the agent loop this gate runs'
    },
    {
      name: 'rules',
      label: 'Policy Rules (JSON)',
      type: 'json',
      default: [],
      description: 'Empty = built-in money rules; add your own policy here'
    },
    {
      name: 'piiRedaction',
      label: 'PII Redaction',
      type: 'boolean',
      default: true
    },
    {
      name: 'phiRedaction',
      label: 'PHI Redaction (healthcare)',
      type: 'boolean',
      default: true,
      description: 'Redact DOB, phones, MRNs, member IDs'
    },
    {
      name: 'injectionScan',
      label: 'Injection Scan',
      type: 'boolean',
      default: true
    },
    {
      name: 'failClosed',
      label: 'Fail Closed',
      type: 'boolean',
      default: true,
      description: 'Deny on internal error (recommended for pre_tool)'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as SentinelNodeConfig;
    const input = String(context.variables.get('input') || '');
    const session: Record<string, unknown> = {};
    context.variables.forEach((value, key) => {
      session[key] = value;
    });

    const sentinel = new Sentinel({
      rules: config.rules && config.rules.length > 0 ? config.rules : undefined,
      piiRedaction: config.piiRedaction,
      phiRedaction: config.phiRedaction,
      injectionScan: config.injectionScan,
      failClosed: config.failClosed
    });

    const result = sentinel.check({
      phase: config.phase,
      content: input,
      session,
      identity: context.sessionId
    });

    return {
      outputs: {
        allowed: result.allowed,
        action: result.action,
        content: result.redactedContent,
        violations: result.violations
      },
      nextNodes: [],
      variableUpdates: {
        sentinelAction: result.action,
        sentinelViolations: result.violations
      },
      guardrailViolations: result.violations.map(v => ({
        type: v.type,
        severity: v.severity === 'critical' ? 'critical' as const : v.severity as 'low' | 'medium' | 'high',
        message: v.message,
        location: 'sentinel'
      })),
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (!config['phase']) {
      errors.push({ field: 'phase', message: 'Phase is required' });
    }
    return { valid: errors.length === 0, errors };
  },

  get config(): SentinelNodeConfig {
    return this._config;
  }

  private _config: SentinelNodeConfig = {
    phase: 'pre_llm',
    rules: [],
    piiRedaction: true,
    injectionScan: true,
    failClosed: true
  };
};
