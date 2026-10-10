/**
 * Chat runtime — ChannelMessage envelopes through the flow engine.
 *
 * Takes a caller envelope, extracts turn text, executes the flow, and
 * returns agent envelopes with a typing indicator followed by the reply.
 * Registered on the ChannelRouter for `chat` and `webchat` (T2).
 */

import { FlowEngine } from '../engine/flowEngine';
import { ChannelMessage } from './types';

function turnText(msg: ChannelMessage): string {
  const part = msg.parts.find(p => p.kind === 'text');
  return part && part.kind === 'text' ? part.text : '';
}

export async function runChatTurn(
  engine: FlowEngine,
  msg: ChannelMessage
): Promise<ChannelMessage[]> {
  const text = turnText(msg);
  const typing: ChannelMessage = {
    id: `${msg.id}_typing`,
    channel: msg.channel,
    sessionId: msg.sessionId,
    role: 'agent',
    parts: [{ kind: 'text', text: '…' }],
    at: Date.now()
  };

  const result = await engine.execute(text, msg.sessionId);
  // Chat flows terminate at chat.output ({ message: { text } });
  // agentic flows terminate with { response }.
  const message = result.outputs.message as { text?: string } | undefined;
  const text_out = String(
    result.outputs.response ?? message?.text ?? ''
  );
  const reply: ChannelMessage = {
    id: `${msg.id}_reply`,
    channel: msg.channel,
    sessionId: msg.sessionId,
    role: 'agent',
    parts: [{ kind: 'text', text: text_out }],
    at: Date.now()
  };
  return [typing, reply];
}
