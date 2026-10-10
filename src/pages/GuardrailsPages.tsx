/**
 * Guardrails — the Agent Firewall as first-class pages.
 *
 * Policy Rules    ordered rules, first match per phase wins
 * PII / PHI       live redaction playground over the real pattern sets
 * Test Bench      run text + session state through the live rule set
 * Agent Router    which agent owns which tools
 */

import React, { useMemo, useState } from 'react';
import {
  Bars,
  Button,
  Card,
  Code,
  Empty,
  Field,
  Grid,
  Input,
  Page,
  Pill,
  Select,
  Table,
  Td,
  Textarea,
  Toggle,
  theme
} from '../components/ui';
import {
  DEFAULT_MONEY_RULES,
  Rule,
  RuleAction,
  RuleCondition,
  RuleOperator,
  SentinelPhase,
  evaluateRules
} from '../sentinel/ruleEngine';
import { PHI_PATTERNS, redactPhi } from '../sentinel/phi';
import { removeRule, updateWorkspace, upsertRule, useWorkspace } from '../workspace/store';
import type { PageContext } from './context';

const PHASES: Array<{ label: string; value: SentinelPhase | 'any' }> = [
  { label: 'Any phase', value: 'any' },
  { label: 'Before the LLM (pre_llm)', value: 'pre_llm' },
  { label: 'After the LLM (post_llm)', value: 'post_llm' },
  { label: 'Before a tool call (pre_tool)', value: 'pre_tool' },
  { label: 'After a tool call (post_tool)', value: 'post_tool' }
];

const OPERATORS: Array<{ label: string; value: RuleOperator }> = [
  { label: 'is', value: 'eq' },
  { label: 'is not', value: 'neq' },
  { label: '>', value: 'gt' },
  { label: '≥', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '≤', value: 'lte' },
  { label: 'exists', value: 'exists' },
  { label: 'contains', value: 'contains' }
];

const ACTIONS: Array<{ label: string; value: RuleAction }> = [
  { label: 'Allow', value: 'allow' },
  { label: 'Block', value: 'block' },
  { label: 'Redact', value: 'redact' },
  { label: 'Escalate to a human', value: 'escalate' }
];

const ACTION_TONE: Record<RuleAction, 'good' | 'warn' | 'bad' | 'info'> = {
  allow: 'good',
  block: 'bad',
  redact: 'info',
  escalate: 'warn'
};

function emptyRule(): Rule {
  return {
    id: `rule_${Date.now()}`,
    phase: 'pre_llm',
    when: [{ field: '', op: 'exists' }],
    then: 'block',
    message: ''
  };
}

// ── Policy Rules ─────────────────────────────────────────────────────────

const PolicyRules: React.FC<PageContext> = ({ navigate }) => {
  const ws = useWorkspace();
  const [draft, setDraft] = useState<Rule | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of ws.rules) c[r.then] = (c[r.then] || 0) + 1;
    return c;
  }, [ws.rules]);

  const patchDraft = (patch: Partial<Rule>) => setDraft(d => (d ? { ...d, ...patch } : d));
  const patchCondition = (i: number, patch: Partial<RuleCondition>) =>
    setDraft(d =>
      d
        ? {
            ...d,
            when: d.when.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
          }
        : d
    );

  return (
    <Page
      icon="📋"
      title="Policy Rules"
      hint="Rules are evaluated in order for each phase; the first match decides. A matched rule can also set configuration (model, cost ceiling, provider) so policy governs what the agent runs on."
      actions={
        <>
          <Button tone="ghost" onClick={() => navigate('guardrails.testbench')}>
            Open test bench
          </Button>
          <Button
            onClick={() => {
              updateWorkspace(
                { rules: [...ws.rules, ...DEFAULT_MONEY_RULES] },
                { area: 'guardrails', action: 'Imported defaults', detail: `${DEFAULT_MONEY_RULES.length} money rules` }
              );
            }}
          >
            Import money-policy defaults
          </Button>
          <Button tone="primary" onClick={() => setDraft(emptyRule())}>
            New rule
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['allow', 'block', 'redact', 'escalate'] as RuleAction[]).map(a => (
          <div
            key={a}
            style={{
              background: theme.panel2,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              padding: '10px 14px'
            }}
          >
            <div style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase' }}>{a}</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{counts[a] || 0}</div>
          </div>
        ))}
      </div>

      <Card title={`Active rule set (${ws.rules.length})`}>
        <Table
          columns={['Phase', 'When', 'Then', 'Policy sets', 'Message', '']}
          empty="No rules yet — agents run unprotected. Create one, or import the money-policy defaults."
        >
          {ws.rules.map(rule => (
            <tr key={rule.id}>
              <Td>
                <Pill>{rule.phase}</Pill>
              </Td>
              <Td>
                {rule.when.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, fontFamily: 'monospace' }}>
                    {c.field || '…'} {c.op} {c.value !== undefined ? String(c.value) : ''}
                  </div>
                ))}
              </Td>
              <Td>
                <Pill tone={ACTION_TONE[rule.then]}>{rule.then}</Pill>
              </Td>
              <Td>
                {rule.set ? (
                  <code style={{ fontSize: 11, color: '#93c5fd' }}>
                    {Object.entries(rule.set).map(([k, v]) => `${k}=${String(v)}`).join(' ')}
                  </code>
                ) : (
                  <span style={{ color: '#5f5f78', fontSize: 12 }}>—</span>
                )}
              </Td>
              <Td style={{ fontSize: 12, color: theme.muted }}>{rule.message}</Td>
              <Td>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Button size="sm" tone="ghost" onClick={() => setDraft({ ...rule })}>
                    Edit
                  </Button>
                  <Button size="sm" tone="danger" onClick={() => removeRule(rule.id)}>
                    Delete
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      {draft && (
        <Card title={ws.rules.some(r => r.id === draft.id) ? 'Edit rule' : 'New rule'}>
          <Grid>
            <Field label="Rule id">
              <Input value={draft.id} onChange={v => patchDraft({ id: v })} />
            </Field>
            <Field label="Phase">
              <Select
                value={draft.phase}
                onChange={v => patchDraft({ phase: v as SentinelPhase | 'any' })}
                options={PHASES}
              />
            </Field>
            <Field label="Action">
              <Select
                value={draft.then}
                onChange={v => patchDraft({ then: v as RuleAction })}
                options={ACTIONS}
              />
            </Field>
            <Field label="Message shown to the caller / agent">
              <Input value={draft.message} onChange={v => patchDraft({ message: v })} />
            </Field>
          </Grid>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>
              Conditions — all must match
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {draft.when.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8 }}>
                  <Input
                    value={c.field}
                    placeholder="variables.refund_amount"
                    onChange={v => patchCondition(i, { field: v })}
                  />
                  <Select
                    value={c.op}
                    onChange={v => patchCondition(i, { op: v as RuleOperator })}
                    options={OPERATORS}
                  />
                  <Input
                    value={c.value === undefined ? '' : String(c.value)}
                    placeholder="value"
                    onChange={v =>
                      patchCondition(i, {
                        value: v === '' ? undefined : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v
                      })
                    }
                  />
                  <Button
                    tone="danger"
                    size="sm"
                    disabled={draft.when.length === 1}
                    onClick={() => patchDraft({ when: draft.when.filter((_, idx) => idx !== i) })}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <div>
                <Button size="sm" onClick={() => patchDraft({ when: [...draft.when, { field: '', op: 'exists' }] })}>
                  + Condition
                </Button>
              </div>
            </div>
          </div>

          <Field
            label="Policy sets (JSON, optional)"
            hint='Merged into session state on match — e.g. {"model":"gpt-4o-mini","costCeiling":0.1}'
            style={{ marginTop: 14 }}
          >
            <Textarea
              mono
              rows={3}
              value={draft.set ? JSON.stringify(draft.set, null, 2) : ''}
              onChange={v => {
                try {
                  patchDraft({ set: v.trim() ? (JSON.parse(v) as Record<string, unknown>) : undefined });
                } catch {
                  /* keep last valid — typing JSON is not valid JSON yet */
                }
              }}
            />
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button
              tone="primary"
              disabled={!draft.when.every(c => c.field.trim())}
              onClick={() => {
                upsertRule(draft, `${draft.id} → ${draft.then}`);
                setDraft(null);
              }}
            >
              Save rule
            </Button>
            <Button tone="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </Page>
  );
};

// ── PII / PHI redaction ───────────────────────────────────────────────────

const PII_PATTERNS: Array<{ label: string; regex: RegExp; replacement: string }> = [
  { label: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' },
  {
    label: 'card',
    regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: '****-****-****-****'
  },
  { label: 'email', regex: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, replacement: '***@***.***' }
];

const SAMPLES = [
  'Hi, I\'m Jane Doe, DOB 04/12/1977, member ID ACME-88213. My card is 4111 1111 1111 1111 and my email is jane@acme.com — my SSN is 123-45-6789.',
  'Please refund $850 to my card.',
  'My order shipped to 90210-1234 last week.'
];

const Redaction: React.FC<PageContext> = ({ notify }) => {
  const [text, setText] = useState(SAMPLES[0]);
  const { redacted, found } = redactPhi(text);

  let piiFound: string[] = [];
  let withPii = redacted;
  for (const p of PII_PATTERNS) {
    if (p.regex.test(withPii)) {
      piiFound.push(p.label);
      withPii = withPii.replace(p.regex, p.replacement);
    }
    p.regex.lastIndex = 0;
  }

  return (
    <Page
      icon="🩸"
      title="PII / PHI Redaction"
      hint="Health identifiers (DOB, MRN, member IDs, ZIP+4) are redacted alongside personal data before anything reaches a log, an audit trail or a third-party model. Machine-matchable patterns only — names and free-text conditions still need the LLM judge or a human."
      actions={
        <>
          {SAMPLES.map((s, i) => (
            <Button key={i} size="sm" tone="ghost" onClick={() => setText(s)}>
              Sample {i + 1}
            </Button>
          ))}
          <Button
            tone="primary"
            onClick={() => notify(`Copied redacted output`, 'good')}
          >
            Copy redacted output
          </Button>
        </>
      }
    >
      <Grid min={280}>
        <Card title="Incoming text">
          <Textarea rows={10} value={text} onChange={setText} />
        </Card>
        <Card title="Redacted output">
          <pre
            style={{
              margin: 0,
              padding: 12,
              minHeight: 200,
              background: '#0b0b14',
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              color: '#cbd5e1'
            }}
          >
            {withPii}
          </pre>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {found.length === 0 && piiFound.length === 0 && <Pill tone="good">nothing detected</Pill>}
            {found.map(f => (
              <Pill key={f} tone="warn">
                phi:{f}
              </Pill>
            ))}
            {piiFound.map(f => (
              <Pill key={f} tone="bad">
                pii:{f}
              </Pill>
            ))}
          </div>
        </Card>
      </Grid>

      <Card title="Patterns in force" hint="Applied in order; last match wins the label.">
        <Table columns={['Class', 'Label', 'Replacement']}>
          {PII_PATTERNS.map(p => (
            <tr key={p.label}>
              <Td>
                <Pill tone="bad">PII</Pill>
              </Td>
              <Td>{p.label}</Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.replacement}</Td>
            </tr>
          ))}
          {PHI_PATTERNS.map(p => (
            <tr key={p.label}>
              <Td>
                <Pill tone="warn">PHI</Pill>
              </Td>
              <Td>{p.label}</Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.replacement}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </Page>
  );
};

// ── Test bench ───────────────────────────────────────────────────────────

const TestBench: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const [text, setText] = useState('I want a refund of $850 for my last invoice.');
  const [stateJson, setStateJson] = useState(
    '{\n  "variables": { "refund_amount": 850, "identity_verified": false }\n}'
  );
  const [phase, setPhase] = useState<SentinelPhase | 'any'>('any');

  let state: Record<string, unknown> = {};
  let parseError: string | null = null;
  try {
    state = JSON.parse(stateJson) as Record<string, unknown>;
  } catch (err) {
    parseError = String(err);
  }

  const decision = parseError ? null : evaluateRules(ws.rules, phase, { text, ...state });
  const phi = redactPhi(text);

  return (
    <Page
      icon="🔬"
      title="Test Bench"
      hint="Dry-run the live rule set. Nothing here runs an agent — it is exactly the evaluation the Agent Firewall performs at each phase, so what you see is what the caller would get."
      actions={
        <Button
          tone="primary"
          disabled={!!parseError}
          onClick={() => {
            recordBench(decision?.action || 'allow');
            notify(`Decision: ${decision?.action || 'allow'}`, decision?.allowed === false ? 'bad' : 'good');
          }}
        >
          Record decision
        </Button>
      }
    >
      <Grid min={300}>
        <Card title="Input">
          <Field label="Caller text">
            <Textarea rows={4} value={text} onChange={setText} />
          </Field>
          <Field label="Session state (JSON)" style={{ marginTop: 12 }}>
            <Textarea mono rows={8} value={stateJson} onChange={setStateJson} />
          </Field>
          {parseError && (
            <div style={{ color: theme.danger, fontSize: 12, marginTop: 6 }}>Invalid JSON: {parseError}</div>
          )}
          <Field label="Evaluate phase" style={{ marginTop: 12 }}>
            <Select
              value={phase}
              onChange={v => setPhase(v as SentinelPhase | 'any')}
              options={PHASES}
            />
          </Field>
        </Card>

        <Card title="Decision">
          {!decision ? (
            <Empty>Fix the session state to evaluate.</Empty>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 26 }}>{decision.allowed ? '✅' : '🛑'}</span>
                <Pill tone={ACTION_TONE[decision.action]}>{decision.action}</Pill>
                {decision.matchedRule && <Pill>matched: {decision.matchedRule}</Pill>}
              </div>
              {decision.message && (
                <p style={{ fontSize: 13, color: theme.text, margin: '0 0 12px' }}>{decision.message}</p>
              )}
              {decision.set ? (
                <>
                  <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>
                    Policy overrides applied to the run
                  </div>
                  <Code value={decision.set} />
                </>
              ) : (
                <div style={{ fontSize: 12, color: theme.muted }}>No configuration overrides on this match.</div>
              )}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>
                  Redaction preview
                </div>
                <div style={{ fontSize: 13, color: theme.text, background: '#0b0b14', padding: 10, borderRadius: 6 }}>
                  {phi.redacted}
                </div>
              </div>
            </>
          )}
        </Card>
      </Grid>

      <Card title={`Rule order (${ws.rules.length})`} hint="Evaluation stops at the first match for the selected phase.">
        <Bars
          tone={theme.warn}
          data={ws.rules.map((r, i) => ({
            label: `${i + 1}. ${r.phase} · ${r.then}`,
            value: 100 - i,
            display: r.id
          }))}
        />
      </Card>
    </Page>
  );
};

function recordBench(action: string): void {
  updateWorkspace(
    {},
    { area: 'guardrails', action: 'Test bench evaluation', detail: `decision=${action}` }
  );
}

// ── Agent router ─────────────────────────────────────────────────────────

const AgentRouter: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [tools, setTools] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const agents = ws.agents;
  const active = agents.find(a => a.id === selected) || agents[0];

  const add = () => {
    if (!name.trim()) return;
    const id = name.trim().toLowerCase().replace(/\s+/g, '-');
    updateWorkspace(
      {
        agents: [
          ...agents,
          {
            id,
            description: description.trim() || id,
            endpoint: endpoint.trim(),
            allowedTools: tools.split(',').map(t => t.trim()).filter(Boolean),
            enabled: true
          }
        ]
      },
      { area: 'guardrails', action: 'Registered agent', detail: id }
    );
    setName('');
    setDescription('');
    setEndpoint('');
    setTools('');
    setSelected(id);
  };

  return (
    <Page
      icon="🧭"
      title="Agent Router"
      hint="The firewall fronts every tool call. Register an agent with the tools it may call — anything outside the list is denied at the pre_tool gate before it reaches a model or a system of record."
    >
      <Card title={`Registered agents (${agents.length})`}>
        <Table columns={['Agent', 'Purpose', 'Endpoint', 'Allowed tools', '']} empty="No agents registered.">
          {agents.map(a => (
            <tr key={a.id} style={{ background: active?.id === a.id ? 'rgba(99,102,241,0.10)' : undefined }}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{a.id}</span>
                  <Toggle
                    checked={a.enabled}
                    onChange={v =>
                      updateWorkspace(
                        { agents: agents.map(x => (x.id === a.id ? { ...x, enabled: v } : x)) },
                        { area: 'guardrails', action: v ? 'Enabled agent' : 'Disabled agent', detail: a.id }
                      )
                    }
                  />
                </div>
              </Td>
              <Td style={{ fontSize: 12, color: theme.muted }}>{a.description}</Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{a.endpoint || '—'}</Td>
              <Td>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {a.allowedTools.map(t => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Button size="sm" tone="ghost" onClick={() => setSelected(a.id)}>
                    Inspect
                  </Button>
                  <Button
                    size="sm"
                    tone="danger"
                    onClick={() =>
                      updateWorkspace(
                        { agents: agents.filter(x => x.id !== a.id) },
                        { area: 'guardrails', action: 'Unregistered agent', detail: a.id }
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Grid min={280}>
        <Card title="Register an agent">
          <Grid min={200}>
            <Field label="Agent id">
              <Input value={name} onChange={setName} placeholder="billing" />
            </Field>
            <Field label="Purpose">
              <Input value={description} onChange={setDescription} placeholder="Billing, refunds, payments" />
            </Field>
          </Grid>
          <Field label="Endpoint (URL or agent id)" style={{ marginTop: 12 }}>
            <Input value={endpoint} onChange={setEndpoint} placeholder="http://localhost:8080/agents/billing" />
          </Field>
          <Field
            label="Allowed tools (comma separated)"
            hint="Tool calls outside this list are blocked at the pre_tool gate."
            style={{ marginTop: 12 }}
          >
            <Input value={tools} onChange={setTools} placeholder="get_balance, issue_refund" />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Button tone="primary" disabled={!name.trim()} onClick={add}>
              Register agent
            </Button>
          </div>
        </Card>

        <Card title={active ? `Delegation — ${active.id}` : 'Delegation'}>
          {!active ? (
            <Empty>Register an agent to inspect its delegation.</Empty>
          ) : (
            <>
              <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8 }}>Pre-tool decision preview</div>
              <Code
                value={{
                  caller: { intent: 'refund_request', channel: 'voice' },
                  resolved_agent: active.id,
                  allowed_tools: active.allowedTools,
                  denied: 'anything else (blocked at pre_tool)',
                  transport: active.endpoint || 'in-process'
                }}
              />
              <Button
                style={{ marginTop: 12 }}
                onClick={() => notify(`Routed to ${active.id}`, 'good')}
              >
                Simulate delegation
              </Button>
            </>
          )}
        </Card>
      </Grid>
    </Page>
  );
};

export const guardrailsPages: Record<string, React.FC<PageContext>> = {
  'guardrails.rules': PolicyRules,
  'guardrails.redaction': Redaction,
  'guardrails.testbench': TestBench,
  'guardrails.agents': AgentRouter
};