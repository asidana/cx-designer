/**
 * Agent router — agents call agents *through* Sentinel.
 *
 * No agent invokes another directly. Delegation is a gated tool call:
 * the pair (caller → callee) must be registered, the pre_tool policy
 * gate runs on the task, and the handoff is audit-logged. This is how
 * multi-agent swarms stay inside the trust boundary.
 */

import { Sentinel } from './sentinel';

export interface AgentRegistration {
  id: string;
  description: string;
  /** agent ids allowed to delegate TO this agent; ['*'] = any */
  allowedCallers: string[];
  invoke: (task: string, session: Record<string, unknown>) => Promise<{ response: string }>;
}

export interface DelegationResult {
  allowed: boolean;
  response?: string;
  action: 'allow' | 'block' | 'escalate';
  violations: Array<{ type: string; message: string }>;
  audit: {
    from: string;
    to: string;
    task: string;
    at: number;
    outcome: string;
  };
}

export class AgentRouter {
  private agents = new Map<string, AgentRegistration>();

  register(agent: AgentRegistration): void {
    this.agents.set(agent.id, agent);
  }

  unregister(id: string): void {
    this.agents.delete(id);
  }

  list(): Array<{ id: string; description: string }> {
    return Array.from(this.agents.values()).map(a => ({
      id: a.id,
      description: a.description
    }));
  }

  async delegate(
    from: string,
    to: string,
    task: string,
    session: Record<string, unknown>,
    sentinel: Sentinel
  ): Promise<DelegationResult> {
    const at = Date.now();
    const audit = { from, to, task, at, outcome: 'blocked:unknown-agent' };

    const target = this.agents.get(to);
    if (!target) {
      return {
        allowed: false,
        action: 'block',
        violations: [{ type: 'rule', message: `Unknown agent "${to}".` }],
        audit: { ...audit, outcome: 'blocked:unknown-agent' }
      };
    }
    if (!target.allowedCallers.includes('*') && !target.allowedCallers.includes(from)) {
      return {
        allowed: false,
        action: 'block',
        violations: [{ type: 'rule', message: `"${from}" may not delegate to "${to}".` }],
        audit: { ...audit, outcome: 'blocked:pair-not-registered' }
      };
    }

    // Policy gate on the delegated task itself
    const gate = sentinel.check({
      phase: 'pre_tool',
      content: task,
      session: { ...session },
      toolName: `agent:${to}`,
      identity: `agent:${from}`
    });
    if (!gate.allowed) {
      return {
        allowed: false,
        action: gate.action === 'escalate' ? 'escalate' : 'block',
        violations: gate.violations.map(v => ({ type: v.type, message: v.message })),
        audit: { ...audit, outcome: `blocked:${gate.action}` }
      };
    }

    const merged = { ...session, ...(gate.configUpdates || {}) };
    const result = await target.invoke(task, merged);
    return {
      allowed: true,
      response: result.response,
      action: 'allow',
      violations: [],
      audit: { ...audit, outcome: 'delegated' }
    };
  }
}
