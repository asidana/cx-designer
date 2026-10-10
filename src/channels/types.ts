/**
 * Channel model — one message envelope for every channel.
 *
 * Voice, chat, webchat, copilots, self-help, and web MCP agents all
 * speak envelopes. Text, audio, UI directives, and tool calls are
 * envelope *parts*, not separate systems — so flows stay
 * channel-agnostic and Sentinel gates one shape.
 */

export type ChannelId =
  | 'voice'
  | 'chat'
  | 'sms'
  | 'webchat'
  | 'copilot'
  | 'selfhelp'
  | 'webmcp';

export type MessageRole = 'caller' | 'agent' | 'system';

export type MessagePart =
  | { kind: 'text'; text: string }
  | { kind: 'audio'; ref: string; mimeType: string }
  | { kind: 'ui'; protocol: 'ag-ui' | 'a2ui'; payload: Record<string, unknown> }
  | { kind: 'tool'; name: string; args: Record<string, unknown> }
  | { kind: 'handoff'; queue: string; summary: string };

export interface ChannelMessage {
  id: string;
  channel: ChannelId;
  sessionId: string;
  role: MessageRole;
  parts: MessagePart[];
  at: number;
  /** carrier context (page URL/title from widgets, device, locale) */
  context?: {
    page?: { url: string; title: string; selection?: string };
    locale?: string;
    [key: string]: unknown;
  };
}

export interface ChannelCapabilities {
  streamingAudio: boolean;
  uiDirectives: boolean;
  dtmf: boolean;
  typingIndicators: boolean;
  richCards: boolean;
  approvals: boolean;
}

export const CHANNEL_CAPABILITIES: Record<ChannelId, ChannelCapabilities> = {
  voice: {
    streamingAudio: true,
    uiDirectives: false,
    dtmf: true,
    typingIndicators: false,
    richCards: false,
    approvals: false
  },
  chat: {
    streamingAudio: false,
    uiDirectives: false,
    dtmf: false,
    typingIndicators: true,
    richCards: true,
    approvals: false
  },
  sms: {
    streamingAudio: false,
    uiDirectives: false,
    dtmf: false,
    typingIndicators: false,
    richCards: false,
    approvals: false
  },
  webchat: {
    streamingAudio: false,
    uiDirectives: true,
    dtmf: false,
    typingIndicators: true,
    richCards: true,
    approvals: false
  },
  copilot: {
    streamingAudio: false,
    uiDirectives: true,
    dtmf: false,
    typingIndicators: true,
    richCards: true,
    approvals: true
  },
  selfhelp: {
    streamingAudio: false,
    uiDirectives: true,
    dtmf: false,
    typingIndicators: true,
    richCards: true,
    approvals: false
  },
  webmcp: {
    streamingAudio: false,
    uiDirectives: false,
    dtmf: false,
    typingIndicators: false,
    richCards: false,
    approvals: true
  }
};

export function validateEnvelope(msg: ChannelMessage): string[] {
  const errors: string[] = [];
  if (!msg.id) errors.push('Envelope needs an id.');
  if (!msg.channel || !CHANNEL_CAPABILITIES[msg.channel]) {
    errors.push(`Unknown channel "${msg.channel}".`);
  }
  if (!msg.sessionId) errors.push('Envelope needs a sessionId.');
  if (!Array.isArray(msg.parts) || msg.parts.length === 0) {
    errors.push('Envelope needs at least one part.');
  }
  return errors;
}
