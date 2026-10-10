/**
 * Help — the guided path, the shortcuts, the node catalog, the vocabulary.
 */

import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Field,
  Grid,
  Input,
  Page,
  Pill,
  Select,
  Table,
  Td,
  theme
} from '../components/ui';
import { nodeRegistry } from '../nodes';
import { SECTIONS } from '../navigation/navModel';
import { scoreMatch } from '../navigation/search';
import type { PageContext } from './context';

// ── Getting started ──────────────────────────────────────────────────────

const STEPS = [
  {
    icon: '📚',
    title: 'Start from a template',
    body: 'Pick a market-standard agent — knowledge base, website assistant, billing voice bot — then reshape it. Templates are ordinary flows; nothing is locked.',
    page: 'designer.templates',
    cta: 'Open templates'
  },
  {
    icon: '🗺️',
    title: 'Shape the flow',
    body: 'Drag nodes from the palette or click to place them, then connect them. Builder Chat does the same thing from a sentence: "add an intent classifier, connect it to reasoning".',
    page: 'designer.canvas',
    cta: 'Open canvas'
  },
  {
    icon: '⚙️',
    title: 'Configure every node',
    body: 'Click a node to set its model, prompts, thresholds and fallbacks. Policy rules in Guardrails can override configuration per caller — model choice, cost ceiling, provider routing.',
    page: 'designer.canvas',
    cta: 'Open canvas'
  },
  {
    icon: '🛡️',
    title: 'Decide what the firewall owns',
    body: 'PII and PHI redaction, tool allowlists, escalation triggers and after-hours routing. Everything the agent touches passes through these rules.',
    page: 'guardrails.rules',
    cta: 'Open Guardrails'
  },
  {
    icon: '✈️',
    title: 'Lint before you run',
    body: 'Preflight catches unwired nodes, missing outputs and configs that would silently fall back to defaults.',
    page: 'designer.preflight',
    cta: 'Run preflight'
  },
  {
    icon: '🧪',
    title: 'Test it as a caller',
    body: 'Chat or speak to the agent, watch the trace light up node by node, inject state to skip preambles, and save any turn as an eval case.',
    page: 'designer.testconsole',
    cta: 'Open test console'
  },
  {
    icon: '📞',
    title: 'Give it a phone number',
    body: 'Add a SIP, WebSocket or gRPC endpoint and a CCaaS target. The gateway owns media; the contact centre owns the queue.',
    page: 'gateway.endpoints',
    cta: 'Open Voice Gateway'
  },
  {
    icon: '🚀',
    title: 'Ship and watch',
    body: 'Deploy to an environment — it snapshots into version history — then watch latency, cost and guardrail hits in Observability.',
    page: 'admin.deployments',
    cta: 'Open Admin'
  }
];

const GettingStarted: React.FC<PageContext> = ({ flowName, nodeCount, navigate }) => (
  <Page
    icon="🚀"
    title="Getting Started"
    hint={`Template → configure → protect → lint → test → ship. Eight steps, each one a page you can jump to. You are on “${flowName}” with ${nodeCount} node${nodeCount === 1 ? '' : 's'} placed.`}
  >
    <Grid min={280}>
      {STEPS.map((step, i) => (
        <Card key={step.title}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: theme.accent,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                {step.icon} {step.title}
              </div>
              <p style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6, margin: '6px 0 10px' }}>
                {step.body}
              </p>
              <Button size="sm" onClick={() => navigate(step.page)}>
                {step.cta} →
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </Grid>
  </Page>
);

// ── Shortcuts ────────────────────────────────────────────────────────────

const EDITING_SHORTCUTS: Array<[string, string]> = [
  ['Ctrl + Z', 'Undo'],
  ['Ctrl + Shift + Z', 'Redo'],
  ['Ctrl + S', 'Save flow'],
  ['Ctrl + D', 'Duplicate node'],
  ['Delete', 'Delete selected node'],
  ['Ctrl + A', 'Select all nodes'],
  ['Ctrl + +', 'Zoom in'],
  ['Ctrl + -', 'Zoom out'],
  ['Ctrl + 0', 'Fit view']
];

const Shortcuts: React.FC<PageContext> = () => {
  const pageShortcuts = SECTIONS.flatMap(s =>
    s.pages.filter(p => p.shortcut).map(p => [p.shortcut!, `${p.label} — ${s.label}`] as [string, string])
  );

  return (
    <Page
      icon="⌨️"
      title="Shortcuts"
      hint="Single-key shortcuts switch pages, so they are ignored while you are typing in a field. Ctrl+K is the catch-all."
    >
      <Grid min={320}>
        <Card title="Navigation">
          <Table columns={['Keys', 'Goes to']}>
            {[['Ctrl + K', 'Command palette'], ...pageShortcuts].map(([keys, label]) => (
              <tr key={keys}>
                <Td>
                  <kbd
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      background: theme.panel2,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 4,
                      padding: '2px 6px'
                    }}
                  >
                    {keys}
                  </kbd>
                </Td>
                <Td style={{ fontSize: 13 }}>{label}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Canvas editing">
          <Table columns={['Keys', 'Does']}>
            {EDITING_SHORTCUTS.map(([keys, label]) => (
              <tr key={keys}>
                <Td>
                  <kbd
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      background: theme.panel2,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 4,
                      padding: '2px 6px'
                    }}
                  >
                    {keys}
                  </kbd>
                </Td>
                <Td style={{ fontSize: 13 }}>{label}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </Grid>
    </Page>
  );
};

// ── Node catalog ─────────────────────────────────────────────────────────

const NodeCatalog: React.FC<PageContext> = ({ navigate }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const all = nodeRegistry.getAll();
  const categories = Array.from(new Set(all.map(n => n.category)));

  const rows = useMemo(() => {
    const q = query.trim();
    return all.filter(n => (category === 'all' || n.category === category) && (!q || scoreMatch(q, n.label) >= 0 || scoreMatch(q, n.description) >= 0));
  }, [all, query, category]);

  return (
    <Page
      icon="📖"
      title="Node Catalog"
      hint="Every node type, what it does, and what it expects in and out. Search by name or by what you are trying to do."
      actions={<Button tone="ghost" onClick={() => navigate('designer.canvas')}>Open palette</Button>}
    >
      <Card>
        <Grid min={240}>
          <Field label="Search">
            <Input value={query} onChange={setQuery} placeholder="transcribe speech, redact, escalate…" />
          </Field>
          <Field label="Category">
            <Select
              value={category}
              onChange={setCategory}
              options={[{ label: 'All categories', value: 'all' }, ...categories.map(c => ({ label: c, value: c }))]}
            />
          </Field>
        </Grid>
      </Card>

      <Card title={`${rows.length} node${rows.length === 1 ? '' : 's'}`}>
        {rows.length === 0 ? (
          <Empty>No node matches “{query}”. Try the capability you want — “speak”, “classify”, “block”.</Empty>
        ) : (
          <Table columns={['Node', 'Category', 'In', 'Out', 'What it does']}>
            {rows.map(n => (
              <tr key={n.type}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: n.color
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {n.icon} {n.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#5f5f78', fontFamily: 'monospace', marginTop: 2 }}>
                    {n.type}
                  </div>
                </Td>
                <Td>
                  <Pill>{n.category}</Pill>
                </Td>
                <Td style={{ fontSize: 11, color: theme.muted }}>
                  {n.inputs.map(i => i.label).join(', ') || '—'}
                </Td>
                <Td style={{ fontSize: 11, color: theme.muted }}>
                  {n.outputs.map(o => o.label).join(', ') || '—'}
                </Td>
                <Td style={{ fontSize: 12, color: theme.muted, maxWidth: 420 }}>{n.description}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
};

// ── Glossary ─────────────────────────────────────────────────────────────

const TERMS: Array<[string, string]> = [
  ['Agent', 'A model with instructions, tools and memory that carries a conversation. The agent owns business logic; the firewall owns protection; the gateway owns transport.'],
  ['Agent Firewall', 'The layer between an agent and the outside world: PII/PHI redaction, policy rules, tool allowlists, escalation triggers. Nothing reaches a provider without passing it.'],
  ['Voice Gateway', 'SIP / WebSocket / gRPC front door for telephony. Terminates media, tracks call state, hands audio to the agent as message-envelope parts.'],
  ['CCaaS', 'Contact Centre as a Service — Genesys, Amazon Connect, Five9, Avaya. The gateway owns media; the CCaaS owns queues, skills and wrap-up.'],
  ['Handoff', 'Moving a live conversation to a human. Cold transfer clears the agent state first; warm transfer carries a summary and the transcript.'],
  ['AG-UI', 'Agent-to-UI event stream (CopilotKit): text messages, tool calls and state snapshots, so an external host renders a run as shared state.'],
  ['A2UI', 'Agent-driven UI directives (Google): cards, forms, maps — the agent composes the surface instead of describing it.'],
  ['Envelope', 'The single message shape every channel uses: parts of type text, audio, ui, tool or handoff. One shape, six transports.'],
  ['Speech-to-speech', 'A realtime provider that takes audio in and returns audio out, handling turn-taking and barge-in itself. Grok Voice, GPT Live, Gemini Live, NVIDIA, Kyutai.'],
  ['Cascaded pipeline', 'STT → agent → TTS, where each stage is a separate provider. More control, more latency, more places to fall back.'],
  ['Preflight', 'Config-level lint run before a run or a release: unwired nodes, missing outputs, defaults that would surprise you in production.'],
  ['Eval case', 'A saved turn — input, injected state, actual output, expected output — so the test loop doubles as a regression suite.'],
  ['Node', 'One step in a flow: a typed unit with inputs, outputs and a schema-driven config. Market tools call these blocks or steps; we call them nodes.'],
  ['Flow', 'The whole graph: nodes plus edges plus identity. One flow serves every channel the nodes support.']
];

const Glossary: React.FC<PageContext> = () => (
  <Page
    icon="📕"
    title="Glossary"
    hint="The vocabulary we use, and why it is the vocabulary the market uses — so exported flows and imported integrations mean the same thing."
  >
    <Card>
      <Table columns={['Term', 'What it means here']}>
        {TERMS.map(([term, def]) => (
          <tr key={term}>
            <Td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{term}</Td>
            <Td style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>{def}</Td>
          </tr>
        ))}
      </Table>
    </Card>
  </Page>
);

export const helpPages: Record<string, React.FC<PageContext>> = {
  'help.start': GettingStarted,
  'help.shortcuts': Shortcuts,
  'help.nodes': NodeCatalog,
  'help.glossary': Glossary
};