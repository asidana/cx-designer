/**
 * StreamLink transports — SIP, WebSocket, gRPC legs.
 *
 * Production mapping (not bundled — bring your stack):
 * - SIP: Kamailio/FreeSWITCH or drachtio SIP server + RTP engine.
 *   This interface is what that stack adapts to.
 * - WebSocket: PCMU/Opus frames over WS (Twilio Media Streams shape).
 * - gRPC: bidirectional audio streaming (AudioFrame in/out).
 *
 * LoopbackTransport is the mock: two ends in one process, used by
 * simulations and tests with zero credentials.
 */

import { AudioFrame, CallState, DtmfEvent, StreamTransport } from './types';

export interface TransportEvents {
  onAudio?: (frame: AudioFrame) => void;
  onDtmf?: (event: DtmfEvent) => void;
  onState?: (callId: string, state: CallState) => void;
}

export interface CallTransport {
  readonly kind: StreamTransport;
  connect(events: TransportEvents): Promise<void>;
  disconnect(): Promise<void>;
  /** outbound: returns call id */
  placeCall(to: string, headers?: Record<string, string>): Promise<string>;
  answerCall(callId: string): Promise<void>;
  sendAudio(callId: string, data: ArrayBuffer): void;
  sendDtmf(callId: string, digits: string): void;
  hangup(callId: string): Promise<void>;
  /** pause media recording (PCI: payment capture must not be recorded) */
  pauseRecording(callId: string): void;
  resumeRecording(callId: string): void;
}

export interface SipTransportConfig {
  kind: 'sip';
  /** SIP server to register/trunk against */
  server: string;
  username?: string;
  /** prefer env/secret store; never commit */
  passwordEnv?: string;
  expiresSecs?: number;
}

/**
 * TODO(production): implement against drachtio / Kamailio + RTP engine.
 * Contract notes:
 * - INVITE with SDP (PCMU/PCMA/Opus); 183 + PRACK for early media.
 * - DTMF via RFC2833 telephone-events; never as audio into STT.
 * - re-INVITE for hold; REFER for blind transfer, INVITE+replaces for warm.
 * - Recording pause = stop forking media to recorder on this leg.
 */
export class SipTransport implements CallTransport {
  readonly kind = 'sip' as const;
  private events: TransportEvents = {};
  private calls = new Map<string, CallState>();

  constructor(private config: SipTransportConfig) {
    void this.config;
  }

  async connect(events: TransportEvents): Promise<void> {
    this.events = events;
    throw new Error(
      'SipTransport needs a SIP stack (drachtio/Kamailio). Use LoopbackTransport for simulations.'
    );
  }

  async disconnect(): Promise<void> {
    this.calls.clear();
  }

  async placeCall(): Promise<string> {
    throw new Error('SipTransport is not connected — no SIP stack bound.');
  }

  async answerCall(callId: string): Promise<void> {
    this.calls.set(callId, 'active');
    this.events.onState?.(callId, 'active');
  }

  sendAudio(): void {
    throw new Error('SipTransport is not connected — no SIP stack bound.');
  }

  sendDtmf(callId: string, digits: string): void {
    // RFC2833 path goes here once a stack is bound.
    void callId;
    void digits;
  }

  async hangup(callId: string): Promise<void> {
    this.calls.set(callId, 'ended');
    this.events.onState?.(callId, 'ended');
  }

  pauseRecording(): void {
    // Stop forking media to the recorder on this leg.
  }

  resumeRecording(): void {
    // Resume media fork to the recorder.
  }
}

/** In-process loopback: agent end ↔ simulated caller end. */
export class LoopbackTransport implements CallTransport {
  readonly kind: StreamTransport = 'websocket';
  private events: TransportEvents = {};
  private calls = new Map<string, CallState>();
  private seq = 0;

  async connect(events: TransportEvents): Promise<void> {
    this.events = events;
  }

  async disconnect(): Promise<void> {
    this.calls.clear();
  }

  async placeCall(to: string): Promise<string> {
    const id = `loop_${Date.now()}_${this.seq++}`;
    void to;
    this.calls.set(id, 'ringing');
    this.events.onState?.(id, 'ringing');
    return id;
  }

  async answerCall(callId: string): Promise<void> {
    this.calls.set(callId, 'active');
    this.events.onState?.(callId, 'active');
  }

  sendAudio(callId: string, data: ArrayBuffer): void {
    // Loop straight back as the "caller" leg for simulations.
    this.events.onAudio?.({ callId, data, timestamp: Date.now(), codec: 'pcmu' });
  }

  sendDtmf(callId: string, digits: string): void {
    this.events.onDtmf?.({ callId, digits, timestamp: Date.now() });
  }

  async hangup(callId: string): Promise<void> {
    this.calls.set(callId, 'ended');
    this.events.onState?.(callId, 'ended');
  }

  pauseRecording(): void {}
  resumeRecording(): void {}
}
