/**
 * Super Admin — the deployment level, above any single team.
 *
 * Organizations, quotas and flags gate what tenants can do; compliance
 * records where their data lives and how long it is kept.
 */

import React, { useState } from 'react';
import {
  Button,
  Card,
  Field,
  Grid,
  Input,
  Page,
  Pill,
  Select,
  Stat,
  Table,
  Td,
  Toggle,
  theme
} from '../components/ui';
import { Org, Quota, updateWorkspace, useWorkspace } from '../workspace/store';
import type { PageContext } from './context';

const PLANS: Array<{ label: string; value: Org['plan'] }> = [
  { label: 'Free', value: 'free' },
  { label: 'Team', value: 'team' },
  { label: 'Business', value: 'business' },
  { label: 'Enterprise', value: 'enterprise' }
];

const METRICS: Array<{ label: string; value: Quota['metric'] }> = [
  { label: 'Runs per day', value: 'runs_per_day' },
  { label: 'Spend per month (USD)', value: 'spend_per_month' },
  { label: 'Concurrent calls', value: 'concurrent_calls' },
  { label: 'Seats', value: 'seats' }
];

const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1', 'ap-northeast-1'];

const Orgs: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<Org['plan']>('team');
  const [region, setRegion] = useState(REGIONS[0]);

  return (
    <Page
      icon="🏛️"
      title="Organizations"
      hint="Tenants on this deployment. Each one carries its own plan, regions and quotas — the same isolation a multi-tenant CCaaS integration needs."
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Organizations" value={ws.orgs.length} />
        <Stat label="Enterprise" value={ws.orgs.filter(o => o.plan === 'enterprise').length} />
        <Stat label="Regions in use" value={new Set(ws.orgs.flatMap(o => o.regions)).size} />
      </div>

      <Card title="Onboard an organization">
        <Grid min={220}>
          <Field label="Name">
            <Input value={name} onChange={setName} placeholder="Contoso Energy" />
          </Field>
          <Field label="Plan">
            <Select value={plan} onChange={v => setPlan(v as Org['plan'])} options={PLANS} />
          </Field>
          <Field label="Primary region">
            <Select value={region} onChange={setRegion} options={REGIONS.map(r => ({ label: r, value: r }))} />
          </Field>
        </Grid>
        <Button
          style={{ marginTop: 12 }}
          tone="primary"
          disabled={!name.trim()}
          onClick={() => {
            const org: Org = {
              id: `org_${Date.now()}`,
              name: name.trim(),
              plan,
              regions: [region],
              createdAt: Date.now()
            };
            updateWorkspace({ orgs: [...ws.orgs, org] }, {
              area: 'superadmin',
              action: 'Created organization',
              detail: `${org.name} (${org.plan})`
            });
            setName('');
            notify(`${org.name} onboarded`, 'good');
          }}
        >
          Create organization
        </Button>
      </Card>

      <Card title="Tenants">
        <Table columns={['Organization', 'Plan', 'Regions', 'Quotas', 'Created', '']}>
          {ws.orgs.map(o => (
            <tr key={o.id}>
              <Td style={{ fontWeight: 600 }}>{o.name}</Td>
              <Td>
                <Pill tone={o.plan === 'enterprise' ? 'info' : o.plan === 'free' ? 'muted' : 'good'}>{o.plan}</Pill>
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {o.regions.map(r => (
                    <Pill key={r}>{r}</Pill>
                  ))}
                </div>
              </Td>
              <Td style={{ fontSize: 12 }}>{ws.quotas.filter(q => q.orgId === o.id).length} rules</Td>
              <Td style={{ fontSize: 12, color: theme.muted }}>{new Date(o.createdAt).toLocaleDateString()}</Td>
              <Td>
                <Button
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    updateWorkspace(
                      {
                        orgs: ws.orgs.filter(x => x.id !== o.id),
                        quotas: ws.quotas.filter(q => q.orgId !== o.id)
                      },
                      { area: 'superadmin', action: 'Removed organization', detail: o.name }
                    );
                    notify(`${o.name} removed`);
                  }}
                >
                  Remove
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </Page>
  );
};

const Quotas: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const [orgId, setOrgId] = useState(ws.orgs[0]?.id || '');
  const [metric, setMetric] = useState<Quota['metric']>('runs_per_day');
  const [limit, setLimit] = useState('10000');

  return (
    <Page
      icon="🚦"
      title="Quotas & Limits"
      hint="Ceilings enforced at the gateway: a tenant over its spend limit stops reaching models, and over its concurrency limit stops getting media. Enforced counters land with the backend; here they are the policy of record."
    >
      <Card title="Add a quota">
        <Grid min={220}>
          <Field label="Organization">
            <Select
              value={orgId}
              onChange={setOrgId}
              options={ws.orgs.map(o => ({ label: o.name, value: o.id }))}
            />
          </Field>
          <Field label="Metric">
            <Select value={metric} onChange={v => setMetric(v as Quota['metric'])} options={METRICS} />
          </Field>
          <Field label="Limit">
            <Input value={limit} onChange={setLimit} />
          </Field>
        </Grid>
        <Button
          style={{ marginTop: 12 }}
          tone="primary"
          disabled={!orgId || !Number(limit)}
          onClick={() => {
            const q: Quota = { id: `q_${Date.now()}`, orgId, metric, limit: Number(limit) };
            updateWorkspace({ quotas: [...ws.quotas, q] }, {
              area: 'superadmin',
              action: 'Added quota',
              detail: `${ws.orgs.find(o => o.id === orgId)?.name}: ${metric}=${q.limit}`
            });
            notify('Quota added', 'good');
          }}
        >
          Add quota
        </Button>
      </Card>

      <Card title={`Quota rules (${ws.quotas.length})`}>
        <Table columns={['Organization', 'Metric', 'Limit', '']}>
          {ws.quotas.map(q => (
            <tr key={q.id}>
              <Td>{ws.orgs.find(o => o.id === q.orgId)?.name || q.orgId}</Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{q.metric}</Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{q.limit.toLocaleString()}</Td>
              <Td>
                <Button
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    updateWorkspace(
                      { quotas: ws.quotas.filter(x => x.id !== q.id) },
                      { area: 'superadmin', action: 'Removed quota', detail: q.id }
                    );
                    notify('Quota removed');
                  }}
                >
                  Remove
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </Page>
  );
};

const Flags: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  return (
    <Page
      icon="🚩"
      title="Feature Flags"
      hint="Gate capability across the deployment. Flags here document rollout intent for realtime S2S, A2UI and web MCP — the features themselves land with their tasks in system-design.md."
    >
      <Card title="Flags">
        {ws.flags.map(f => (
          <div
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 0',
              borderBottom: `1px solid ${theme.border}`
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{f.name}</div>
              <div style={{ fontSize: 12, color: theme.muted }}>{f.description}</div>
            </div>
            <div style={{ width: 160 }}>
              <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>
                rollout {f.rollout}%
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={f.rollout}
                onChange={e =>
                  updateWorkspace(
                    { flags: ws.flags.map(x => (x.id === f.id ? { ...x, rollout: Number(e.target.value) } : x)) },
                    { area: 'superadmin', action: 'Changed rollout', detail: `${f.name}=${e.target.value}%` }
                  )
                }
                style={{ width: '100%' }}
              />
            </div>
            <Toggle
              checked={f.enabled}
              onChange={v => {
                updateWorkspace(
                  { flags: ws.flags.map(x => (x.id === f.id ? { ...x, enabled: v } : x)) },
                  { area: 'superadmin', action: v ? 'Enabled flag' : 'Disabled flag', detail: f.name }
                );
                notify(`${f.name} ${v ? 'enabled' : 'disabled'}`, v ? 'good' : 'info');
              }}
            />
            <Pill tone={f.enabled ? 'good' : 'muted'}>{f.enabled ? 'on' : 'off'}</Pill>
          </div>
        ))}
      </Card>
    </Page>
  );
};

const Compliance: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const c = ws.compliance;

  const set = (patch: Partial<typeof c>) =>
    updateWorkspace({ compliance: { ...c, ...patch } }, {
      area: 'superadmin',
      action: 'Updated compliance settings',
      detail: Object.keys(patch).join(', ')
    });

  return (
    <Page
      icon="⚖️"
      title="Compliance"
      hint="Where transcripts and recordings live, how long they are kept, and which attestations this deployment holds. Guardrails decide what may be logged at all; this decides where the log goes."
    >
      <Card title="Data handling">
        <Grid min={240}>
          <Field label="Data residency">
            <Select
              value={c.dataResidency}
              onChange={v => set({ dataResidency: v })}
              options={REGIONS.map(r => ({ label: r, value: r }))}
            />
          </Field>
          <Field label="Retention (days)" hint="Transcripts, recordings and audit entries share this window.">
            <Input value={String(c.retentionDays)} onChange={v => set({ retentionDays: Number(v) || 0 })} />
          </Field>
        </Grid>
      </Card>

      <Card title="Attestations">
        <div style={{ display: 'grid', gap: 10 }}>
          {([
            ['hipaaBaa', 'HIPAA BAA', 'Guardrails redact PHI before any provider call; recordings inherit the same gate.'],
            ['gdprDpa', 'GDPR / DPA', 'Data-processing agreement covering processor and sub-processor list.'],
            ['soc2', 'SOC 2 Type II', 'Change management over the audit trail you can see in Observability.']
          ] as const).map(([key, label, detail]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle
                checked={c[key]}
                onChange={v => {
                  set({ [key]: v } as Partial<typeof c>);
                  notify(`${label} ${v ? 'recorded' : 'cleared'}`, v ? 'good' : 'info');
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{label}</div>
                <div style={{ fontSize: 12, color: theme.muted }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
};

export const superAdminPages: Record<string, React.FC<PageContext>> = {
  'superadmin.orgs': Orgs,
  'superadmin.quotas': Quotas,
  'superadmin.flags': Flags,
  'superadmin.compliance': Compliance
};