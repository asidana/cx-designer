/**
 * Pattern instantiation — turn a catalogue `FlowTemplate` (with a `pattern`
 * descriptor) into a collapsed instance node plus its materialised children.
 *
 * This is the gallery's "instantiate a pattern" seam (STORY_AND_PATTERNS §6).
 * It is pure: it builds new nodes/edges and never mutates the template. The
 * instance carries the whole descriptor (id, version, summary, params, boundary,
 * bindings) so the collapsed card and expansion both have what they need; the
 * children are pre-bound from `params` via `applyPatternParams`, so an expanded
 * container reflects the configured values immediately — and the engine still
 * only ever sees the flattened graph.
 */

import { applyPatternParams } from '../canvas/patterns';
import type { FlowEdge, FlowNode } from '../types/node';
import type { FlowTemplate, PatternTemplate } from './FlowTemplates';

export interface InstantiateOptions {
  /** Id for the instance node; children keep the template's local ids. */
  instanceId: string;
  /** Form values; missing params fall back to the descriptor defaults. */
  params?: Record<string, unknown>;
  /** Instance position on the canvas. */
  position?: { x: number; y: number };
  /** Card title; defaults to the template name. */
  label?: string;
  /** Materialise children as expanded, or keep one collapsed card (default). */
  expanded?: boolean;
}

export interface InstantiatedPattern {
  /** The `control.pattern` container node to place on the canvas. */
  instance: FlowNode;
  /** Children, `parentId` set to the instance, configs bound from `params`. */
  nodes: FlowNode[];
  /** Internal child → child edges (template ids, unchanged). */
  edges: FlowEdge[];
}

/** Param defaults declared on the descriptor, keyed by name. */
export function patternDefaults(pattern: PatternTemplate): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const param of pattern.params) {
    if (param.default !== undefined) defaults[param.name] = param.default;
  }
  return defaults;
}

/**
 * Instantiate `template` as a pattern block. Throws when the template has no
 * `pattern` descriptor (it is then an ordinary template, inserted flat).
 */
export function instantiatePattern(
  template: FlowTemplate,
  options: InstantiateOptions
): InstantiatedPattern {
  const pattern = template.pattern;
  if (!pattern) throw new Error(`Template '${template.id}' is not a pattern`);

  const params = { ...patternDefaults(pattern), ...(options.params ?? {}) };

  const instance: FlowNode = {
    id: options.instanceId,
    type: 'control.pattern',
    position: options.position ?? { x: 0, y: 0 },
    data: {
      config: {},
      label: options.label ?? template.name,
      pattern: {
        patternId: pattern.id,
        patternVersion: pattern.version,
        summary: pattern.summary,
        params,
        boundary: pattern.boundary,
        bindings: pattern.bindings,
        expanded: options.expanded ?? false
      }
    }
  };

  // Detach from the template: clone each child's data/config before binding.
  const placed: FlowNode[] = template.flow.nodes.map(child => ({
    ...child,
    parentId: options.instanceId,
    extent: 'parent',
    data: { ...child.data, config: { ...(child.data.config ?? {}) } }
  }));
  const nodes = applyPatternParams(placed, params, pattern.bindings);

  return { instance, nodes, edges: template.flow.edges.map(edge => ({ ...edge })) };
}
