/**
 * Canvas domain layer — the single place a node's type is resolved.
 *
 * There is exactly one migration entry point, `normalizeFlow()`, and exactly
 * one way to ask "what kind of node is this?", `domainTypeOf()`. Everything
 * else reads through those two, which is what stops the graph from drifting
 * into two parallel truths (see docs/CANVAS.md §7, docs/STORY_AND_PATTERNS.md §7).
 *
 * Why this exists: five creation paths disagreed on where the domain type
 * lived. Palette-created nodes carried `type: 'default'` + `data.type`, so the
 * engine threw `Unknown node type: default`; template nodes carried the domain
 * type in `node.type` with nothing in `data.type`, so the config form,
 * preflight and script view treated them as untyped.
 *
 * Schema v2 shape (the target of every migration):
 *   - `node.type`      — the domain type (serialized graph + engine contract)
 *   - `node.data.nodeType` — canonical domain type on renderer nodes
 *   - `node.data.type` — legacy, read during migration, never written
 */

import type { FlowEdge, FlowGraph, FlowNode, NodeData, NodeType } from '../types/node';

/** Current schema version. v1 is today's implicit shape. */
export const FLOW_SCHEMA_VERSION = 2;

/** React Flow renderer key for domain nodes. Phase 2 registers a `cx` card. */
export const CANVAS_RENDERER_TYPE = 'cx';

/**
 * The renderer key canvas nodes carry. The custom `cx` card is registered in
 * src/canvas/nodeTypes.ts and mounted on the ReactFlow instance.
 */
export const CURRENT_RENDERER_TYPE = 'cx';

/** Renderer keys that carry no domain meaning. */
const NON_DOMAIN_RENDERER = new Set(['default', 'input', 'output', 'group', 'cx']);

/**
 * Presentation-only fields that must never persist. Stripped by the
 * normalizer so a render-time status can never leak into a saved flow.
 */
const EPHEMERAL_DATA_KEYS = ['cxStatus'] as const;

/** The loosest node shape we accept — canvas or serialized, v1 or v2. */
export interface TypedNodeLike {
  id?: string;
  type?: string;
  parentId?: string;
  /** React Flow allows 'parent' or a bounds object; only 'parent' is meaningful here. */
  extent?: unknown;
  position?: { x: number; y: number };
  data?: NodeData & { type?: string; nodeType?: string };
}

/**
 * Resolve a node's domain type, wherever it happens to live.
 *
 * Order: canonical `data.nodeType` → legacy `data.type` → `node.type` when it
 * is a real domain type. Returns null when the node is genuinely untyped
 * rather than guessing, so callers can report it instead of failing late.
 */
export function domainTypeOf(node: TypedNodeLike | null | undefined): NodeType | null {
  if (!node) return null;
  const data = (node.data ?? {}) as NodeData & { type?: string; nodeType?: string };

  const canonical = data.nodeType;
  if (canonical) return canonical as NodeType;

  const legacy = data.type;
  if (legacy) return legacy as NodeType;

  const renderer = node.type;
  if (renderer && !NON_DOMAIN_RENDERER.has(renderer)) return renderer as NodeType;

  return null;
}

/** True when the node resolves to a domain type at all. */
export function hasDomainType(node: TypedNodeLike | null | undefined): boolean {
  return domainTypeOf(node) !== null;
}

/**
 * Normalize a single node to schema v2, preserving the fields reserved for
 * Story view and patterns (`story`, `pattern`, `parentId`, `extent`) untouched.
 *
 * A node with no resolvable domain type is preserved as-is rather than dropped
 * — losing a node during migration is far worse than surfacing an untyped one.
 */
export function normalizeNode(input: TypedNodeLike): FlowNode {
  const domainType = domainTypeOf(input);
  // Drop the legacy field so nothing new writes to it and save → load → save
  // is stable; everything else on `data` (including the reserved
  // `story` / `pattern`) is carried through untouched.
  const { type: _legacyDataType, ...data } = (input.data ?? {}) as NodeData & { type?: string };

  const nextData = { ...data } as NodeData & Record<string, unknown>;
  nextData.config = data.config ?? {};
  for (const key of EPHEMERAL_DATA_KEYS) delete nextData[key];
  // Stamp the canonical field; drop the legacy one so save → load → save is
  // stable and nothing new ever writes to it.
  if (domainType) {
    nextData.nodeType = domainType;
  } else {
    delete nextData.nodeType;
  }

  const position = input.position;
  const node: FlowNode = {
    id: input.id ?? '',
    // Serialized graphs keep the *domain* type on `type`; the renderer key is
    // applied by toCanvasNodes() when handing the graph to React Flow.
    type: (domainType ?? (input.type as NodeType) ?? 'default') as NodeType,
    position: position ? { x: position.x, y: position.y } : { x: 0, y: 0 },
    data: nextData
  };

  if (input.parentId) node.parentId = input.parentId;
  if (input.extent === 'parent') node.extent = 'parent';
  return node;
}

/**
 * Normalize an edge without altering its routing semantics.
 * `id` is derived when absent so history/export never key on undefined.
 */
export function normalizeEdge(input: Partial<FlowEdge> & { source: string; target: string }): FlowEdge {
  return {
    id: input.id ?? `e_${input.source}_${input.target}`,
    source: input.source,
    target: input.target,
    ...(input.sourceHandle !== undefined ? { sourceHandle: input.sourceHandle } : {}),
    ...(input.targetHandle !== undefined ? { targetHandle: input.targetHandle } : {}),
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.animated !== undefined ? { animated: input.animated } : {})
  };
}

/**
 * THE migration entry point. Call on every ingress: import, template/pattern
 * load, AI-generated flow, framework adapter, version restore, history
 * restore, autosave rehydrate.
 *
 * Idempotent — normalizing an already-v2 graph returns an equivalent graph,
 * which is what keeps save → load → save round-trips lossless.
 */
export function normalizeFlow(input: Partial<FlowGraph> & { id: string }): FlowGraph {
  const nodes = Array.isArray(input.nodes) ? input.nodes.map(normalizeNode) : [];
  const edges = Array.isArray(input.edges)
    ? input.edges.map(e => normalizeEdge(e as Partial<FlowEdge> & { source: string; target: string }))
    : [];

  return {
    id: input.id,
    name: input.name ?? 'Untitled flow',
    version: input.version ?? '1.0.0',
    nodes,
    edges,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    flowSchemaVersion: FLOW_SCHEMA_VERSION
  };
}

/**
 * Projection from the serialized graph to the canvas: applies a React Flow
 * renderer key and keeps the position the canvas already holds.
 *
 * Deliberately separate from `normalizeFlow()` — a renderer key is a
 * presentation concern and must never reach a saved flow or a YAML export.
 * Defaults to the current renderer; Phase 2 flips this to
 * `CANVAS_RENDERER_TYPE` when the custom node card is registered.
 */
export function toCanvasNode<T extends FlowNode>(
  node: T,
  rendererType: string = CURRENT_RENDERER_TYPE
): T & { type: string } {
  return {
    ...node,
    type: rendererType,
    position: node.position ?? { x: 0, y: 0 }
  } as T & { type: string };
}

export function toCanvasNodes<T extends FlowNode>(
  nodes: T[],
  rendererType?: string
): Array<T & { type: string }> {
  return nodes.map(n => toCanvasNode(n, rendererType));
}

/**
 * Normalize a set of canvas nodes and hand them back in canvas shape — the
 * ingress funnel for import, template load, version restore and history
 * restore. Nodes keep their renderer key; the domain type moves to
 * `data.nodeType` where every consumer expects to find it.
 */
export function normalizeCanvasNodes(nodes: TypedNodeLike[]): Array<FlowNode & { type: string }> {
  return toCanvasNodes(nodes.map(normalizeNode));
}

/**
 * Diagnostics for preflight: nodes whose type cannot be resolved. Reported,
 * never silently repaired — an untyped node is a real authoring mistake.
 */
export function unresolvedNodes(flow: Pick<FlowGraph, 'nodes'>): FlowNode[] {
  return flow.nodes.filter(n => !hasDomainType(n));
}