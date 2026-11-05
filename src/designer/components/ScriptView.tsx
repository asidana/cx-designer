/**
 * Script View — linear conversation view of the flow.
 *
 * CX designers think in dialogue ("agent says… caller says… then…"),
 * not graphs. This renders the primary path (entry → first-edge-first
 * traversal, cycle-guarded) as numbered steps with config summaries.
 * Each step selects the node on the canvas and can delete it, so the
 * view round-trips: summaries reuse the shared `nodeSummary()` contract
 * (no drift with the cards) and kinds cover every node family.
 * Doubles as the accessible, outline-style alternative to the canvas.
 */

import React, { useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import { domainTypeOf } from '../canvas/domain';
import { nodeSummary } from '../canvas/summary';
import { nodeRegistry } from '../nodes/registry';
import { theme } from '../design/themeRuntime';
import { Z } from './ui';
import { EmptyState } from './states';

interface ScriptViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectNode: (nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onClose?: () => void;
}

interface ScriptStep {
  index: number;
  nodeId: string;
  icon: string;
  label: string;
  kind: string;
  summary: string;
}

function kindLabel(type: string): string {
  if (type.startsWith('voice.')) return 'Voice';
  if (type.startsWith('chat.')) return 'Chat';
  if (type.startsWith('agentic.')) return 'AI';
  if (type.startsWith('deterministic.')) return 'Rule';
  if (type.startsWith('control.')) return 'Flow';
  if (type.startsWith('governance.')) return 'Guard';
  if (type.startsWith('gateway.')) return 'Gateway';
  if (type.startsWith('integration.')) return 'Integration';
  if (type.startsWith('custom.')) return 'Custom';
  if (!type) return 'Unknown';
  return 'Tool';
}

function summarize(node: Node): string {
  const type = domainTypeOf(node);
  return nodeSummary(
    {
      id: node.id,
      data: {
        config: (node.data?.config as Record<string, unknown>) || {},
        label: String(node.data?.label || ''),
        story: (node.data as { story?: { title?: string; summary?: string; role?: string } })?.story
      }
    },
    type ? nodeRegistry.get(type) : undefined
  );
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

  const push = (node: Node, suffix = '') => {
    steps.push({
      index: index++,
      nodeId: node.id,
      icon: String(node.data?.icon || '•'),
      label: String(node.data?.label || node.id),
      kind: kindLabel(String(domainTypeOf(node) ?? '')) + suffix,
      summary: summarize(node)
    });
  };

  while (queue.length > 0 && steps.length < 200) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    push(node);

    for (const edge of edges.filter(e => e.source === node.id)) {
      const next = byId.get(edge.target);
      if (next && !visited.has(next.id)) queue.push(next);
    }
  }

  // Orphaned nodes not reachable from entry
  for (const n of nodes) {
    if (!visited.has(n.id) && steps.length < 200) {
      visited.add(n.id);
      push(n, ' (unreachable)');
    }
  }

  return steps;
}

export const ScriptView: React.FC<ScriptViewProps> = ({ nodes, edges, onSelectNode, onRemoveNode, onClose }) => {
  const steps = useMemo(() => buildScript(nodes, edges), [nodes, edges]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 266,
        zIndex: Z.panel,
        background: theme.panel,
        border: `1px solid ${theme.border}`,
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
        <h2 style={{ margin: 0, fontSize: 16, color: theme.text }}>📜 Script View</h2>
        <button
          onClick={() => onClose?.()}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.muted,
            cursor: 'pointer',
            fontSize: 18
          }}
          aria-label="Close script view"
        >
          ×
        </button>
      </div>
      <p style={{ fontSize: 11, color: theme.subtle, margin: '0 0 12px' }}>
        Primary path in call order. Click a step to select it on the canvas; delete removes it.
      </p>

      {steps.length === 0 ? (
        <EmptyState
          icon="📜"
          title="Empty flow"
          hint="Add nodes to see the script."
        />
      ) : (
        <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {steps.map(step => (
            <li
              key={step.nodeId}
              style={{
                display: 'flex',
                gap: 10,
                padding: '8px 10px',
                marginBottom: 6,
                background: theme.panel2,
                borderRadius: 6
              }}
            >
              <button
                onClick={() => onSelectNode(step.nodeId)}
                aria-label={`Select ${step.label} on canvas`}
                title="Select on canvas"
                style={{
                  display: 'flex',
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'inherit',
                  font: 'inherit'
                }}
              >
              <span
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: theme.border,
                  color: theme.text,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {step.index}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, color: theme.text }}>
                  {step.icon} {step.label}{' '}
                  <span style={{ fontSize: 10, color: theme.accent }}>[{step.kind}]</span>
                </span>
                <span style={{ display: 'block', fontSize: 11, color: theme.muted }}>{step.summary}</span>
              </span>
              </button>
              <button
                onClick={() => onRemoveNode(step.nodeId)}
                aria-label={`Delete ${step.label}`}
                title={`Delete ${step.label}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.subtle,
                  cursor: 'pointer',
                  fontSize: 14,
                  alignSelf: 'flex-start'
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
