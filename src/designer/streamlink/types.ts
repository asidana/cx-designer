/**
 * StreamLink types — SIP/WebSocket/gRPC telephony bridge between
 * agents and CCaaS environments.
 *
 * StreamLink is a *gateway service*: outside systems (CCaaS, PSTN,
 * SIP trunks) see endpoints; inside, calls are routed to agents.
 * Agents own business logic and use cases; StreamLink owns transport,
 * and Sentinel owns protection around both.
 */

export type StreamTransport = 'sip' | 'websocket' | 'grpc';

export type CallDirection = 'inbound' | 'outbound';

export type CallState =
  | 'ringing'
  | 'active'
  | 'held'
  | 'transferring'
  | 'ended';

export type CcaasTarget =
  | 'genesys'
  | 'five9'
  | 'avaya'
  | 'amazon-connect'
  | 'custom';

export type AudioCodec = 'pcmu' | 'pcma' | 'opus' | 'g722';

export interface StreamLinkEndpoint {
  id: string;
  transport: StreamTransport;
  /** SIP trunk URI, WebSocket URL, or gRPC address */
  address: string;
  ccaas: CcaasTarget;
  did?: string;
  codecs?: AudioCodec[];
  /** RFC2833 in-band DTMF (required for PCI-safe payment capture) */
  dtmfMode?: 'rfc2833' | 'inband' | 'sip-info';
}

export interface StreamCall {
  id: string;
  endpointId: string;
  direction: CallDirection;
  state: CallState;
  from: string;
  to: string;
  agentId: string | null;
  startedAt: number;
  recordingPaused: boolean;
  metadata: Record<string, unknown>;
}

export interface AudioFrame {
  callId: string;
  data: ArrayBuffer;
  timestamp: number;
  codec: AudioCodec;
}

export interface DtmfEvent {
  callId: string;
  digits: string;
  timestamp: number;
}
