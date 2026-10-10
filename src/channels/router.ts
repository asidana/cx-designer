/**
 * Channel router — inbound envelopes to engine handlers, outbound fan-out.
 *
 * Each channel registers one handler (voice pipeline, chat runtime,
 * copilot pane, …). The router validates envelopes, invokes the handler,
 * and returns outbound envelopes. Node kinds a channel cannot render
 * get an explicit fallback instead of silent failure.
 */

import {
  ChannelId,
  ChannelMessage,
  CHANNEL_CAPABILITIES,
  validateEnvelope
} from './types';

export type InboundHandler = (msg: ChannelMessage) => Promise<ChannelMessage[]>;

/** Node kinds that need a channel capability to render correctly. */
const NODE_FALLBACKS: Array<{
  match: (nodeType: string) => boolean;
  needs: keyof typeof CHANNEL_CAPABILITIES['voice'];
  fallback: string;
}> = [
  {
    match: t => t === 'voice.input' || t === 'voice.output',
    needs: 'streamingAudio',
    fallback: 'Render as text transcript with a voice-note attachment.'
  },
  {
    match: t => t === 'integration.telephony' || t === 'integration.streamlink',
    needs: 'streamingAudio',
    fallback: 'Offer a click-to-call handoff instead of in-channel audio.'
  },
  {
    match: t => t === 'copilot.action' || t.startsWith('a2ui.') || t.startsWith('ag-ui.'),
    needs: 'uiDirectives',
    fallback: 'Render the directive as structured text with explicit confirm buttons.'
  }
];

export function fallbackFor(channel: ChannelId, nodeType: string): string | null {
  const caps = CHANNEL_CAPABILITIES[channel];
  for (const rule of NODE_FALLBACKS) {
    if (rule.match(nodeType) && !caps[rule.needs]) return rule.fallback;
  }
  return null;
}

export class ChannelRouter {
  private handlers = new Map<ChannelId, InboundHandler>();

  register(channel: ChannelId, handler: InboundHandler): void {
    this.handlers.set(channel, handler);
  }

  unregister(channel: ChannelId): void {
    this.handlers.delete(channel);
  }

  channels(): ChannelId[] {
    return Array.from(this.handlers.keys());
  }

  async inbound(msg: ChannelMessage): Promise<ChannelMessage[]> {
    const errors = validateEnvelope(msg);
    if (errors.length > 0) {
      throw new Error(`Invalid envelope: ${errors.join(' ')}`);
    }
    const handler = this.handlers.get(msg.channel);
    if (!handler) {
      throw new Error(`No handler registered for channel "${msg.channel}".`);
    }
    const out = await handler(msg);
    for (const reply of out) {
      const replyErrors = validateEnvelope(reply);
      if (replyErrors.length > 0) {
        throw new Error(`Handler returned invalid envelope: ${replyErrors.join(' ')}`);
      }
    }
    return out;
  }
}
