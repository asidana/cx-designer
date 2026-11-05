/**
 * Business Rule Node — deterministic policy as data.
 *
 * Evaluates a JSON ruleset against session state at this point in the
 * flow. This is the canvas face of the Sentinel rule engine: policy
 * enforced by infrastructure, not by model behavior.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';
import { Rule, evaluateRules } from '../../sentinel/ruleEngine';

export const businessRuleNode: NodeDefinition = {
  type: 'deterministic.business_rule',
  category: 'deterministic',
  label: 'Business Rule',
  description: 'Evaluate deterministic policy rules against session state',
  icon: '📏',
  color: '#3b82f6',
  inputs: [
    { id: 'input', type: 'any', label: 'Trigger' }
  ],
  outputs: [
    { id: 'allowed', type: 'boolean', label: 'Allowed' },
    { id: 'action', type: 'text', label: 'Action' },
    { id: 'violations', type: 'json', label: 'Violations' }
  ],
  configSchema: [
    {
      name: 'rules',
      label: 'Rules (JSON)',
      type: 'json',
      default: [
        {
          id: 'identity-before-refund',
          phase: 'any',
          when: [{ field: 'identity_verified', op: 'neq', value: true }],
          then: 'block',
          message: 'Verify identity before proceeding.'
        }
      ],
      description: 'Array of {id, phase, when[], then, message}'
    }
  ],

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const mergedRules = { ...this.config, ...instanceConfig }; const rules = (mergedRules.rules as Rule[]) || [];
    const state: Record<string, unknown> = {};
    context.variables.forEach((value, key) => {
      state[key] = value;
    });

    const decision = evaluateRules(rules, 'any', state);

    return {
      outputs: {
        allowed: decision.allowed,
        action: decision.action,
        violations: decision.matchedRule
          ? [{ ruleId: decision.matchedRule, message: decision.message }]
          : []
      },
      nextNodes: [],
      variableUpdates: {
        ruleDecision: decision.action,
        ruleMatched: decision.matchedRule || null
      },
      guardrailViolations: [],
      auditEvents: [
        {
          id: `audit_${Date.now()}`,
          timestamp: Date.now(),
          nodeId: 'business_rule',
          eventType: 'guardrail',
          data: { action: decision.action, rule: decision.matchedRule },
          latencyMs: 0
        }
      ]
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    const rules = config['rules'];
    if (!Array.isArray(rules) || rules.length === 0) {
      errors.push({ field: 'rules', message: 'At least one rule is required' });
    }
    return { valid: errors.length === 0, errors };
  },

  config: { rules: [] },
};
