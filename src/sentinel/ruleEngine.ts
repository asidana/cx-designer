/**
 * Rule Engine — deterministic policy rules for Sentinel.
 *
 * Rules are data (JSON), not code: ordered, first match wins.
 * Conditions read dot-paths from session state, e.g.
 *   { field: 'identity_verified', op: 'eq', value: true }
 *   { field: 'amount', op: 'lte', value: 50 }
 */

export type SentinelPhase = 'pre_llm' | 'post_llm' | 'pre_tool' | 'post_tool';

export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists' | 'contains';

export type RuleAction = 'allow' | 'block' | 'redact' | 'escalate';

export interface RuleCondition {
  field: string;
  op: RuleOperator;
  value?: unknown;
}

export interface Rule {
  id: string;
  /** phase this rule applies to, or 'any' */
  phase: SentinelPhase | 'any';
  when: RuleCondition[];
  then: RuleAction;
  message: string;
  /**
   * Policy-managed configuration: merged into session state when the
   * rule matches (e.g. { model: 'gpt-4o-mini', costCeiling: 0.1,
   * voiceMode: 'cascaded' }). Lets policy govern configuration —
   * model choice, ceilings, provider routing — per caller/tenant,
   * without touching flow JSON.
   */
  set?: Record<string, unknown>;
}

export interface RuleDecision {
  allowed: boolean;
  action: 'allow' | 'block' | 'redact' | 'escalate';
  matchedRule?: string;
  message?: string;
  /** config updates from the matched rule's `set` clause */
  set?: Record<string, unknown>;
}

function resolvePath(state: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, state);
}

function toNumber(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.\-]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function evalCondition(cond: RuleCondition, state: Record<string, unknown>): boolean {
  const actual = resolvePath(state, cond.field);
  switch (cond.op) {
    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';
    case 'eq':
      return actual === cond.value;
    case 'neq':
      return actual !== cond.value;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const a = toNumber(actual);
      const b = toNumber(cond.value);
      if (a === null || b === null) return false;
      if (cond.op === 'gt') return a > b;
      if (cond.op === 'gte') return a >= b;
      if (cond.op === 'lt') return a < b;
      return a <= b;
    }
    case 'contains': {
      if (typeof actual === 'string' && typeof cond.value === 'string') {
        return actual.toLowerCase().includes(cond.value.toLowerCase());
      }
      if (Array.isArray(actual)) return actual.includes(cond.value);
      return false;
    }
  }
}

/** First matching rule for the phase wins; no match = allow. */
export function evaluateRules(
  rules: Rule[],
  phase: SentinelPhase,
  state: Record<string, unknown>
): RuleDecision {
  for (const rule of rules) {
    if (rule.phase !== 'any' && rule.phase !== phase) continue;
    const matched = rule.when.every(c => evalCondition(c, state));
    if (!matched) continue;
    return {
      allowed: rule.then === 'allow' || rule.then === 'redact',
      action: rule.then,
      matchedRule: rule.id,
      message: rule.message,
      set: rule.set
    };
  }
  return { allowed: true, action: 'allow' };
}

/** Guardrail-style default ruleset: money needs identity + human above limit. */
export const DEFAULT_MONEY_RULES: Rule[] = [
  {
    id: 'refund-requires-identity',
    phase: 'pre_tool',
    when: [{ field: 'identity_verified', op: 'neq', value: true }],
    then: 'block',
    message: 'Identity must be verified before any money movement.'
  },
  {
    id: 'refund-auto-limit',
    phase: 'pre_tool',
    when: [{ field: 'amount', op: 'gt', value: 50 }],
    then: 'escalate',
    message: 'Amounts over $50 need human approval.'
  }
];
