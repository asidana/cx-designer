/**
 * StreamLink — SIP/WebSocket/gRPC gateway service connecting agents
 * with CCaaS environments and telephony.
 *
 * Division of ownership:
 * - Agents own business logic and use cases.
 * - StreamLink owns transport: endpoints, legs, audio bridging, DTMF,
 *   transfers, recording pause.
 * - Sentinel owns protection: every call and every delegation is gated.
 *
 *   outside world ──▶ StreamLink ──▶ Sentinel ──▶ agent
 *        (SIP/WS/gRPC)   (transport)    (policy)    (business logic)
 */

import { Sentinel } from '../sentinel/sentinel';
import {
  AudioFrame,
  CallDirection,
  CcaasTarget,
  DtmfEvent,
  StreamCall,
  StreamLinkEndpoint,
  StreamTransport
} from './types';
import { CallTransport, LoopbackTransport } from './transports';

export interface AgentBinding {
  agentId: string;
  /** invoked per inbound audio frame; returns agent audio (or silence) */
  onAudio: (frame: AudioFrame, call: StreamCall) => Promise<ArrayBuffer | null>;
  /** invoked per inbound DTMF burst (RFC2833 — never STT) */
  onDtmf?: (event: DtmfEvent, call: StreamCall) => Promise<void>;
  /** invoked when the call ends (disposition, summary, CRM write-back) */
  onHangup?: (call: StreamCall) => Promise<void>;
}

export interface StreamLinkConfig {
  sentinel: Sentinel;
  /** default tenant/policy context merged into every gate */
  basePolicy?: Record<string, unknown>;
}

export class StreamLink {
  private endpoints = new Map<string, StreamLinkEndpoint>();
  private transports = new Map<string, CallTransport>();
  private agents = new Map<string, AgentBinding>();
  private calls = new Map<string, StreamCall>();

  constructor(private config: StreamLinkConfig) {}

  /** Expose an endpoint to outside systems (CCaaS trunk, WS URL, gRPC addr). */
  async addEndpoint(
    endpoint: StreamLinkEndpoint,
    transport?: CallTransport
  ): Promise<void> {
    const t = transport || new LoopbackTransport();
    await t.connect({
      onAudio: frame => void this.handleInboundAudio(frame),
      onDtmf: event => void this.handleInboundDtmf(event),
      onState: (callId, state) => {
        const call = this.calls.get(callId);
        if (call) call.state = state;
      }
    });
    this.endpoints.set(endpoint.id, endpoint);
    this.transports.set(endpoint.id, t);
  }

  /** Bind an agent behind StreamLink; calls route to it after the gate. */
  bindAgent(binding: AgentBinding): void {
    this.agents.set(binding.agentId, binding);
  }

  unbindAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /** Inbound call from telephony/CCaaS → gate → agent. Returns call id. */
  async inboundCall(
    endpointId: string,
    from: string,
    to: string,
    ccaas: CcaasTarget,
    agentId: string,
    policy: Record<string, unknown> = {}
  ): Promise<string> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) throw new Error(`Unknown endpoint "${endpointId}".`);
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`No agent bound as "${agentId}".`);

    const gate = this.config.sentinel.check({
      phase: 'pre_llm',
      content: `[inbound ${endpoint.transport} call from ${from} to ${to} via ${ccaas}]`,
      session: { ...this.config.basePolicy, ...policy, ccaas, transport: endpoint.transport },
      identity: from
    });
    if (!gate.allowed) {
      throw new Error(
        `Sentinel refused inbound call (${gate.action}): ` +
          gate.violations.map(v => v.message).join('; ')
      );
    }

    const transport = this.transports.get(endpointId)!;
    const id = await transport.placeCall(to);
    this.calls.set(id, {
      id,
      endpointId,
      direction: 'inbound',
      state: 'ringing',
      from,
      to,
      agentId,
      startedAt: Date.now(),
      recordingPaused: false,
      metadata: { ccaas, ...(gate.configUpdates || {}) }
    });
    await transport.answerCall(id);
    return id;
  }

  /** Agent-initiated outbound call (e.g. callbacks, reminders). */
  async outboundCall(
    endpointId: string,
    agentId: string,
    to: string,
    policy: Record<string, unknown> = {}
  ): Promise<string> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) throw new Error(`Unknown endpoint "${endpointId}".`);
    if (!this.agents.has(agentId)) throw new Error(`No agent bound as "${agentId}".`);

    const gate = this.config.sentinel.check({
      phase: 'pre_tool',
      content: `[outbound call to ${to}]`,
      session: { ...this.config.basePolicy, ...policy, transport: endpoint.transport },
      toolName: 'streamlink:outbound-call',
      identity: `agent:${agentId}`
    });
    if (!gate.allowed) {
      throw new Error(
        `Sentinel refused outbound call (${gate.action}): ` +
          gate.violations.map(v => v.message).join('; ')
      );
    }

    const transport = this.transports.get(endpointId)!;
    const id = await transport.placeCall(to);
    this.calls.set(id, {
      id,
      endpointId,
      direction: 'outbound',
      state: 'active',
      from: endpoint.did || 'unknown',
      to,
      agentId,
      startedAt: Date.now(),
      recordingPaused: false,
      metadata: { ...(gate.configUpdates || {}) }
    });
    return id;
  }

  private async handleInboundAudio(frame: AudioFrame): Promise<void> {
    const call = this.calls.get(frame.callId);
    if (!call || call.state !== 'active') return;
    const agent = call.agentId ? this.agents.get(call.agentId) : undefined;
    if (!agent) return;
    const reply = await agent.onAudio(frame, call);
    if (reply) {
      const transport = this.transports.get(call.endpointId);
      transport?.sendAudio(call.id, reply);
    }
  }

  private async handleInboundDtmf(event: DtmfEvent): Promise<void> {
    const call = this.calls.get(event.callId);
    if (!call) return;
    const agent = call.agentId ? this.agents.get(call.agentId) : undefined;
    await agent?.onDtmf?.(event, call);
  }

  /** Warm transfer: agent stays on the line while the target joins. */
  async warmTransfer(callId: string, targetAgentId: string): Promise<void> {
    const call = this.calls.get(callId);
    if (!call) throw new Error(`Unknown call "${callId}".`);
    if (!this.agents.has(targetAgentId)) {
      throw new Error(`No agent bound as "${targetAgentId}".`);
    }
    call.state = 'transferring';
    call.agentId = targetAgentId;
    call.state = 'active';
  }

  /** Blind transfer: hand off without introduction. */
  async blindTransfer(callId: string, target: string): Promise<void> {
    const call = this.calls.get(callId);
    if (!call) throw new Error(`Unknown call "${callId}".`);
    call.state = 'transferring';
    call.to = target;
    call.agentId = null;
    call.state = 'active';
  }

  /** Pause media recording (PCI: payment capture must not be recorded). */
  pauseRecording(callId: string): void {
    const call = this.calls.get(callId);
    if (!call) return;
    call.recordingPaused = true;
    this.transports.get(call.endpointId)?.pauseRecording(callId);
  }

  resumeRecording(callId: string): void {
    const call = this.calls.get(callId);
    if (!call) return;
    call.recordingPaused = false;
    this.transports.get(call.endpointId)?.resumeRecording(callId);
  }

  async hangup(callId: string): Promise<void> {
    const call = this.calls.get(callId);
    const transport = call ? this.transports.get(call.endpointId) : undefined;
    if (transport && call) await transport.hangup(callId);
    if (call) {
      call.state = 'ended';
      const agent = call.agentId ? this.agents.get(call.agentId) : undefined;
      await agent?.onHangup?.(call);
    }
  }

  getCall(callId: string): StreamCall | undefined {
    return this.calls.get(callId);
  }

  listCalls(): StreamCall[] {
    return Array.from(this.calls.values());
  }

  listEndpoints(): StreamLinkEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  transportKind(endpointId: string): StreamTransport | undefined {
    return this.endpoints.get(endpointId)?.transport;
  }
}
