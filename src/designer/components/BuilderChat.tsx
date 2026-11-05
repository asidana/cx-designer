/**
 * Builder Chat — conversational flow builder.
 *
 * Type what you want in plain text ("add an intent classifier",
 * "connect voice input to intent", "build a billing voice bot") and the
 * builder interprets it into canvas operations, executes them, and
 * reports what changed. Iterative: build, then refine by chatting.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Node, Edge } from 'reactflow';
import { interpret, BuilderOp } from '../builder/interpreter';
import type { FlowGraph, NodeType } from '../types/node';
import type { ChannelId } from '../channels/types';
import { theme } from '../design/themeRuntime';
import { Z } from './ui';

interface BuilderChatProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  /** Design target channel — full-flow generations match it. */
  channel?: ChannelId;
  onReplaceFlow: (flow: FlowGraph) => void;
  onAddNode: (type: NodeType) => void;
  onConnectNodes: (sourceId: string, targetId: string) => boolean;
  onConfigureNode: (nodeId: string, patch: Record<string, unknown>) => void;
  onRemoveNode: (nodeId: string) => void;
  onClearCanvas: () => void;
  onClose?: () => void;
}

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
}

const SUGGESTIONS = [
  'Build a billing voice bot',
  'Add an intent classifier',
  'Connect voice input to intent',
  'What is this flow?'
];

export const BuilderChat: React.FC<BuilderChatProps> = ({
  nodes,
  edges,
  selectedNodeId,
  channel,
  onReplaceFlow,
  onAddNode,
  onConnectNodes,
  onConfigureNode,
  onRemoveNode,
  onClearCanvas,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      text: 'Hi! Describe what to build or change — e.g. "build a billing voice bot", "add a guardrail", "connect intent to reasoning".'
    }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  // Destructive full-flow generations wait for explicit approval instead of
  // replacing the canvas the moment they arrive.
  const [pendingReplace, setPendingReplace] = useState<FlowGraph | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, thinking]);

  const executeOp = (op: BuilderOp, notes: string[]): void => {
    switch (op.kind) {
      case 'add':
        onAddNode(op.nodeType);
        break;
      case 'connect': {
        const ok = onConnectNodes(op.from, op.to);
        if (!ok) notes.push('Those two were already connected.');
        break;
      }
      case 'configure':
        onConfigureNode(op.nodeId, op.patch);
        break;
      case 'remove':
        onRemoveNode(op.nodeId);
        break;
      case 'replace':
        // Never auto-replace: stage the generated flow for review. History
        // still records the apply (via onReplaceFlow → importFlow), so the
        // approval itself is undoable.
        setPendingReplace(op.flow);
        notes.push(
          `Generated “${op.flow.name}” (${op.flow.nodes.length} nodes) — review below, then Apply or discard.`
        );
        break;
      case 'clear':
        onClearCanvas();
        break;
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setThinking(true);
    try {
      const plan = await interpret(trimmed, {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        selectedNodeId,
        channel
      });
      const notes: string[] = [];
      for (const op of plan.ops) executeOp(op, notes);
      const full = notes.length > 0 ? `${plan.reply}\n${notes.join('\n')}` : plan.reply;
      setMessages(prev => [...prev, { role: 'agent', text: full }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'agent', text: 'Something went wrong interpreting that — try rephrasing.' }
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 16,
        bottom: 16,
        width: 380,
        zIndex: Z.panel,
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.border}`
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>🤖 Builder</span>
        <button
          onClick={() => onClose?.()}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.muted,
            cursor: 'pointer',
            fontSize: 18
          }}
          aria-label="Close builder chat"
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              padding: '8px 12px',
              borderRadius: 8,
              background: m.role === 'user' ? theme.accent : theme.panel2,
              border: m.role === 'agent' ? `1px solid ${theme.border}` : 'none',
              color: m.role === 'user' ? theme.accentContrast : theme.text,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.45
            }}
          >
            {m.text}
          </div>
        ))}
        {thinking && (
          <div role="status" aria-live="polite" style={{ fontSize: 12, color: theme.muted }}>
            Thinking…
          </div>
        )}
        {pendingReplace && (
          <div
            role="group"
            aria-label="Review generated flow"
            style={{
              border: `1px solid ${theme.accent}`,
              borderRadius: 8,
              padding: 10,
              background: theme.panel2,
              fontSize: 12,
              color: theme.text,
              lineHeight: 1.5
            }}
          >
            <strong>Review before apply</strong>
            <div style={{ color: theme.muted, margin: '4px 0 8px' }}>
              “{pendingReplace.name}” — {pendingReplace.nodes.length} nodes,{' '}
              {pendingReplace.edges.length} edges. Applying replaces the canvas
              (undoable).
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  onReplaceFlow(pendingReplace);
                  setPendingReplace(null);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: theme.accent,
                  color: theme.accentContrast,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Apply flow
              </button>
              <button
                onClick={() => setPendingReplace(null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                  background: 'transparent',
                  color: theme.muted,
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', flexWrap: 'wrap' }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => void send(s)}
            disabled={thinking}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              border: `1px solid ${theme.accent}`,
              background: 'transparent',
              color: theme.accent,
              cursor: 'pointer',
              fontSize: 11
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${theme.border}` }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what to build or change…"
          aria-label="Builder message"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${theme.border}`,
            background: theme.input,
            color: theme.text,
            fontSize: 13
          }}
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            background: theme.accent,
            color: theme.accentContrast,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};
