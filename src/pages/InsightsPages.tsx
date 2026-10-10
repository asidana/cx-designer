/**
 * Insights — what is the agent doing, and what does it cost?
 *
 * Performance   per-node latency and cost, from real executions
 * Eval Suites   saved test cases and whether actual matched expected
 * Channels      what each channel supports, and how nodes degrade
 * Scenarios     personas and call scenarios used by simulations
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bars,
  Button,
  Card,
  Empty,
  Grid,
  Page,
  Pill,
  Select,
  Stat,
  Table,
  Td,
  theme
} from '../components/ui';
import { monitoringService } from '../monitoring/Monitoring';
import { deleteTestCase, listTestCases, SavedTestCase } from '../evals/TestCaseStore';
import { CHANNEL_CAPABILITIES, ChannelId } from '../channels/types';
import { fallbackFor } from '../channels/router';
import { nodeRegistry } from '../nodes';
import { idbGetAll } from '../mock/db';
import { seedMocks } from '../mock/seed';
import type { PageContext } from './context';

// ── Performance ──────────────────────────────────────────────────────────

const Performance: React.FC<PageContext> = ({ nodeCount, navigate }) => {
  const [metric, setMetric] = useState<'latency' | 'cost' | 'errors'>('latency');
  const [tick, setTick] = useState(0);

  const rows = useMemo(() => {
    const start = Date.now() - 60 * 60 * 1000;
    const end = Date.now();
    const latency = monitoringService.getMetrics('node_latency_ms', start, end);
    const success = monitoringService.getMetrics('node_success', start, end);
    const byNode = new Map<string, { latency: number[]; failures: number }>();
    for (const p of latency) {
      const id = (p.labels.nodeId as string) || 'unknown';
      const entry = byNode.get(id) || { latency: [], failures: 0 };
      entry.latency.push(p.value);
      byNode.set(id, entry);
    }
    for (const p of success) {
      const id = (p.labels.nodeId as string) || 'unknown';
      if (p.value < 1) {
        const entry = byNode.get(id) || { latency: [], failures: 0 };
        entry.failures += 1;
        byNode.set(id, entry);
      }
    }
    return Array.from(byNode.entries())
      .map(([nodeId, v]) => ({
        nodeId,
        label: nodeRegistry.get(nodeId as never)?.label || nodeId,
        avgLatency: v.latency.length ? v.latency.reduce((a, b) => a + b, 0) / v.latency.length : 0,
        runs: v.latency.length,
        failures: v.failures,
        errorRate: v.latency.length ? v.failures / v.latency.length : 0
      }))
      .sort((a, b) => b.avgLatency - a.avgLatency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const totalRuns = rows.reduce((n, r) => n + r.runs, 0);
  const slowest = rows[0];
  const avg = totalRuns ? rows.reduce((n, r) => n + r.avgLatency * r.runs, 0) / totalRuns : 0;

  return (
    <Page
      icon="⚡"
      title="Performance"
      hint="Per-node latency from the last hour of real executions. Turn latency is the sum of the path the caller actually took, so a looped flow shows up as repeated node rows."
      actions={
        <>
          <Button tone="ghost" onClick={() => setTick(t => t + 1)}>
            Refresh
          </Button>
          <Button onClick={() => navigate('designer.testconsole')}>Generate traffic</Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Nodes exercised" value={`${rows.length} / ${nodeCount}`} />
        <Stat label="Executions" value={totalRuns} />
        <Stat label="Avg node latency" value={`${Math.round(avg)} ms`} />
        <Stat
          label="Slowest node"
          value={slowest ? `${Math.round(slowest.avgLatency)} ms` : '—'}
          sub={slowest ? slowest.label : undefined}
          tone={slowest && slowest.avgLatency > 1000 ? 'warn' : 'default'}
        />
      </div>

      <Card
        title="Per-node breakdown"
        actions={
          <Select
            value={metric}
            onChange={v => setMetric(v as typeof metric)}
            options={[
              { label: 'Avg latency', value: 'latency' },
              { label: 'Error rate', value: 'errors' }
            ]}
          />
        }
      >
        {rows.length === 0 ? (
          <Empty>
            No executions recorded in the last hour. Run the flow in the Test Console, then come back —
            the engine records latency, success and guardrail hits per node.
          </Empty>
        ) : (
          <Bars
            tone={metric === 'latency' ? theme.accent : theme.danger}
            data={rows.map(r => ({
              label: `${r.label} (${r.nodeId})`,
              value: metric === 'latency' ? r.avgLatency : r.errorRate * 100,
              display: metric === 'latency' ? `${Math.round(r.avgLatency)} ms` : `${(r.errorRate * 100).toFixed(0)}%`
            }))}
          />
        )}
      </Card>

      {rows.length > 0 && (
        <Card title="Runs per node">
          <Table columns={['Node', 'Runs', 'Avg latency', 'Failures', 'Error rate']}>
            {rows.map(r => (
              <tr key={r.nodeId}>
                <Td>{r.label}</Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.runs}</Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{Math.round(r.avgLatency)} ms</Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.failures}</Td>
                <Td>
                  <Pill tone={r.errorRate > 0.1 ? 'bad' : r.errorRate > 0 ? 'warn' : 'good'}>
                    {(r.errorRate * 100).toFixed(0)}%
                  </Pill>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </Page>
  );
};

// ── Eval suites ──────────────────────────────────────────────────────────

/** Loose match — evals assert intent, not byte equality, until a judge is wired in. */
function expectationMet(c: SavedTestCase): boolean {
  if (!c.expectedOutput.trim()) return false;
  const actual = c.actualOutput.toLowerCase().trim();
  const expected = c.expectedOutput.toLowerCase().trim();
  return actual === expected || actual.includes(expected) || expected.includes(actual);
}

const Evals: React.FC<PageContext> = ({ flowName, navigate }) => {
  const [cases, setCases] = useState<SavedTestCase[]>(() => listTestCases());
  const refresh = () => setCases(listTestCases());
  const met = cases.filter(expectationMet);

  return (
    <Page
      icon="🧪"
      title="Eval Suites"
      hint={`Golden cases for “${flowName}”. Every run you save in the Test Console becomes a case: the input, the injected state and what the agent actually said. Add an expectation to make it a regression test.`}
      actions={
        <>
          <Button tone="ghost" onClick={refresh}>
            Refresh
          </Button>
          <Button tone="primary" onClick={() => navigate('designer.testconsole')}>
            Capture a run
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Cases" value={cases.length} />
        <Stat
          label="With expectation"
          value={met.length}
          sub={`${cases.length - met.length} need one`}
          tone={cases.length - met.length > 0 ? 'warn' : 'default'}
        />
        <Stat
          label="Pass rate"
          value={cases.length ? `${((met.length / cases.length) * 100).toFixed(0)}%` : '—'}
          tone={cases.length && met.length / cases.length < 1 ? 'warn' : 'good'}
        />
      </div>

      <Card title="Cases">
        {cases.length === 0 ? (
          <Empty>
            No cases yet. In the Test Console, run a turn and press <strong>Save as test case</strong> —
            it captures the input, the injected state and the output.
          </Empty>
        ) : (
          <Table columns={['Case', 'Input', 'Actual', 'Expected', 'State', 'Cost', '']}>
            {cases.map(c => (
              <tr key={c.id}>
                <Td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: theme.muted }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </Td>
                <Td style={{ fontSize: 12, maxWidth: 180 }}>{c.input}</Td>
                <Td style={{ fontSize: 12, maxWidth: 200, color: theme.muted }}>{c.actualOutput}</Td>
                <Td style={{ fontSize: 12, maxWidth: 160 }}>
                  {c.expectedOutput ? (
                    <span style={{ color: '#cbd5e1' }}>{c.expectedOutput}</span>
                  ) : (
                    <span style={{ color: '#5f5f78' }}>not set</span>
                  )}
                </Td>
                <Td style={{ fontSize: 11, fontFamily: 'monospace', color: theme.muted }}>
                  {Object.keys(c.injectedState).length === 0 ? '—' : JSON.stringify(c.injectedState)}
                </Td>
                <Td style={{ fontSize: 12, fontFamily: 'monospace' }}>${(c.cost || 0).toFixed(4)}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Pill tone={expectationMet(c) ? 'good' : c.expectedOutput ? 'bad' : 'muted'}>
                      {expectationMet(c) ? 'pass' : c.expectedOutput ? 'fail' : 'no expectation'}
                    </Pill>
                    <Button
                      size="sm"
                      tone="danger"
                      onClick={() => {
                        deleteTestCase(c.id);
                        refresh();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
};

// ── Channels ─────────────────────────────────────────────────────────────

const CAP_LABELS: Array<{ key: keyof (typeof CHANNEL_CAPABILITIES)[ChannelId]; label: string }> = [
  { key: 'streamingAudio', label: 'Streaming audio' },
  { key: 'dtmf', label: 'DTMF' },
  { key: 'uiDirectives', label: 'UI directives' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'richCards', label: 'Rich cards' },
  { key: 'typingIndicators', label: 'Typing indicator' }
];

const Channels: React.FC<PageContext> = ({ notify }) => {
  const channelIds = Object.keys(CHANNEL_CAPABILITIES) as ChannelId[];
  // Voice-only and channel-only nodes are the ones that degrade.
  const degradeChecks: Array<{ nodeType: string; label: string }> = [
    { nodeType: 'voice.input', label: 'Voice Input' },
    { nodeType: 'voice.output', label: 'Voice Output' },
    { nodeType: 'integration.streamlink', label: 'Voice Gateway' },
    { nodeType: 'chat.output', label: 'Chat Output' }
  ];

  return (
    <Page
      icon="📡"
      title="Channels"
      hint="One envelope, six channels. The flow describes behaviour; the channel decides transport and what a node degrades to when it cannot be honoured."
    >
      <Card title="Capabilities by channel">
        <div style={{ overflowX: 'auto' }}>
          <Table columns={['Channel', ...CAP_LABELS.map(c => c.label), 'Fallback example']}>
            {channelIds.map(id => {
              const caps = CHANNEL_CAPABILITIES[id];
              return (
                <tr key={id}>
                  <Td>
                    <strong>{id}</strong>
                  </Td>
                  {CAP_LABELS.map(c => (
                    <Td key={String(c.key)}>
                      <Pill tone={caps[c.key] ? 'good' : 'muted'}>{caps[c.key] ? 'yes' : 'no'}</Pill>
                    </Td>
                  ))}
                  <Td style={{ fontSize: 12, color: theme.muted, maxWidth: 260 }}>
                    {fallbackFor(id, 'voice.output') || '—'}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      </Card>

      <Card title="What degrades where" hint="Preflight applies these same rules before you run.">
        <Table columns={['Node', 'Voice', 'Chat', 'Webchat', 'Copilot']}>
          {degradeChecks.map(node => (
            <tr key={node.nodeType}>
              <Td>{node.label}</Td>
              {(['voice', 'chat', 'webchat', 'copilot'] as ChannelId[]).map(ch => {
                const fb = fallbackFor(ch, node.nodeType);
                return (
                  <Td key={ch} style={{ fontSize: 11, color: fb ? theme.text : theme.muted }}>
                    {fb || 'native'}
                  </Td>
                );
              })}
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Render protocols" hint="AG-UI and A2UI ride the same envelope as ui parts.">
        <Grid min={260}>
          <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.6 }}>
            <strong>AG-UI (CopilotKit)</strong>
            <div style={{ color: theme.muted, fontSize: 12 }}>
              Event stream — text messages, tool calls, state snapshots — so a CopilotKit host can
              render a flow run as shared state.
            </div>
            <Button
              style={{ marginTop: 10 }}
              size="sm"
              onClick={() => notify('AG-UI lands with task T3', 'info')}
            >
              Track T3
            </Button>
          </div>
          <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.6 }}>
            <strong>A2UI (Google)</strong>
            <div style={{ color: theme.muted, fontSize: 12 }}>
              Directives — cards, forms, maps — for agents that drive the host UI instead of
              describing it in prose.
            </div>
            <Button
              style={{ marginTop: 10 }}
              size="sm"
              onClick={() => notify('A2UI lands with task T4', 'info')}
            >
              Track T4
            </Button>
          </div>
        </Grid>
      </Card>
    </Page>
  );
};

// ── Scenarios ────────────────────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  traits: string;
  frustration: number;
  patienceSeconds: number;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  expectedOutcome: string;
  tags: string[];
}

const Scenarios: React.FC<PageContext> = ({ navigate }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    await seedMocks();
    const [p, s] = await Promise.all([
      idbGetAll<Persona>('personas'),
      idbGetAll<Scenario>('scenarios')
    ]);
    setPersonas(p);
    setScenarios(s);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Page
      icon="🎬"
      title="Scenarios"
      hint="Personas and call scenarios used by simulations — mock data in IndexedDB, so you can rehearse an agent without a carrier, a model key or a real caller."
      actions={
        <>
          <Button tone="ghost" onClick={load}>
            Reload
          </Button>
          <Button tone="primary" onClick={() => navigate('designer.testconsole')}>
            Run a simulation
          </Button>
        </>
      }
    >
      {loading ? (
        <Empty>Loading mocks…</Empty>
      ) : (
        <Grid min={320}>
          <Card title={`Personas (${personas.length})`}>
            <Table columns={['Persona', 'Frustration', 'Patience', 'Traits']}>
              {personas.map(p => (
                <tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td>
                    <Pill tone={p.frustration > 0.6 ? 'bad' : p.frustration > 0.3 ? 'warn' : 'good'}>
                      {Math.round(p.frustration * 100)}%
                    </Pill>
                  </Td>
                  <Td style={{ fontSize: 12 }}>{p.patienceSeconds}s</Td>
                  <Td style={{ fontSize: 11, color: theme.muted }}>{p.traits}</Td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title={`Scenarios (${scenarios.length})`}>
            <Table columns={['Scenario', 'Expects', 'Tags']}>
              {scenarios.map(s => (
                <tr key={s.id}>
                  <Td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: theme.muted }}>{s.description}</div>
                  </Td>
                  <Td style={{ fontSize: 12 }}>{s.expectedOutcome}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(s.tags || []).map(t => (
                        <Pill key={t}>{t}</Pill>
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </Grid>
      )}
    </Page>
  );
};

export const insightsPages: Record<string, React.FC<PageContext>> = {
  'insights.performance': Performance,
  'insights.evals': Evals,
  'insights.channels': Channels,
  'insights.scenarios': Scenarios
};