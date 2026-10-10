/**
 * Observability — is it healthy?
 *
 * Health        flow health derived from real execution metrics
 * Alerts        threshold rules evaluated against those metrics
 * Metrics       latency / cost / success explorer + Prometheus scrape
 * Audit Trail   who changed what, across every section
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
  Stat,
  Table,
  Td,
  Toggle,
  theme
} from '../components/ui';
import { monitoringService } from '../monitoring/Monitoring';
import { updateWorkspace, useWorkspace, AuditEntry, AlertRule } from '../workspace/store';
import type { PageContext } from './context';

const WINDOWS = [
  { label: 'Last 15 minutes', ms: 15 * 60 * 1000 },
  { label: 'Last hour', ms: 60 * 60 * 1000 },
  { label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 }
];

const METRICS: Array<{ label: string; value: string }> = [
  { label: 'Flow latency (ms)', value: 'flow_latency_ms' },
  { label: 'Flow cost (USD)', value: 'flow_cost' },
  { label: 'Flow success (0/1)', value: 'flow_success' },
  { label: 'Flow tokens', value: 'flow_tokens' },
  { label: 'Node latency (ms)', value: 'node_latency_ms' }
];

const windowRange = (ms: number) => ({ start: Date.now() - ms, end: Date.now() });

// ── Health ───────────────────────────────────────────────────────────────

const Health: React.FC<PageContext> = ({ flowName, nodeCount, navigate }) => {
  const [tick, setTick] = useState(0);
  const report = useMemo(
    () => monitoringService.generateHealthReport('flow_1'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );
  const m = report.metrics as Record<string, ReturnType<typeof monitoringService.getAggregatedMetrics>>;
  const latency = m.latency;
  const cost = m.cost;
  const success = m.successRate;

  return (
    <Page
      icon="🩺"
      title="Health"
      hint={`Live status for “${flowName}”. Metrics come from real executions — run the flow in the Test Console and this page fills in.`}
      actions={
        <>
          <Button tone="ghost" onClick={() => navigate('observability.metrics')}>
            Metrics explorer
          </Button>
          <Button onClick={() => setTick(t => t + 1)}>Refresh</Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat
          label="Status"
          value={report.status}
          tone={report.status === 'healthy' ? 'good' : report.status === 'degraded' ? 'warn' : 'bad'}
          sub={`${nodeCount} nodes deployed`}
        />
        <Stat
          label="p95 latency"
          value={latency ? `${Math.round(latency.p95)} ms` : '—'}
          sub={latency ? `${latency.count} samples` : 'no runs yet'}
          tone={latency && latency.p95 > 2000 ? 'warn' : 'default'}
        />
        <Stat
          label="Success rate"
          value={success ? `${(success.avg * 100).toFixed(0)}%` : '—'}
          sub={success ? `${success.count} turns` : 'no runs yet'}
          tone={success && success.avg < 0.95 ? 'bad' : 'default'}
        />
        <Stat
          label="Cost"
          value={cost ? `$${cost.sum.toFixed(4)}` : '—'}
          sub={cost ? `avg $${cost.avg.toFixed(5)}` : 'no spend yet'}
        />
      </div>

      {report.recommendations.length > 0 && (
        <Card title="Recommendations" hint="Derived from the metrics above — not generic advice.">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: theme.text, lineHeight: 1.8 }}>
            {report.recommendations.map(r => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      )}

      <Grid min={300}>
        <Card title="Alerts">
          {report.alerts.length === 0 ? (
            <Empty>No alert rules firing. Create them in Alerts.</Empty>
          ) : (
            report.alerts.map(a => (
              <div key={a.id} style={{ fontSize: 13, color: theme.text }}>
                {a.name}
              </div>
            ))
          )}
        </Card>
        <Card title="What to do next">
          <div style={{ display: 'grid', gap: 8 }}>
            <Button onClick={() => navigate('designer.testconsole')}>Run the flow</Button>
            <Button tone="ghost" onClick={() => navigate('designer.preflight')}>
              Check preflight
            </Button>
            <Button tone="ghost" onClick={() => navigate('insights.performance')}>
              See per-node latency
            </Button>
          </div>
        </Card>
      </Grid>
    </Page>
  );
};

// ── Alerts ───────────────────────────────────────────────────────────────

const Alerts: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const rules = ws.alerts;
  const [draftName, setDraftName] = useState('');
  const [draftMetric, setDraftMetric] = useState<AlertRule['metric']>('flow_latency_ms');
  const [draftOp, setDraftOp] = useState<'gt' | 'lt'>('gt');
  const [draftThreshold, setDraftThreshold] = useState('');
  const [draftSeverity, setDraftSeverity] = useState<AlertRule['severity']>('warning');

  const save = (next: AlertRule[]) =>
    updateWorkspace(
      { alerts: next },
      { area: 'observability', action: 'Updated alert rules', detail: `${next.length} rules` }
    );

  const evaluate = (rule: AlertRule): { firing: boolean; value: number | null } => {
    const { start, end } = windowRange(60 * 60 * 1000);
    const agg = monitoringService.getAggregatedMetrics(rule.metric, start, end);
    if (!agg) return { firing: false, value: null };
    const value = rule.metric === 'flow_latency_ms' ? agg.p95 : agg.avg;
    return { firing: rule.op === 'gt' ? value > rule.threshold : value < rule.threshold, value };
  };

  return (
    <Page
      icon="🔔"
      title="Alerts"
      hint="Thresholds evaluated against live metrics from the last hour. Firing here does not page anyone — wire the Prometheus scrape in Settings once a collector is running."
    >
      <Card title={`Rules (${rules.length})`}>
        <Table columns={['Alert', 'Metric', 'Condition', 'Severity', 'Now', 'State', '']}>
          {rules.map(r => {
            const { firing, value } = evaluate(r);
            return (
              <tr key={r.id}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Toggle
                      checked={r.enabled}
                      onChange={v => save(rules.map(x => (x.id === r.id ? { ...x, enabled: v } : x)))}
                    />
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                  </div>
                </Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.metric}</Td>
                <Td style={{ fontSize: 12 }}>
                  {r.op} {r.threshold}
                </Td>
                <Td>
                  <Pill tone={r.severity === 'critical' ? 'bad' : r.severity === 'warning' ? 'warn' : 'info'}>
                    {r.severity}
                  </Pill>
                </Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {value === null ? '—' : value.toFixed(3)}
                </Td>
                <Td>
                  {!r.enabled ? (
                    <Pill>disabled</Pill>
                  ) : value === null ? (
                    <Pill>no data</Pill>
                  ) : firing ? (
                    <Pill tone="bad">firing</Pill>
                  ) : (
                    <Pill tone="good">ok</Pill>
                  )}
                </Td>
                <Td>
                  <Button
                    size="sm"
                    tone="danger"
                    onClick={() => {
                      save(rules.filter(x => x.id !== r.id));
                      notify(`Deleted “${r.name}”`);
                    }}
                  >
                    Delete
                  </Button>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Card title="Add an alert">
        <Grid min={220}>
          <Field label="Name">
            <Input value={draftName} onChange={setDraftName} placeholder="p95 latency above 2s" />
          </Field>
          <Field label="Metric">
            <Select
              value={draftMetric}
              onChange={v => setDraftMetric(v as AlertRule['metric'])}
              options={METRICS}
            />
          </Field>
          <Field label="Condition">
            <Select
              value={draftOp}
              onChange={v => setDraftOp(v as 'gt' | 'lt')}
              options={[
                { label: 'above', value: 'gt' },
                { label: 'below', value: 'lt' }
              ]}
            />
          </Field>
          <Field label="Threshold">
            <Input value={draftThreshold} onChange={setDraftThreshold} placeholder="2000" />
          </Field>
          <Field label="Severity">
            <Select
              value={draftSeverity}
              onChange={v => setDraftSeverity(v as AlertRule['severity'])}
              options={[
                { label: 'Info', value: 'info' },
                { label: 'Warning', value: 'warning' },
                { label: 'Critical', value: 'critical' }
              ]}
            />
          </Field>
        </Grid>
        <Button
          style={{ marginTop: 12 }}
          tone="primary"
          disabled={!draftName.trim() || !Number(draftThreshold)}
          onClick={() => {
            const rule: AlertRule = {
              id: `al_${Date.now()}`,
              name: draftName.trim(),
              metric: draftMetric,
              op: draftOp,
              threshold: Number(draftThreshold),
              severity: draftSeverity,
              enabled: true
            };
            save([...rules, rule]);
            setDraftName('');
            notify(`Alert “${rule.name}” created`, 'good');
          }}
        >
          Create alert
        </Button>
      </Card>
    </Page>
  );
};

// ── Metrics ──────────────────────────────────────────────────────────────

const Metrics: React.FC<PageContext> = ({ notify }) => {
  const [metric, setMetric] = useState('flow_latency_ms');
  const [windowMs, setWindowMs] = useState(WINDOWS[1].ms);
  const [tick, setTick] = useState(0);
  const { points, agg } = useMemo(() => {
    const { start, end } = windowRange(windowMs);
    return {
      points: monitoringService.getMetrics(metric, start, end),
      agg: monitoringService.getAggregatedMetrics(metric, start, end)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, windowMs, tick]);

  return (
    <Page
      icon="📐"
      title="Metrics"
      hint="Everything the engine records. Aggregates are computed over the window; the scrape endpoint gives the same numbers to Prometheus."
      actions={
        <>
          <Button tone="ghost" onClick={() => setTick(t => t + 1)}>
            Refresh
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(monitoringService.getPrometheusMetrics());
              notify('Prometheus scrape copied', 'good');
            }}
          >
            Copy scrape output
          </Button>
        </>
      }
    >
      <Card>
        <Grid min={220}>
          <Field label="Metric">
            <Select value={metric} onChange={setMetric} options={METRICS} />
          </Field>
          <Field label="Window">
            <Select
              value={String(windowMs)}
              onChange={v => setWindowMs(Number(v))}
              options={WINDOWS.map(w => ({ label: w.label, value: String(w.ms) }))}
            />
          </Field>
        </Grid>
      </Card>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Samples" value={agg ? agg.count : 0} />
        <Stat label="p50" value={agg ? `${Math.round(agg.p50)}` : '—'} />
        <Stat label="p95" value={agg ? `${Math.round(agg.p95)}` : '—'} tone={agg && agg.p95 > 2000 ? 'warn' : 'default'} />
        <Stat label="p99" value={agg ? `${Math.round(agg.p99)}` : '—'} />
        <Stat label="avg" value={agg ? agg.avg.toFixed(3) : '—'} />
        <Stat label="max" value={agg ? agg.max.toFixed(3) : '—'} />
      </div>

      <Card title={`Recent samples (${points.length})`}>
        {points.length === 0 ? (
          <Empty>
            Nothing recorded for this metric in this window. Run the flow in the Test Console — the
            engine writes latency, cost and success on every turn.
          </Empty>
        ) : (
          <Bars
            data={points.slice(-25).reverse().map(p => ({
              label: new Date(p.timestamp).toLocaleTimeString(),
              value: p.value,
              display: p.value.toFixed(3)
            }))}
          />
        )}
      </Card>

      <Card title="Prometheus scrape" hint="Same data, ready for a collector.">
        <Code value={monitoringService.getPrometheusMetrics().split('\n').slice(0, 40)} />
      </Card>
    </Page>
  );
};

// ── Audit trail ──────────────────────────────────────────────────────────

const AREA_LABEL: Record<AuditEntry['area'], string> = {
  designer: 'CX Designer',
  guardrails: 'Guardrails',
  gateway: 'Voice Gateway',
  observability: 'Observability',
  insights: 'Insights',
  admin: 'Admin',
  superadmin: 'Super Admin'
};

const Audit: React.FC<PageContext> = () => {
  const ws = useWorkspace();
  const [area, setArea] = useState<string>('all');
  const entries = area === 'all' ? ws.audit : ws.audit.filter(e => e.area === area);

  return (
    <Page
      icon="🧾"
      title="Audit Trail"
      hint="Every configuration change writes an entry. Engine-level events (node start/complete/error) are recorded per turn and surfaced in the Test Console trace."
    >
      <Card>
        <Field label="Filter by area">
          <Select
            value={area}
            onChange={setArea}
            options={[
              { label: 'All areas', value: 'all' },
              ...Object.entries(AREA_LABEL).map(([value, label]) => ({ label, value }))
            ]}
          />
        </Field>
      </Card>

      <Card title={`Entries (${entries.length})`}>
        {entries.length === 0 ? (
          <Empty>
            Nothing recorded yet. Change a guardrail rule, add a gateway endpoint or deploy a flow —
            each one lands here.
          </Empty>
        ) : (
          <Table columns={['When', 'Area', 'Action', 'Detail', 'Actor']}>
            {entries.map(e => (
              <tr key={e.id}>
                <Td style={{ fontSize: 12, color: theme.muted, whiteSpace: 'nowrap' }}>
                  {new Date(e.at).toLocaleString()}
                </Td>
                <Td>
                  <Pill>{AREA_LABEL[e.area]}</Pill>
                </Td>
                <Td style={{ fontSize: 13 }}>{e.action}</Td>
                <Td style={{ fontSize: 12, color: theme.muted, fontFamily: 'monospace' }}>{e.detail}</Td>
                <Td style={{ fontSize: 12 }}>{e.actor}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
};

export const observabilityPages: Record<string, React.FC<PageContext>> = {
  'observability.health': Health,
  'observability.alerts': Alerts,
  'observability.metrics': Metrics,
  'observability.audit': Audit
};