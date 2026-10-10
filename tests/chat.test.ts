/**
 * Chat Runtime Tests (T2)
 *
 * A scripted webchat turn: envelope → ChannelRouter → FlowEngine →
 * reply envelopes (typing indicator + text reply).
 */

import { describe, it, expect } from 'vitest';
import { ChannelRouter } from '../src/channels/router';
import { runChatTurn } from '../src/channels/chatRuntime';
import { FlowEngine } from '../src/engine/flowEngine';
import { FlowGraph, FlowNode } from '../src/types/node';
import { nodeRegistry } from '../src/nodes/registry';
import { chatInputNode } from '../src/nodes/chat/chatInput';
import { chatOutputNode } from '../src/nodes/chat/chatOutput';

nodeRegistry.register(chatInputNode);
nodeRegistry.register(chatOutputNode);

function chatFlow(): FlowGraph {
  const nodes = [
    {
      id: 'in',
      type: 'chat.input',
      position: { x: 0, y: 0 },
      data: { config: { quickReplies: ['Track order'] }, label: 'In' }
    },
    {
      id: 'out',
      type: 'chat.output',
      position: { x: 200, y: 0 },
      data: { config: { markdown: true, citations: false, cards: [], quickReplies: [] }, label: 'Out' }
    }
  ] as FlowNode[];
  return {
    id: 'chat_test',
    name: 'Chat Test',
    version: '1.0.0',
    nodes,
    edges: [{ id: 'e1', source: 'in', target: 'out' }]
  };
}

describe('chat runtime', () => {
  it('runs a scripted webchat turn end to end', async () => {
    const engine = new FlowEngine(chatFlow());
    const router = new ChannelRouter();
    const handler = async (msg: Parameters<Parameters<typeof router.register>[1]>[0]) =>
      runChatTurn(engine, msg);
    router.register('webchat', handler);

    const replies = await router.inbound({
      id: 'm1',
      channel: 'webchat',
      sessionId: 's1',
      role: 'caller',
      parts: [{ kind: 'text', text: 'Where is my order?' }],
      at: Date.now()
    });

    expect(replies).toHaveLength(2);
    expect(replies[0].parts).toEqual([{ kind: 'text', text: '…' }]);
    // Passthrough flow: chat.output echoes the turn text
    expect(replies[1].parts).toEqual([{ kind: 'text', text: 'Where is my order?' }]);
  });

  it('chat nodes are registered with the chat category', () => {
    expect(nodeRegistry.get('chat.input')?.category).toBe('chat');
    expect(nodeRegistry.get('chat.output')?.category).toBe('chat');
  });
});
