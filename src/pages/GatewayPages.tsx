/**
 * Voice Gateway (StreamLink) — telephony pages.
 *
 * Endpoints        media endpoints the gateway listens on
 * CCaaS Targets    contact-centre systems we connect out to
 * Live Sessions    calls in flight, with state and agent binding
 * Transports       what each transport needs before it can carry audio
 */

import React, { useEffect, useState } from 'react';
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
  Toggle,
  theme
} from '../components/ui';
import type { AudioCodec, CallState, CcaasTarget, StreamTransport } from '../streamlink/types';
import {
  SessionRecord,
  VoiceEndpointRecord,
  endCall,
  liveSessions,
  placeCall,
  removeEndpoint,
  upsertEndpoint,
  useWorkspace
} from '../workspace/store';
import type { PageContext } from './context';

const TRANSPORTS: Array<{ label: string; value: StreamTransport }> = [
  { label: 'SIP (signalling + RTP)', value: 'sip' },
  { label: 'WebSocket (media)', value: 'websocket' },
  { label: 'gRPC (bidirectional stream)', value: 'grpc' }
];

const CCAAS: Array<{ label: string; value: CcaasTarget }> = [
  { label: 'Genesys Cloud', value: 'genesys' },
  { label: 'Five9', value: 'five9' },
  { label: 'Avaya', value: 'avaya' },
  { label: 'Amazon Connect', value: 'amazon-connect' },
  { label: 'Custom / BYO SBC', value: 'custom' }
];

const CODECS: AudioCodec[] = ['pcmu', 'pcma', 'opus', 'g722'];
const DTMF_MODES: Array<{ label: string; value: VoiceEndpointRecord['dtmfMode'] }> = [
  { label: 'RFC2833 (in-band)', value: 'rfc2833' },
  { label: 'SIP INFO', value: 'sip-info' },
  { label: 'Pure in-band', value: 'inband' }
];

const STATE_TONE: Record<CallState, 'good' | 'warn' | 'muted' | 'info'> = {
  ringing: 'info',
  active: 'good',
  held: 'warn',
  transferring: 'warn',
  ended: 'muted'
};

const CCAAS_LABEL: Record<CcaasTarget, string> = {
  genesys: 'Genesys Cloud',
  five9: 'Five9',
  avaya: 'Avaya',
  'amazon-connect': 'Amazon Connect',
  custom: 'Custom / BYO SBC'
};

function emptyEndpoint(): VoiceEndpointRecord {
  return {
    id: `ep_${Date.now()}`,
    name: '',
    transport: 'sip',
    address: '',
    ccaas: 'custom',
    did: '',
    codecs: ['pcmu', 'opus'],
    dtmfMode: 'rfc2833',
    enabled: true
  };
}

// ── Endpoints ────────────────────────────────────────────────────────────

const Endpoints: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const [draft, setDraft] = useState<VoiceEndpointRecord | null>(null);
  const patch = (p: Partial<VoiceEndpointRecord>) => setDraft(d => (d ? { ...d, ...p } : d));

  return (
    <Page
      icon="🎚️"
      title="Endpoints"
      hint="Each endpoint is one media path into the gateway. The gateway terminates telephony and hands audio to the agent as a single message envelope — the flow never learns whether the caller is SIP, WebSocket or gRPC."
      actions={
        <Button tone="primary" onClick={() => setDraft(emptyEndpoint())}>
          New endpoint
        </Button>
      }
    >
      <Card title={`Configured endpoints (${ws.endpoints.length})`}>
        <Table
          columns={['Name', 'Transport', 'Address', 'CCaaS', 'DID', 'Codecs', 'DTMF', '']}
          empty="No endpoints yet — the gateway has nowhere to receive calls."
        >
          {ws.endpoints.map(e => (
            <tr key={e.id}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Toggle
                    checked={e.enabled}
                    onChange={v => {
                      upsertEndpoint({ ...e, enabled: v });
                      notify(`${e.name} ${v ? 'enabled' : 'disabled'}`);
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>{e.name}</span>
                </div>
              </Td>
              <Td>
                <Pill>{e.transport}</Pill>
              </Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.address}</Td>
              <Td style={{ fontSize: 12 }}>{CCAAS_LABEL[e.ccaas]}</Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.did || '—'}</Td>
              <Td>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {e.codecs.map(c => (
                    <Pill key={c}>{c}</Pill>
                  ))}
                </div>
              </Td>
              <Td style={{ fontSize: 12, color: theme.muted }}>{e.dtmfMode}</Td>
              <Td>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Button size="sm" tone="ghost" onClick={() => setDraft({ ...e })}>
                    Edit
                  </Button>
                  <Button size="sm" tone="danger" onClick={() => removeEndpoint(e.id)}>
                    Delete
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      {draft && (
        <Card title={ws.endpoints.some(e => e.id === draft.id) ? 'Edit endpoint' : 'New endpoint'}>
          <Grid>
            <Field label="Name">
              <Input value={draft.name} onChange={v => patch({ name: v })} placeholder="Primary SIP trunk" />
            </Field>
            <Field label="Transport">
              <Select
                value={draft.transport}
                onChange={v => patch({ transport: v as StreamTransport })}
                options={TRANSPORTS}
              />
            </Field>
            <Field
              label="Address"
              hint={
                draft.transport === 'sip'
                  ? 'sip:host:5060'
                  : draft.transport === 'websocket'
                    ? 'wss://host/media'
                    : 'host:port'
              }
            >
              <Input value={draft.address} onChange={v => patch({ address: v })} />
            </Field>
            <Field label="CCaaS">
              <Select
                value={draft.ccaas}
                onChange={v => patch({ ccaas: v as CcaasTarget })}
                options={CCAAS}
              />
            </Field>
            <Field label="DID / caller id">
              <Input value={draft.did} onChange={v => patch({ did: v })} placeholder="+14155550100" />
            </Field>
            <Field label="DTMF mode" hint="RFC2833 is required for PCI-safe card capture.">
              <Select
                value={draft.dtmfMode}
                onChange={v => patch({ dtmfMode: v as VoiceEndpointRecord['dtmfMode'] })}
                options={DTMF_MODES}
              />
            </Field>
          </Grid>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Codecs (negotiated in order)</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {CODECS.map(c => (
                <label key={c} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={draft.codecs.includes(c)}
                    onChange={e =>
                      patch({
                        codecs: e.target.checked
                          ? [...draft.codecs, c]
                          : draft.codecs.filter(x => x !== c)
                      })
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button
              tone="primary"
              disabled={!draft.name.trim() || !draft.address.trim()}
              onClick={() => {
                upsertEndpoint(draft);
                setDraft(null);
              }}
            >
              Save endpoint
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

// ── CCaaS targets ────────────────────────────────────────────────────────

const CcaasTargets: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();

  const dialTest = (vendor: CcaasTarget) => {
    const endpoint = ws.endpoints.find(e => e.ccaas === vendor && e.enabled) || ws.endpoints[0];
    if (!endpoint) {
      notify('Add an endpoint first', 'bad');
      return;
    }
    const session: SessionRecord = {
      id: `call_${Date.now()}`,
      endpointId: endpoint.id,
      direction: 'outbound',
      state: 'ringing',
      from: '+14155550100',
      to: '+14155550999',
      agentId: ws.agents.find(a => a.enabled)?.id || null,
      startedAt: Date.now()
    };
    placeCall(session);
    // Ring then connect, the way a real switch would.
    setTimeout(() => placeCall({ ...session, state: 'active' }), 1200);
    notify(`Dial test to ${CCAAS_LABEL[vendor]} via ${endpoint.name}`, 'good');
  };

  return (
    <Page
      icon="🏢"
      title="CCaaS Targets"
      hint="Where calls terminate once the agent is done: a queue, a skill group, or an agent. The gateway owns the media; the CCaaS owns the queue, the wrap-up code and the recording."
    >
      <Grid min={260}>
        {CCAAS.map(v => {
          const bound = ws.endpoints.filter(e => e.ccaas === v.value);
          const live = liveSessions(ws).filter(s => bound.some(e => e.id === s.endpointId));
          return (
            <Card
              key={v.value}
              title={v.label}
              hint={
                bound.length === 0
                  ? 'No endpoint bound yet'
                  : `${bound.length} endpoint${bound.length === 1 ? '' : 's'} · ${live.length} live call${live.length === 1 ? '' : 's'}`
              }
              actions={<Button size="sm" onClick={() => dialTest(v.value)}>Dial test</Button>}
            >
              {bound.length === 0 ? (
                <div style={{ fontSize: 12, color: '#5f5f78' }}>
                  Create an endpoint in <strong>Endpoints</strong> with this contact centre to connect it.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {bound.map(e => (
                    <div
                      key={e.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 12,
                        background: theme.panel2,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 6,
                        padding: '8px 10px'
                      }}
                    >
                      <span>{e.name}</span>
                      <span style={{ color: theme.muted, fontFamily: 'monospace', fontSize: 11 }}>{e.address}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </Grid>
    </Page>
  );
};

// ── Live sessions ────────────────────────────────────────────────────────

const Sessions: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const [from, setFrom] = useState('+14155550100');
  const [to, setTo] = useState('+14155550999');
  const [endpointId, setEndpointId] = useState(ws.endpoints[0]?.id || '');
  const [, tick] = useState(0);

  // Ticks once a second so durations stay honest.
  useEffect(() => {
    const id = window.setInterval(() => tick(v => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const endpoint = ws.endpoints.find(e => e.id === endpointId) || ws.endpoints[0];

  const place = () => {
    if (!endpoint) {
      notify('Add an endpoint first', 'bad');
      return;
    }
    const session: SessionRecord = {
      id: `call_${Date.now()}`,
      endpointId: endpoint.id,
      direction: 'inbound',
      state: 'ringing',
      from,
      to,
      agentId: null,
      startedAt: Date.now()
    };
    placeCall(session);
    notify('Call placed', 'good');
  };

  const connect = (s: SessionRecord) =>
    placeCall({ ...s, state: s.state === 'ringing' ? 'active' : 'held' });

  const live = liveSessions(ws);
  const ended = ws.sessions.filter(s => s.state === 'ended').slice(0, 10);
  const duration = (s: SessionRecord) => {
    const end = s.endedAt || Date.now();
    const secs = Math.max(0, Math.round((end - s.startedAt) / 1000));
    return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  };

  return (
    <Page
      icon="📞"
      title="Live Sessions"
      hint="Calls in flight through the gateway. In this build the transport is a loopback, so calls are simulated — the states, bindings and transfers are real, the media is not."
      actions={
        <Button tone="primary" onClick={place}>
          Place call
        </Button>
      }
    >
      <Card title="Place a call">
        <Grid min={200}>
          <Field label="From">
            <Input value={from} onChange={setFrom} />
          </Field>
          <Field label="To">
            <Input value={to} onChange={setTo} />
          </Field>
          <Field label="Endpoint">
            <Select
              value={endpoint?.id || ''}
              onChange={setEndpointId}
              options={ws.endpoints.map(e => ({ label: `${e.name} (${e.transport})`, value: e.id }))}
            />
          </Field>
        </Grid>
      </Card>

      <Card title={`In flight (${live.length})`}>
        <Table columns={['Call', 'State', 'From → To', 'Endpoint', 'Agent', 'Duration', '']} empty="No live calls.">
          {live.map(s => {
            const ep = ws.endpoints.find(e => e.id === s.endpointId);
            return (
              <tr key={s.id}>
                <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.id}</Td>
                <Td>
                  <Pill tone={STATE_TONE[s.state]}>{s.state}</Pill>
                </Td>
                <Td style={{ fontSize: 12 }}>
                  {s.from} → {s.to}
                </Td>
                <Td style={{ fontSize: 12, color: theme.muted }}>{ep?.name || s.endpointId}</Td>
                <Td>
                  <Select
                    value={s.agentId || ''}
                    onChange={v => placeCall({ ...s, agentId: v || null })}
                    options={[
                      { label: 'unassigned', value: '' },
                      ...ws.agents.map(a => ({ label: a.id, value: a.id }))
                    ]}
                  />
                </Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{duration(s)}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Button size="sm" tone="ghost" onClick={() => connect(s)}>
                      {s.state === 'held' ? 'Resume' : s.state === 'ringing' ? 'Answer' : 'Hold'}
                    </Button>
                    <Button size="sm" tone="danger" onClick={() => endCall(s.id)}>
                      Hang up
                    </Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Card title="Recently ended">
        {ended.length === 0 ? (
          <Empty>No completed calls yet.</Empty>
        ) : (
          <Table columns={['Call', 'From → To', 'Duration', 'Ended']}>
            {ended.map(s => (
              <tr key={s.id}>
                <Td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.id}</Td>
                <Td style={{ fontSize: 12 }}>
                  {s.from} → {s.to}
                </Td>
                <Td style={{ fontFamily: 'monospace', fontSize: 12 }}>{duration(s)}</Td>
                <Td style={{ fontSize: 12, color: theme.muted }}>
                  {s.endedAt ? new Date(s.endedAt).toLocaleTimeString() : '—'}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
};

// ── Transports ───────────────────────────────────────────────────────────

const TRANSPORT_FACTS: Array<{
  transport: StreamTransport;
  status: 'ready' | 'needs-stack';
  note: string;
  needs: string[];
}> = [
  {
    transport: 'websocket',
    status: 'ready',
    note: 'Browser and app media over WSS. Works out of the box — this is what the webchat embed and the Test Console use.',
    needs: ['ws/wss endpoint in Endpoints', 'Opus or PCMU frames']
  },
  {
    transport: 'grpc',
    status: 'ready',
    note: 'Bidirectional stream for internal services. Good for a backend that already speaks gRPC.',
    needs: ['gRPC endpoint in Endpoints', 'proto for the audio frame envelope']
  },
  {
    transport: 'sip',
    status: 'needs-stack',
    note: 'Signalling + RTP with a real SIP stack bound to the StreamCall contract. The contract and the transport interface exist; the media server does not ship with the designer.',
    needs: [
      'drachtio / Kamailio / FreeSWITCH bound to CallTransport',
      'SIP trunk credentials from the carrier or SBC',
      'RTP range open, RFC2833 negotiated for DTMF'
    ]
  }
];

const Transports: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  return (
    <Page
      icon="🔌"
      title="Transports"
      hint="How media reaches the gateway. One contract, three transports — the flow and the firewall never branch on transport."
    >
      <Grid min={300}>
        {TRANSPORT_FACTS.map(t => (
          <Card
            key={t.transport}
            title={t.transport.toUpperCase()}
            actions={
              <Pill tone={t.status === 'ready' ? 'good' : 'warn'}>
                {t.status === 'ready' ? 'ready' : 'needs a stack'}
              </Pill>
            }
          >
            <p style={{ fontSize: 13, color: theme.text, marginTop: 0, lineHeight: 1.5 }}>{t.note}</p>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Requires</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: theme.text, lineHeight: 1.7 }}>
              {t.needs.map(n => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <div style={{ marginTop: 10, fontSize: 12, color: theme.muted }}>
              {ws.endpoints.filter(e => e.transport === t.transport).length} endpoint(s) configured
            </div>
          </Card>
        ))}
      </Grid>

      <Card title="Audio contract" hint="What crosses the transport, regardless of carrier.">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: theme.text, lineHeight: 1.8 }}>
          <li>Audio frames carry callId, codec and timestamp — no agent state.</li>
          <li>DTMF is an event, not text, so payment capture stays PCI-safe.</li>
          <li>Barge-in is an event: the firewall pauses output, the flow cancels the in-flight turn.</li>
          <li>Call state (ringing → active → held → transferring → ended) is owned by the gateway.</li>
        </ul>
        <Button style={{ marginTop: 12 }} onClick={() => notify('Contract documented in docs/VOICE_GATEWAY.md', 'good')}>
          Where is this specified?
        </Button>
      </Card>
    </Page>
  );
};

export const gatewayPages: Record<string, React.FC<PageContext>> = {
  'gateway.endpoints': Endpoints,
  'gateway.ccaas': CcaasTargets,
  'gateway.sessions': Sessions,
  'gateway.transports': Transports
};