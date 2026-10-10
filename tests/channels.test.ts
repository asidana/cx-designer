/**
 * Channel Router Tests (T1)
 */

import { describe, it, expect } from 'vitest';
import { ChannelRouter, fallbackFor } from '../src/channels/router';
import { ChannelMessage, CHANNEL_CAPABILITIES } from '../src/channels/types';

function envelope(overrides: Partial<ChannelMessage> = {}): ChannelMessage {
  return {
    id: 'msg_1',
    channel: 'webchat',
    sessionId: 'sess_1',
    role: 'caller',
    parts: [{ kind: 'text', text: 'Hello' }],
    at: Date.now(),
    ...overrides
  };
}

describe('ChannelRouter', () => {
  it('routes one envelope per channel through its handler', async () => {
    const router = new ChannelRouter();
    const seen: string[] = [];
    for (const channel of ['voice', 'chat', 'webchat', 'copilot', 'selfhelp', 'webmcp'] as const) {
      router.register(channel, async msg => [
        { ...msg, id: `${msg.id}_reply`, role: 'agent' as const }
      ]);
    }
    for (const channel of router.channels()) {
      const out = await router.inbound(envelope({ channel, id: `m_${channel}` }));
      expect(out).toHaveLength(1);
      expect(out[0].role).toBe('agent');
      seen.push(channel);
    }
    expect(seen).toHaveLength(6);
  });

  it('rejects envelopes with no parts', async () => {
    const router = new ChannelRouter();
    router.register('chat', async msg => [msg]);
    await expect(router.inbound(envelope({ parts: [] }))).rejects.toThrow('at least one part');
  });

  it('rejects unknown channels', async () => {
    const router = new ChannelRouter();
    await expect(
      router.inbound(envelope({ channel: 'fax' as never }))
    ).rejects.toThrow('Unknown channel');
  });

  it('rejects unregistered channels', async () => {
    const router = new ChannelRouter();
    await expect(router.inbound(envelope({ channel: 'copilot' }))).rejects.toThrow(
      'No handler registered'
    );
  });

  it('rejects invalid handler output', async () => {
    const router = new ChannelRouter();
    router.register('chat', async () => [{ ...envelope(), parts: [] }]);
    await expect(router.inbound(envelope({ channel: 'chat' }))).rejects.toThrow('invalid envelope');
  });
});

describe('Channel capabilities + fallbacks', () => {
  it('every channel declares all capabilities', () => {
    for (const caps of Object.values(CHANNEL_CAPABILITIES)) {
      expect(caps).toHaveProperty('streamingAudio');
      expect(caps).toHaveProperty('uiDirectives');
      expect(caps).toHaveProperty('approvals');
    }
  });

  it('voice-only nodes degrade explicitly on chat', () => {
    expect(fallbackFor('chat', 'voice.input')).toMatch(/transcript/);
    expect(fallbackFor('chat', 'integration.streamlink')).toMatch(/click-to-call/);
  });

  it('copilot-only nodes degrade explicitly on voice', () => {
    expect(fallbackFor('voice', 'copilot.action')).toMatch(/confirm buttons/);
  });

  it('supported pairs need no fallback', () => {
    expect(fallbackFor('voice', 'voice.input')).toBeNull();
    expect(fallbackFor('copilot', 'copilot.action')).toBeNull();
  });
});
