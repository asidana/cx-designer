/**
 * Pattern expansion — the composition model of STORY_AND_PATTERNS.md §5.
 *
 * A *pattern instance* is a container node (`data.pattern` set) whose children
 * are ordinary nodes carrying `parentId === instance.id`. Authoring keeps the
 * composition; everything that runs or exports works on the **flat** graph.
 *
 *   compose (authoring)  ──expandPatterns()──▶  flat (engine / export)
 *      instance + children                        children only, re-ided
 *
 * `expandPatterns()` is pure: it never mutates its input and is idempotent. The
 * engine calls it once before running (see `FlowEngine`), so execution stays
 * pattern-agnostic and deterministic — the hard rule of §5.
 *
 * Boundary handles: when the pattern declares a `boundary` on `data.pattern`
 * (§5/§9), external edges rewire to the named entry child and to the child that
 * produces each output handle. Without a declared boundary we fall back to child
 * topology (entries = no internal incoming; exits = no internal outgoing; a
 * closed loop falls back to the first child) — a placeholder, not a contract.
 *
 * Params: the instance's `params` are the one clean form (§6). Declared
 * `bindings` map each param onto a child's config, so the composed subgraph runs
 * with the configured values instead of the template defaults.
 */

import type { FlowEdge, FlowGraph, FlowNode, PatternBinding } from '../types/node';

/** True when the node is a pattern-instance container. */
export function isPatternInstance(node: FlowNode | { data?: { pattern?: unknown } } | null | undefined): boolean {
  return Boolean(node && node.data && node.data.pattern);
}

/** Children of an instance in the current node set (never `undefined`). */
export function childrenOf(instanceId: string, nodes: FlowNode[]): FlowNode[] {
  return nodes.filter(n => n.parentId === instanceId);
}

/** Expanded id for a hoisted child: `${instance.id}/${child.id}`. */
export function childIdFor(instanceId: string, childId: string): string {
  return `${instanceId}/${childId}`;
}

/**
 * Depth of a node's containment chain (0 = top level). Guards against a
 * malformed `parentId` cycle by capping the walk.
 */
function depthOf(node: FlowNode, byId: Map<string, FlowNode>): number {
  let depth = 0;
  let current = node.parentId ? byId.get(node.parentId) : undefined;
  while (current && depth < 64) {
    depth += 1;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return depth;
}

/**
 * Re-id a hoisted child and re-parent it to the container's own parent, so a
 * nested pattern keeps its level while a top-level instance lands at the top.
 */
function hoist(child: FlowNode, instance: FlowNode): FlowNode {
  // Shallow-clone (never mutate input); containment is set explicitly below.
  const { parentId: _parentId, extent: _extent, ...rest } = child;
  const next: FlowNode = { ...rest, id: childIdFor(instance.id, child.id) };
  if (instance.parentId) {
    next.parentId = instance.parentId;
    if (child.extent) next.extent = child.extent;
  }
  return next;
}

/**
 * Apply an instance's params onto its children's configs, per the declared
 * bindings (Story & Patterns §5/§6). Pure: returns new child nodes. Params with
 * no binding, bindings that name an unknown child, and `undefined` values are
 * ignored; a dotted `config` path writes into a nested object
 * (`loopDetector.maxSameToolCalls`).
 */
export function applyPatternParams(
  children: FlowNode[],
  params: Record<string, unknown>,
  bindings: PatternBinding[] | undefined
): FlowNode[] {
  if (!bindings || bindings.length === 0) return children;

  const byId = new Map(children.map(c => [c.id, c]));
  const bound = new Map<string, FlowNode>();
  for (const binding of bindings) {
    const value = params[binding.param];
    if (value === undefined) continue;
    const child = byId.get(binding.node);
    if (!child) continue;
    // Chain onto any earlier binding for the same child (clone at most once).
    bound.set(child.id, withConfigValue(bound.get(child.id) ?? child, binding.config, value));
  }
  return bound.size === 0 ? children : children.map(c => bound.get(c.id) ?? c);
}

/** Immutably set a (possibly dotted) config key on a node. */
function withConfigValue(node: FlowNode, path: string, value: unknown): FlowNode {
  return { ...node, data: { ...node.data, config: setPath(node.data.config ?? {}, path, value) } };
}

/** Immutably set `path` (dot-separated) to `value`, cloning each level. */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.');
  return {
    ...obj,
    [head]: rest.length
      ? setPath((obj[head] as Record<string, unknown> | undefined) ?? {}, rest.join('.'), value)
      : value
  };
}

/** The container's resolved boundary: prefixed entry ids and per-handle exits. */
interface ResolvedBoundary {
  entries: string[];
  exitsFor: (sourceHandle?: string) => string[];
}

/**
 * Resolve the container boundary. A **declared** boundary (`data.pattern.
 * boundary`, §5/§9) wins when it names real children; otherwise fall back to
 * child topology — a placeholder, not a contract.
 */
function resolveBoundary(
  instance: FlowNode,
  children: FlowNode[],
  rename: Map<string, string>,
  edges: FlowEdge[]
): ResolvedBoundary {
  const declared = instance.data.pattern?.boundary;
  if (declared) {
    const entry = rename.get(declared.entry);
    const exits = Object.entries(declared.exits ?? {})
      .map(([handle, childId]) => [handle, rename.get(childId)] as const)
      .filter((pair): pair is [string, string] => Boolean(pair[1]));
    if (entry && exits.length) {
      const byHandle = new Map(exits);
      const fallback = byHandle.get('*') ?? byHandle.get('response') ?? exits[0][1];
      return {
        entries: [entry],
        exitsFor: sourceHandle => [(sourceHandle && byHandle.get(sourceHandle)) || fallback]
      };
    }
  }

  // Inferred: which children are internally linked tells us the true edges.
  const internal = edges.filter(e => rename.has(e.source) && rename.has(e.target));
  const hasInternalIncoming = new Set(internal.map(e => e.target));
  const hasInternalOutgoing = new Set(internal.map(e => e.source));
  const entries = children.filter(c => !hasInternalIncoming.has(c.id));
  const exits = children.filter(c => !hasInternalOutgoing.has(c.id));
  // A closed/loop child set has no natural boundary → fall back to the first.
  return {
    entries: (entries.length ? entries : [children[0]]).map(c => rename.get(c.id)!),
    exitsFor: () => (exits.length ? exits : [children[0]]).map(c => rename.get(c.id)!)
  };
}

/**
 * Expand exactly one instance into its children. Returns new nodes/edges
 * arrays (the caller owns the originals). No-op when the instance has no
 * materialised children yet (a params-only instance cannot be flattened).
 */
function expandInstance(
  instance: FlowNode,
  nodes: FlowNode[],
  edges: FlowEdge[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const children = childrenOf(instance.id, nodes);
  if (children.length === 0) return { nodes, edges };

  const rename = new Map(children.map(c => [c.id, childIdFor(instance.id, c.id)]));
  // Param → child-config binding: the instance's params override the template's
  // child defaults, so the flattened subgraph runs the configured values.
  const pattern = instance.data.pattern;
  const bound = applyPatternParams(children, pattern?.params ?? {}, pattern?.bindings);
  const boundById = new Map(bound.map(c => [c.id, c]));
  const nextNodes = nodes
    .filter(n => n.id !== instance.id)
    .map(n => (n.parentId === instance.id ? hoist(boundById.get(n.id) ?? n, instance) : n));

  const boundary = resolveBoundary(instance, children, rename, edges);

  const nextEdges: FlowEdge[] = [];
  for (const edge of edges) {
    // Internal edge: both ends are children → re-id both.
    if (rename.has(edge.source) && rename.has(edge.target)) {
      nextEdges.push({ ...edge, source: rename.get(edge.source)!, target: rename.get(edge.target)! });
      continue;
    }
    // Inbound to the instance → the boundary entry.
    if (edge.target === instance.id) {
      for (const target of boundary.entries) {
        nextEdges.push({ ...edge, id: `${edge.id}~${target}`, target });
      }
      continue;
    }
    // Outbound from the instance → the child bound to that output handle.
    if (edge.source === instance.id) {
      for (const source of boundary.exitsFor(edge.sourceHandle)) {
        nextEdges.push({ ...edge, id: `${edge.id}~${source}`, source });
      }
      continue;
    }
    nextEdges.push(edge);
  }

  return { nodes: nextNodes, edges: nextEdges };
}

/**
 * Flatten every pattern instance into ordinary nodes. Pure and idempotent;
 * expands nested patterns deepest-first so children are hoisted level by level.
 */
export function expandPatterns(flow: FlowGraph): FlowGraph {
  let nodes = flow.nodes;
  let edges = flow.edges;
  let guard = 0;

  // Deepest-first keeps child re-ids stable while nesting is unwound.
  while (guard++ < 256) {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const expandable = nodes
      .filter(n => isPatternInstance(n) && childrenOf(n.id, nodes).length > 0)
      .sort((a, b) => depthOf(b, byId) - depthOf(a, byId));
    if (expandable.length === 0) break;
    ({ nodes, edges } = expandInstance(expandable[0], nodes, edges));
  }

  return { ...flow, nodes, edges };
}

/** True when any node is still an unexpanded pattern instance with children. */
export function hasPatterns(flow: Pick<FlowGraph, 'nodes'>): boolean {
  return flow.nodes.some(n => isPatternInstance(n) && childrenOf(n.id, flow.nodes).length > 0);
}
