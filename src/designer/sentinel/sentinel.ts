/**
 * Sentinel — agent gateway protecting the bot.
 *
 * Every request (voice, chat, MCP tool call) passes through Sentinel
 * before it reaches the agent, tools, or the caller:
 *
 *   rate limit → rule engine → PII redaction → injection scan
 *
 * Phases mirror the agent loop: pre_llm, post_llm, pre_tool, post_tool.
 * `failClosed` (default true) denies on internal error; set false only
 * for non-mutating read phases.
 */

import {
  Rule,
  RuleDecision,
  SentinelPhase,
  evaluateRules,
  DEFAULT_MONEY_RULES
} from './ruleEngine';
import { redactPhi } from './phi';

export interface SentinelConfig {
  rules?: Rule[];
  piiRedaction?: boolean;
  /** healthcare identifiers (DOB, phone, MRN, member IDs) — default on */
  phiRedaction?: boolean;
  injectionScan?: boolean;
  rateLimit?: { max: number; windowMs: number };
  failClosed?: boolean;
}

export interface SentinelCheck {
  phase: SentinelPhase;
  /** caller text or agent text under review */
  content: string;
  /** serializable session state */
  session: Record<string, unknown>;
  /** tool being invoked (pre_tool / post_tool) */
  toolName?: string;
  /** identity for rate limiting (session or caller id) */
  identity?: string;
}

export interface SentinelViolation {
  type: 'rule' | 'pii' | 'injection' | 'rate_limit' | 'internal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ruleId?: string;
}

export interface SentinelResult {
  allowed: boolean;
  action: 'allow' | 'block' | 'redact' | 'escalate';
  violations: SentinelViolation[];
  redactedContent: string;
  /** policy-managed config from the matched rule's `set` clause */
  configUpdates?: Record<string, unknown>;
}

const PII_PATTERNS: Array<{ regex: RegExp; replacement: string; label: string }> = [
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****', label: 'SSN' },
  {
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '****-****-****-****',
    label: 'card'
  },
  {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '***@***.***',
    label: 'email'
  }
];

const INJECTION_PHRASES = [
  'ignore previous instructions',
  'you are now',
  'new instructions',
  'system prompt',
  'override',
  'jailbreak',
  'disable guardrails'
];

export class Sentinel {
  private config: Required<Omit<SentinelConfig, 'rateLimit'>> & { rateLimit?: { max: number; windowMs: number } };
  private hits = new Map<string, number[]>();

  constructor(config: SentinelConfig = {}) {
    this.config = {
      rules: config.rules ?? DEFAULT_MONEY_RULES,
      piiRedaction: config.piiRedaction ?? true,
      phiRedaction: config.phiRedaction ?? true,
      injectionScan: config.injectionScan ?? true,
      rateLimit: config.rateLimit,
      failClosed: config.failClosed ?? true
    };
  }

  check(input: SentinelCheck): SentinelResult {
    try {
      const violations: SentinelViolation[] = [];
      let content = input.content;

      // 1. Rate limit (per identity, sliding window)
      if (this.config.rateLimit && input.identity) {
        const now = Date.now();
        const window = this.hits.get(input.identity) || [];
        const fresh = window.filter(t => now - t < this.config.rateLimit!.windowMs);
        fresh.push(now);
        this.hits.set(input.identity, fresh);
        if (fresh.length > this.config.rateLimit!.max) {
          violations.push({
            type: 'rate_limit',
            severity: 'medium',
            message: `Rate limit exceeded (${this.config.rateLimit!.max} per window).`
          });
          return this.deny(violations, content);
        }
      }

      // 2. Deterministic rule engine (the real policy layer)
      const decision: RuleDecision = evaluateRules(
        this.config.rules,
        input.phase,
        { ...input.session, tool: input.toolName }
      );
      if (decision.action === 'block') {
        violations.push({
          type: 'rule',
          severity: 'high',
          message: decision.message || 'Blocked by policy.',
          ruleId: decision.matchedRule
        });
        return this.deny(violations, content);
      }
      if (decision.action === 'escalate') {
        violations.push({
          type: 'rule',
          severity: 'medium',
          message: decision.message || 'Escalation required.',
          ruleId: decision.matchedRule
        });
        return { allowed: false, action: 'escalate', violations, redactedContent: content, configUpdates: decision.set };
      }

      // 3. PII + PHI redaction (before logs, audit trails, third-party LLM calls)
      if (this.config.piiRedaction) {
        for (const p of PII_PATTERNS) {
          if (p.regex.test(content)) {
            violations.push({
              type: 'pii',
              severity: 'low',
              message: `Redacted ${p.label}.`
            });
            content = content.replace(p.regex, p.replacement);
          }
        }
      }
      if (this.config.phiRedaction) {
        const phi = redactPhi(content);
        if (phi.found.length > 0) {
          violations.push({
            type: 'pii',
            severity: 'low',
            message: `Redacted PHI: ${phi.found.join(', ')}.`
          });
          content = phi.redacted;
        }
      }

      // 4. Prompt-injection scan (caller speech is untrusted)
      if (
        this.config.injectionScan &&
        (input.phase === 'pre_llm' || input.phase === 'pre_tool')
      ) {
        const lowered = input.content.toLowerCase();
        const hit = INJECTION_PHRASES.find(p => lowered.includes(p));
        if (hit) {
          violations.push({
            type: 'injection',
            severity: 'critical',
            message: `Injection attempt detected ("${hit}").`
          });
          return this.deny(violations, content);
        }
      }

      const action = decision.action === 'redact' ? 'redact' : 'allow';
      return { allowed: true, action, violations, redactedContent: content, configUpdates: decision.set };
    } catch (e) {
      const violations: SentinelViolation[] = [
        {
          type: 'internal',
          severity: 'critical',
          message: `Sentinel error: ${e instanceof Error ? e.message : e}`
        }
      ];
      if (this.config.failClosed) return this.deny(violations, input.content);
      return { allowed: true, action: 'allow', violations, redactedContent: input.content };
    }
  }

  private deny(violations: SentinelViolation[], content: string): SentinelResult {
    return { allowed: false, action: 'block', violations, redactedContent: content };
  }

  /** Forget rate-limit state (tests, session end). */
  reset(): void {
    this.hits.clear();
  }
}
