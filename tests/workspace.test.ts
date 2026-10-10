/**
 * Workspace store + guardrails/gateway behaviour
 *
 * The operational sections (Guardrails, Voice Gateway, Admin, Super Admin)
 * all read and write one store. These tests pin the behaviour a user depends
 * on: rules decide, redaction removes, sessions live and end, and every
 * change lands in the audit trail.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWorkspace,
  endCall,
  liveSessions,
  placeCall,
  recordAudit,
  removeEndpoint,
  removeRule,
  resetWorkspace,
  subscribe,
  updateWorkspace,
  upsertEndpoint,
  upsertRule
} from '../src/workspace/store';
import { evaluateRules, Rule } from '../src/sentinel/ruleEngine';
import { redactPhi } from '../src/sentinel/phi';
import type { VoiceEndpointRecord, SessionRecord } from '../src/workspace/store';

const rule = (over: Partial<Rule> = {}): Rule => ({
  id: 'r_test',
  phase: 'pre_tool',
  when: [{ field: 'variables.amount', op: 'gt', value: 100 }],
  then: 'block',
  message: 'too much',
  ...over
});

describe('workspace store', () => {
  beforeEach(() => {
    resetWorkspace();
  });

  it('seeds a usable starting point rather than empty pages', () => {
    const ws = getWorkspace();
    expect(ws.rules.length).toBeGreaterThan(0);
    expect(ws.endpoints.length).toBeGreaterThan(0);
    expect(ws.members.length).toBeGreaterThan(0);
    expect(ws.orgs.length).toBeGreaterThan(0);
    expect(ws.flags.length).toBeGreaterThan(0);
    expect(ws.alerts.length).toBeGreaterThan(0);
  });

  it('persists to localStorage so a reload keeps the configuration', () => {
    updateWorkspace({ members: [] });
    expect(getWorkspace().members).toEqual([]);
    const raw = localStorage.getItem('cx_workspace_v1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).members).toEqual([]);
  });

  it('notifies subscribers when the state changes', () => {
    let notified = 0;
    const unsubscribe = subscribe(() => {
      notified += 1;
    });
    upsertRule(rule({ id: 'r_notify' }), 'notify');
    expect(notified).toBe(1);
    unsubscribe();
    upsertRule(rule({ id: 'r_after_unsub' }), 'notify');
    expect(notified).toBe(1);
  });

  it('appends an audit entry for every change and caps the trail', () => {
    recordAudit('admin', 'Test', 'detail');
    expect(getWorkspace().audit[0]).toMatchObject({
      area: 'admin',
      action: 'Test',
      detail: 'detail'
    });

    for (let i = 0; i < 250; i++) recordAudit('admin', `bulk ${i}`, 'x');
    expect(getWorkspace().audit.length).toBeLessThanOrEqual(200);
  });

  it('resets back to the seeded configuration', () => {
    updateWorkspace({ members: [] });
    resetWorkspace();
    expect(getWorkspace().members.length).toBeGreaterThan(0);
  });
});

describe('guardrails rules', () => {
  beforeEach(() => resetWorkspace());

  it('creates, updates and deletes rules', () => {
    upsertRule(rule(), 'created');
    expect(getWorkspace().rules.some(r => r.id === 'r_test')).toBe(true);

    upsertRule(rule({ then: 'escalate' }), 'updated');
    const stored = getWorkspace().rules.find(r => r.id === 'r_test');
    expect(stored?.then).toBe('escalate');
    expect(getWorkspace().rules.filter(r => r.id === 'r_test')).toHaveLength(1);

    removeRule('r_test');
    expect(getWorkspace().rules.some(r => r.id === 'r_test')).toBe(false);
  });

  it('blocks a large refund and escalates an unverified caller', () => {
    const rules = getWorkspace().rules;

    const refund = evaluateRules(rules, 'pre_tool', {
      variables: { refund_amount: 850 }
    });
    expect(refund.action).toBe('escalate');
    // Escalation stops the agent turn — a human takes it from here.
    expect(refund.allowed).toBe(false);
    expect(refund.matchedRule).toBe('rule_refund_limit');

    const unverified = evaluateRules(rules, 'pre_llm', {
      variables: { identity_verified: false }
    });
    expect(unverified.matchedRule).toBe('rule_unverified_identity');
  });

  it('lets a policy rule govern configuration, not just allow/deny', () => {
    const decision = evaluateRules(getWorkspace().rules, 'pre_llm', {
      variables: { after_hours: true }
    });
    expect(decision.set).toMatchObject({ model: 'gpt-4o-mini' });
  });

  it('allows when no rule matches the phase', () => {
    const decision = evaluateRules(getWorkspace().rules, 'post_tool', {
      variables: { refund_amount: 1, identity_verified: true, after_hours: false }
    });
    expect(decision.action).toBe('allow');
    expect(decision.matchedRule).toBeUndefined();
  });
});

describe('redaction', () => {
  it('removes health identifiers and reports what it found', () => {
    const out = redactPhi('DOB 04/12/1977, MRN 998877, member ID ACME-88213');
    expect(out.redacted).not.toContain('04/12/1977');
    expect(out.redacted).not.toContain('998877');
    expect(out.found.length).toBeGreaterThan(0);
  });

  it('leaves clean text alone', () => {
    const out = redactPhi('Your refund of $40 was processed.');
    expect(out.found).toHaveLength(0);
    expect(out.redacted).toBe('Your refund of $40 was processed.');
  });
});

describe('voice gateway records', () => {
  beforeEach(() => resetWorkspace());

  const endpoint = (over: Partial<VoiceEndpointRecord> = {}): VoiceEndpointRecord => ({
    id: 'ep_test',
    name: 'Test trunk',
    transport: 'sip',
    address: 'sip:test:5060',
    ccaas: 'custom',
    did: '+15550000',
    codecs: ['pcmu'],
    dtmfMode: 'rfc2833',
    enabled: true,
    ...over
  });

  it('creates and updates endpoints without duplicating them', () => {
    upsertEndpoint(endpoint());
    expect(getWorkspace().endpoints.filter(e => e.id === 'ep_test')).toHaveLength(1);
    upsertEndpoint(endpoint({ address: 'sip:other:5060' }));
    expect(getWorkspace().endpoints.filter(e => e.id === 'ep_test')).toHaveLength(1);
    expect(getWorkspace().endpoints.find(e => e.id === 'ep_test')?.address).toBe('sip:other:5060');
  });

  it('removing an endpoint takes its calls with it', () => {
    upsertEndpoint(endpoint());
    const call: SessionRecord = {
      id: 'call_1',
      endpointId: 'ep_test',
      direction: 'inbound',
      state: 'active',
      from: '+1',
      to: '+2',
      agentId: null,
      startedAt: Date.now()
    };
    placeCall(call);
    removeEndpoint('ep_test');
    expect(getWorkspace().sessions.some(s => s.endpointId === 'ep_test')).toBe(false);
  });

  it('tracks live calls separately from ended ones', () => {
    const base: SessionRecord = {
      id: 'call_a',
      endpointId: getWorkspace().endpoints[0].id,
      direction: 'outbound',
      state: 'ringing',
      from: '+1555',
      to: '+1666',
      agentId: null,
      startedAt: Date.now()
    };
    placeCall(base);
    expect(liveSessions(getWorkspace())).toHaveLength(1);

    placeCall({ ...base, state: 'active', agentId: 'billing' });
    expect(liveSessions(getWorkspace())[0].state).toBe('active');

    endCall('call_a');
    expect(liveSessions(getWorkspace())).toHaveLength(0);
    expect(getWorkspace().sessions[0].endedAt).toBeGreaterThan(0);
  });

  it('ending a call twice is a no-op', () => {
    const base: SessionRecord = {
      id: 'call_b',
      endpointId: getWorkspace().endpoints[0].id,
      direction: 'inbound',
      state: 'ended',
      from: '+1',
      to: '+2',
      agentId: null,
      startedAt: Date.now()
    };
    placeCall(base);
    endCall('call_b');
    expect(getWorkspace().sessions.find(s => s.id === 'call_b')?.endedAt).toBeUndefined();
  });
});