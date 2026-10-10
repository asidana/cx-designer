/**
 * Workspace Store
 *
 * Persistent, local-first state for the operational sections of the app:
 * Guardrails (rules + registered agents), Voice Gateway (endpoints, CCaaS
 * targets, live sessions), Admin (team, deployments, secrets) and
 * Super Admin (orgs, quotas, flags, compliance), plus the audit trail that
 * ties them together.
 *
 * Backed by localStorage with a subscribe/notify contract so React reads it
 * through `useSyncExternalStore`. A backend can replace the adapter without
 * touching the pages.
 */

import { useSyncExternalStore } from 'react';
import type { Rule } from '../sentinel/ruleEngine';
import type { AudioCodec, CallState, CcaasTarget, StreamTransport } from '../streamlink/types';

// ── Types ────────────────────────────────────────────────────────────────

export interface RegisteredAgent {
  id: string;
  description: string;
  endpoint: string;
  allowedTools: string[];
  enabled: boolean;
}

export interface VoiceEndpointRecord {
  id: string;
  name: string;
  transport: StreamTransport;
  address: string;
  ccaas: CcaasTarget;
  did: string;
  codecs: AudioCodec[];
  dtmfMode: 'rfc2833' | 'inband' | 'sip-info';
  enabled: boolean;
}

export interface SessionRecord {
  id: string;
  endpointId: string;
  direction: 'inbound' | 'outbound';
  state: CallState;
  from: string;
  to: string;
  agentId: string | null;
  startedAt: number;
  endedAt?: number;
}

export type Role = 'owner' | 'admin' | 'builder' | 'tester' | 'viewer';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActive: number;
}

export interface DeploymentRecord {
  id: string;
  name: string;
  environment: 'dev' | 'staging' | 'prod';
  status: 'building' | 'live' | 'failed' | 'stopped';
  version: string;
  createdAt: number;
}

export interface Org {
  id: string;
  name: string;
  plan: 'free' | 'team' | 'business' | 'enterprise';
  regions: string[];
  createdAt: number;
}

export interface Quota {
  id: string;
  orgId: string;
  metric: 'runs_per_day' | 'spend_per_month' | 'concurrent_calls' | 'seats';
  limit: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number; // 0-100
}

export interface AlertRule {
  id: string;
  name: string;
  metric: 'flow_latency_ms' | 'flow_cost' | 'flow_success' | 'flow_tokens';
  op: 'gt' | 'lt';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  area: 'guardrails' | 'gateway' | 'observability' | 'insights' | 'admin' | 'superadmin' | 'designer';
  action: string;
  detail: string;
}

export interface WorkspaceState {
  rules: Rule[];
  agents: RegisteredAgent[];
  endpoints: VoiceEndpointRecord[];
  sessions: SessionRecord[];
  members: Member[];
  deployments: DeploymentRecord[];
  orgs: Org[];
  quotas: Quota[];
  flags: FeatureFlag[];
  alerts: AlertRule[];
  audit: AuditEntry[];
  compliance: { dataResidency: string; retentionDays: number; hipaaBaa: boolean; gdprDpa: boolean; soc2: boolean };
}

// ── Seed ─────────────────────────────────────────────────────────────────

const SEED_RULES: Rule[] = [
  {
    id: 'rule_pii_out',
    phase: 'post_llm',
    when: [{ field: 'text.contains', op: 'contains', value: 'ssn' }],
    then: 'redact',
    message: 'PII-shaped content leaving the model is redacted'
  },
  {
    id: 'rule_refund_limit',
    phase: 'pre_tool',
    when: [{ field: 'variables.refund_amount', op: 'gt', value: 500 }],
    then: 'escalate',
    message: 'Refunds over $500 need a human'
  },
  {
    id: 'rule_unverified_identity',
    phase: 'pre_llm',
    when: [{ field: 'variables.identity_verified', op: 'eq', value: false }],
    then: 'escalate',
    message: 'Unverified caller cannot transact'
  },
  {
    id: 'rule_offhours_cost',
    phase: 'pre_llm',
    when: [{ field: 'variables.after_hours', op: 'eq', value: true }],
    then: 'allow',
    message: 'Route after-hours traffic to the cheaper model',
    set: { model: 'gpt-4o-mini', costCeiling: 0.1 }
  }
];

const SEED_STATE: WorkspaceState = {
  rules: SEED_RULES,
  agents: [
    {
      id: 'billing',
      description: 'Billing, refunds and payment capture',
      endpoint: 'http://localhost:8080/agents/billing',
      allowedTools: ['get_balance', 'issue_refund', 'charge_card'],
      enabled: true
    },
    {
      id: 'support',
      description: 'Tier-1 troubleshooting and order status',
      endpoint: 'http://localhost:8080/agents/support',
      allowedTools: ['lookup_order', 'reset_pin'],
      enabled: true
    }
  ],
  endpoints: [
    {
      id: 'ep_sip_primary',
      name: 'Primary SIP trunk',
      transport: 'sip',
      address: 'sip:gw.corp.example.com:5060',
      ccaas: 'genesys',
      did: '+14155550100',
      codecs: ['pcmu', 'pcma', 'opus'],
      dtmfMode: 'rfc2833',
      enabled: true
    },
    {
      id: 'ep_ws_dev',
      name: 'Dev WebSocket',
      transport: 'websocket',
      address: 'wss://localhost:8443/media',
      ccaas: 'custom',
      did: '',
      codecs: ['opus'],
      dtmfMode: 'inband',
      enabled: true
    }
  ],
  sessions: [],
  members: [
    { id: 'u_1', name: 'Ashutosh Sidana', email: 'ashutosh@example.com', role: 'owner', lastActive: Date.now() },
    { id: 'u_2', name: 'Priya (CX lead)', email: 'priya@example.com', role: 'admin', lastActive: Date.now() - 7200000 },
    { id: 'u_3', name: 'Sam (QA)', email: 'sam@example.com', role: 'tester', lastActive: Date.now() - 86400000 }
  ],
  deployments: [],
  orgs: [
    { id: 'org_acme', name: 'Acme Financial', plan: 'enterprise', regions: ['us-east-1', 'eu-west-1'], createdAt: Date.now() - 86400000 * 90 },
    { id: 'org_northwind', name: 'Northwind Retail', plan: 'team', regions: ['us-east-1'], createdAt: Date.now() - 86400000 * 30 }
  ],
  quotas: [
    { id: 'q1', orgId: 'org_acme', metric: 'spend_per_month', limit: 25000 },
    { id: 'q2', orgId: 'org_acme', metric: 'concurrent_calls', limit: 500 },
    { id: 'q3', orgId: 'org_northwind', metric: 'spend_per_month', limit: 2500 }
  ],
  flags: [
    { id: 'ff_s2s', name: 'Realtime speech-to-speech', description: 'Grok Voice / GPT Live / Gemini Live sessions', enabled: false, rollout: 25 },
    { id: 'ff_a2ui', name: 'A2UI render protocol', description: 'Google A2UI surfaces in the copilot pane', enabled: false, rollout: 10 },
    { id: 'ff_webmcp', name: 'Web MCP agents', description: 'Expose agents as MCP tools on the web', enabled: true, rollout: 100 }
  ],
  alerts: [
    { id: 'al_latency', name: 'p95 latency above 2s', metric: 'flow_latency_ms', op: 'gt', threshold: 2000, severity: 'warning', enabled: true },
    { id: 'al_cost', name: 'Turn cost above $0.05', metric: 'flow_cost', op: 'gt', threshold: 0.05, severity: 'warning', enabled: true },
    { id: 'al_success', name: 'Success rate below 95%', metric: 'flow_success', op: 'lt', threshold: 0.95, severity: 'critical', enabled: true }
  ],
  audit: [],
  compliance: { dataResidency: 'us-east-1', retentionDays: 90, hipaaBaa: false, gdprDpa: true, soc2: true }
};

// ── Store ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cx_workspace_v1';

function load(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(SEED_STATE);
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    // Merge with seed so new fields appear for existing workspaces.
    return { ...structuredClone(SEED_STATE), ...parsed };
  } catch {
    return structuredClone(SEED_STATE);
  }
}

let state: WorkspaceState = typeof localStorage === 'undefined' ? structuredClone(SEED_STATE) : load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/unavailable — the session keeps working in memory
  }
}

function emit() {
  listeners.forEach(l => l());
}

export function getWorkspace(): WorkspaceState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Patch the workspace and append an audit entry in one shot. */
export function updateWorkspace(
  patch: Partial<WorkspaceState>,
  audit?: { actor?: string; area: AuditEntry['area']; action: string; detail: string }
): void {
  state = { ...state, ...patch };
  if (audit) {
    state = {
      ...state,
      audit: [
        {
          id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          at: Date.now(),
          actor: audit.actor || 'you',
          area: audit.area,
          action: audit.action,
          detail: audit.detail
        },
        ...state.audit
      ].slice(0, 200)
    };
  }
  persist();
  emit();
}

/** Append an audit entry without changing data. */
export function recordAudit(
  area: AuditEntry['area'],
  action: string,
  detail: string,
  actor = 'you'
): void {
  updateWorkspace({}, { actor, area, action, detail });
}

export function resetWorkspace(): void {
  state = structuredClone(SEED_STATE);
  persist();
  emit();
}

export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(subscribe, getWorkspace, getWorkspace);
}

// ── Domain helpers ───────────────────────────────────────────────────────

export const ACTIVE_RULES = (s: WorkspaceState): Rule[] => s.rules;

export function upsertRule(rule: Rule, auditDetail: string): void {
  const exists = state.rules.some(r => r.id === rule.id);
  updateWorkspace(
    { rules: exists ? state.rules.map(r => (r.id === rule.id ? rule : r)) : [...state.rules, rule] },
    { area: 'guardrails', action: exists ? 'Updated rule' : 'Created rule', detail: auditDetail }
  );
}

export function removeRule(id: string): void {
  updateWorkspace(
    { rules: state.rules.filter(r => r.id !== id) },
    { area: 'guardrails', action: 'Deleted rule', detail: id }
  );
}

export function upsertEndpoint(endpoint: VoiceEndpointRecord): void {
  const exists = state.endpoints.some(e => e.id === endpoint.id);
  updateWorkspace(
    {
      endpoints: exists
        ? state.endpoints.map(e => (e.id === endpoint.id ? endpoint : e))
        : [...state.endpoints, endpoint]
    },
    {
      area: 'gateway',
      action: exists ? 'Updated endpoint' : 'Created endpoint',
      detail: `${endpoint.name} (${endpoint.transport})`
    }
  );
}

export function removeEndpoint(id: string): void {
  updateWorkspace(
    { endpoints: state.endpoints.filter(e => e.id !== id), sessions: state.sessions.filter(s => s.endpointId !== id) },
    { area: 'gateway', action: 'Removed endpoint', detail: id }
  );
}

/** Place (or update) a live call. Used by the gateway pages and the loopback transport. */
export function placeCall(session: SessionRecord): void {
  const exists = state.sessions.some(s => s.id === session.id);
  updateWorkspace(
    { sessions: exists ? state.sessions.map(s => (s.id === session.id ? session : s)) : [session, ...state.sessions] },
    {
      area: 'gateway',
      action: exists ? 'Updated call' : 'Call placed',
      detail: `${session.from} → ${session.to}`
    }
  );
}

export function endCall(id: string): void {
  updateWorkspace(
    {
      sessions: state.sessions.map(s =>
        s.id === id && s.state !== 'ended' ? { ...s, state: 'ended', endedAt: Date.now() } : s
      )
    },
    { area: 'gateway', action: 'Call ended', detail: id }
  );
}

export const liveSessions = (s: WorkspaceState): SessionRecord[] =>
  s.sessions.filter(x => x.state !== 'ended');

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  builder: 'Builder',
  tester: 'Tester',
  viewer: 'Viewer'
};