/**
 * Preflight Panel — continuous "lint for flows".
 *
 * Flags (each click-to-jump to the node):
 * - unreachable / orphaned nodes (from FlowValidator)
 * - agentic nodes without cost, iteration, or time ceilings
 * - side-effect tools without preconditions
 * - missing human-handoff path and missing guardrails
 */

import React, { useMemo } from 'react';
import { Node } from 'reactflow';
import { FlowValidator, ValidationIssue } from '../validation/FlowValidator';
import { FlowGraph, FlowNode, FlowEdge } from '../types/node';

interface PreflightPanelProps {
  nodes: Node[];
  edges: Array<{ id: string; source: string; target: string }>;
  flowName: string;
  flowVersion: string;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

interface LintIssue extends ValidationIssue {
  fix?: string;
}

export function lintFlow(nodes: Node[], edges: PreflightPanelProps['edges']): LintIssue[] {
  const graph: FlowGraph = {
    id: 'preflight',
    name: 'preflight',
    version: '1.0.0',
    nodes: nodes as FlowNode[],
    edges: edges as FlowEdge[]
  };
  const issues: LintIssue[] = [...FlowValidator.validate(graph).issues];

  const getConfig = (n: Node): Record<string, unknown> =>
    (n.data?.config as Record<string, unknown>) || {};
  const getType = (n: Node): string => (n.data?.type as string) || '';

  // Agentic ceilings
  for (const n of nodes) {
    if (getType(n) === 'agentic.reasoning_loop') {
      const c = getConfig(n);
      const missing: string[] = [];
      if (c.maxIterations == null) missing.push('maxIterations');
      if (c.costCeiling == null) missing.push('costCeiling');
      if (c.deadlineMs == null) missing.push('deadlineMs');
      if (missing.length > 0) {
        issues.push({
          type: 'warning',
          message: `Reasoning loop missing ceilings: ${missing.join(', ')}`,
          nodeId: n.id,
          fix: 'Set all three ceilings in the config panel.'
        });
      }
      // Side-effect tools without preconditions
      const tools = (c.tools as Array<{ name: string; preconditions?: unknown }>) || [];
      for (const t of tools) {
        if (!t.preconditions) {
          issues.push({
            type: 'warning',
            message: `Tool "${t.name}" has no preconditions — any caller state can trigger it`,
            nodeId: n.id,
            fix: 'Add preconditions (e.g. identity_verified == true).'
          });
        }
      }
    }
  }

  // Missing human-handoff path
  const hasVoiceOrAgentic = nodes.some(n => {
    const t = getType(n);
    return t.startsWith('voice.') || t.startsWith('agentic.');
  });
  const hasHandoff = nodes.some(n => getType(n) === 'deterministic.human_handoff');
  if (hasVoiceOrAgentic && !hasHandoff) {
    issues.push({
      type: 'warning',
      message: 'No human-handoff path — callers have no escape from the agent',
      fix: 'Add a Human Handoff node and route low-confidence intents to it.'
    });
  }

  // Missing guardrails
  const hasGuardrail = nodes.some(n => getType(n) === 'governance.guardrail');
  if (hasVoiceOrAgentic && !hasGuardrail) {
    issues.push({
      type: 'warning',
      message: 'No guardrail node — PII and injection pass through unchecked',
      fix: 'Add a Guardrail node before LLM and tool calls.'
    });
  }

  return issues;
}

export const PreflightPanel: React.FC<PreflightPanelProps> = ({
  nodes,
  edges,
  flowName,
  flowVersion,
  onSelectNode,
  onClose
}) => {
  const issues = useMemo(
    () => lintFlow(nodes, edges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, flowName, flowVersion]
  );
  const errors = issues.filter(i => i.type === 'error').length;
  const warnings = issues.filter(i => i.type === 'warning').length;

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 16,
        zIndex: 100,
        background: 'rgba(15, 15, 26, 0.98)',
        border: '1px solid #333',
        borderRadius: 12,
        padding: 20,
        width: 380,
        maxHeight: '70vh',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>✈️ Preflight</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        {errors === 0 && warnings === 0
          ? '✅ Clear for takeoff — no issues.'
          : `${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {issues.map((issue, i) => (
          <div
            key={i}
            onClick={() => issue.nodeId && onSelectNode(issue.nodeId)}
            style={{
              padding: 10,
              background: '#1a1a2e',
              borderRadius: 6,
              borderLeft: `3px solid ${issue.type === 'error' ? '#ef4444' : '#f59e0b'}`,
              cursor: issue.nodeId ? 'pointer' : 'default',
              fontSize: 12
            }}
            title={issue.nodeId ? 'Click to jump to node' : undefined}
          >
            <div style={{ color: '#fff', marginBottom: 2 }}>{issue.message}</div>
            {issue.fix && <div style={{ color: '#888' }}>→ {issue.fix}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
