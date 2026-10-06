/**
 * Script View — linear conversation view of the flow.
 *
 * CX designers think in dialogue ("agent says… caller says… then…"),
 * not graphs. This renders the primary path (entry → first-edge-first
 * traversal, cycle-guarded) as numbered steps with config summaries.
 * Read-only for now; click a step to select the node on the canvas.
 * Doubles as the accessible, outline-style alternative to the canvas.
 */

import React, { useMemo } from 'react';
import { Node, Edge } from 'reactflow';

interface ScriptViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

interface ScriptStep {
  index: number;
  nodeId: string;
  icon: string;
  label: string;
  kind: string;
  summary: string;
}

function summarizeConfig(node: Node): string {
  const config = (node.data?.config as Record<string, unknown>) || {};
  const str = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v));
  const parts: string[] = [];

  if (config.model) parts.push(`model: ${config.model}`);
  if (config.voice) parts.push(`voice: ${str(config.voice)}`);
  if (config.stt) parts.push(`STT: ${str((config.stt as Record<string, unknown>)?.provider || config.stt)}`);
  if (config.tts) parts.push(`TTS: ${str((config.tts as Record<string, unknown>)?.provider || config.tts)}`);
  if (Array.isArray(config.intents)) {
    parts.push(
      `intents: ${(config.intents as Array<{ name: string }>).map(i => i.name).join(', ')}`
    );
  }
  if (Array.isArray(config.slots)) {
    parts.push(
      `slots: ${(config.slots as Array<{ name: string }>).map(s => s.name).join(', ')}`
    );
  }
  if (Array.isArray(config.tools)) {
    parts.push(
      `tools: ${(config.tools as Array<{ name: string }>).map(t => t.name).join(', ')}`
    );
  }
  if (config.queue) parts.push(`queue: ${config.queue}`);
  if (config.url) parts.push(`→ ${config.url}`);
  if (config.prompt) parts.push(`"${str(config.prompt).slice(0, 80)}"`);

  return parts.join(' · ') || 'no key settings';
}

function kindLabel(type: string): string {
  if (type.startsWith('voice.')) return 'Voice';
  if (type.startsWith('agentic.')) return 'AI';
  if (type.startsWith('deterministic.')) return 'Rule';
  if (type.startsWith('control.')) return 'Flow';
  if (type.startsWith('governance.')) return 'Guard';
  return 'Tool';
}

function buildScript(nodes: Node[], edges: Edge[]): ScriptStep[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const targets = new Set(edges.map(e => e.target));
  const entry = nodes.filter(n => !targets.has(n.id));
  const start = entry.length > 0 ? entry : nodes.slice(0, 1);

  const steps: ScriptStep[] = [];
  const visited = new Set<string>();
  const queue = [...start];
  let index = 1;

  while (queue.length > 0 && steps.length < 200) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    steps.push({
      index: index++,
      nodeId: node.id,
      icon: String(node.data?.icon || '•'),
      label: String(node.data?.label || node.id),
      kind: kindLabel(String(node.data?.type || '')),
      summary: summarizeConfig(node)
    });

    for (const edge of edges.filter(e => e.source === node.id)) {
      const next = byId.get(edge.target);
      if (next && !visited.has(next.id)) queue.push(next);
    }
  }

  // Orphaned nodes not reachable from entry
  for (const n of nodes) {
    if (!visited.has(n.id) && steps.length < 200) {
      visited.add(n.id);
      steps.push({
        index: index++,
        nodeId: n.id,
        icon: String(n.data?.icon || '•'),
        label: String(n.data?.label || n.id),
        kind: kindLabel(String(n.data?.type || '')) + ' (unreachable)',
        summary: summarizeConfig(n)
      });
    }
  }

  return steps;
}

export const ScriptView: React.FC<ScriptViewProps> = ({ nodes, edges, onSelectNode, onClose }) => {
  const steps = useMemo(() => buildScript(nodes, edges), [nodes, edges]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 266,
        zIndex: 90,
        background: 'rgba(15, 15, 26, 0.98)',
        border: '1px solid #333',
        borderRadius: 12,
        padding: 20,
        width: 420,
        maxHeight: '70vh',
        overflowY: 'auto'
      }}
      role="document"
      aria-label="Conversation script view"
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>📜 Script View</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18
          }}
          aria-label="Close script view"
        >
          ×
        </button>
      </div>
      <p style={{ fontSize: 11, color: '#666', margin: '0 0 12px' }}>
        Primary path in call order. Click a step to select it on the canvas.
      </p>

      {steps.length === 0 ? (
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', padding: 20 }}>
          Empty flow — add nodes to see the script.
        </div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {steps.map(step => (
            <li
              key={step.nodeId}
              onClick={() => onSelectNode(step.nodeId)}
              style={{
                display: 'flex',
                gap: 10,
                padding: '8px 10px',
                marginBottom: 6,
                background: '#1a1a2e',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              title="Select on canvas"
            >
              <span
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#333',
                  color: '#fff',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {step.index}
              </span>
              <div>
                <div style={{ fontSize: 13 }}>
                  {step.icon} {step.label}{' '}
                  <span style={{ fontSize: 10, color: '#8b5cf6' }}>[{step.kind}]</span>
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>{step.summary}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
