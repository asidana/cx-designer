/**
 * Canvas node status — the status ring's states and the one place they're
 * resolved.
 *
 * A status is *presentation only*: it is derived at render time from the
 * trace, the version diff and preflight, then dropped by the normalizer so it
 * can never reach a saved flow. The card reads `data.cxStatus`; nothing else
 * should.
 */

import type { Node } from 'reactflow';
import type { NodeType } from '../types/node';
import { domainTypeOf } from './domain';
import { nodeSummary, nodeTitle } from './summary';
import type { DefinitionLookup, SummarizableNode } from './summary';

export type CanvasNodeStatus =
  | 'idle'
  | 'selected'
  | 'running'
  | 'success'
  | 'error'
  | 'warning'
  | 'diff-added'
  | 'diff-modified';

export const CANVAS_STATUSES: CanvasNodeStatus[] = [
  'idle',
  'selected',
  'running',
  'success',
  'error',
  'warning',
  'diff-added',
  'diff-modified'
];

/**
 * Ring colour per status, as a token reference so the ring is correct in
 * light and dark without the card knowing the theme. `idle` is a plain border.
 */
export const STATUS_TOKEN: Record<CanvasNodeStatus, string> = {
  idle: 'var(--cx-border)',
  selected: 'var(--cx-accent)',
  running: 'var(--cx-focus)',
  success: 'var(--cx-success)',
  error: 'var(--cx-danger)',
  warning: 'var(--cx-warn)',
  'diff-added': 'var(--cx-success)',
  'diff-modified': 'var(--cx-warn)'
};

/** Human phrasing for the screen-reader label. */
const STATUS_PHRASE: Record<CanvasNodeStatus, string> = {
  idle: '',
  selected: 'Selected.',
  running: 'Running now.',
  success: 'Last run succeeded.',
  error: 'Has errors.',
  warning: 'Has warnings.',
  'diff-added': 'Added in this comparison.',
  'diff-modified': 'Changed in this comparison.'
};

export interface NodeStatusSources {
  /** Node currently executing (live trace). */
  activeNodeId?: string | null;
  /** A version diff being previewed. */
  diff?: { added?: string[]; modified?: Array<{ nodeId: string }> } | null;
  /** Preflight severity per node id. */
  severity?: Map<string, 'error' | 'warning'>;
}

/**
 * Resolve one node's status. Precedence, highest first:
 *   explicit run status → live trace → diff → preflight → idle.
 * Selection is a React Flow prop, not derived here — the card layers it on.
 */
export function statusForNode(node: Pick<Node, 'id' | 'data'>, sources: NodeStatusSources = {}): CanvasNodeStatus {
  const explicit = (node.data as { cxStatus?: CanvasNodeStatus } | undefined)?.cxStatus;
  if (explicit && explicit !== 'idle') return explicit;

  if (sources.activeNodeId && node.id === sources.activeNodeId) return 'running';

  if (sources.diff?.added?.includes(node.id)) return 'diff-added';
  if (sources.diff?.modified?.some(m => m.nodeId === node.id)) return 'diff-modified';

  const severity = sources.severity?.get(node.id);
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';

  return 'idle';
}

/**
 * The accessible name for a node. React Flow puts this on the focusable
 * wrapper (role="button"), so a screen-reader user hears the whole node —
 * kind, ports, settings and status — without seeing it.
 */
export function ariaLabelForNode(node: SummarizableNode & { type?: string }, def?: ReturnType<DefinitionLookup>): string {
  const title = nodeTitle(node, def);
  if (!def) {
    return `${title}. Unrecognised node type.`;
  }
  const list = (handles: typeof def.inputs): string =>
    handles.length ? handles.map(h => `${h.label} ${h.type}`).join(', ') : 'none';

  const settings = def.configSchema.length;
  const summary = nodeSummary(node, def);
  const parts = [
    `${title}.`,
    `${def.category} node.`,
    `Inputs: ${list(def.inputs)}.`,
    `Outputs: ${list(def.outputs)}.`,
    `${settings} setting${settings === 1 ? '' : 's'}.`,
    `${summary}.`
  ];
  return parts.join(' ');
}

/** Status phrase for a node's accessible label (empty for idle). */
export function statusPhrase(status: CanvasNodeStatus): string {
  return STATUS_PHRASE[status];
}

/**
 * Project status + accessible name onto the canvas nodes. Pure: returns new
 * node objects and never mutates the caller's state. Replaces the old
 * box-shadow overlays, which encoded status in colour on `style` only.
 */
export function applyNodePresentation(
  nodes: Node[],
  sources: NodeStatusSources,
  lookup?: DefinitionLookup
): Node[] {
  return nodes.map(node => {
    const status = statusForNode(node, sources);
    const data = { ...(node.data ?? {}) } as Record<string, unknown>;
    data.cxStatus = status;

    const def = lookup ? lookup(domainTypeOf(node) as NodeType) : undefined;
    const label = [
      ariaLabelForNode(node as SummarizableNode, def),
      STATUS_PHRASE[status]
    ]
      .filter(Boolean)
      .join(' ');

    // Drop any legacy overlay so status reads from the ring, not a glow.
    const { boxShadow: _drop, ...style } = (node.style ?? {}) as Record<string, unknown>;

    return { ...node, data, ariaLabel: label, style } as Node;
  });
}
