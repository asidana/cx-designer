/**
 * Node summary — one readable sentence per node, for the card and Story view.
 *
 * Derive by default, allow an override. Never require a user to write prose,
 * never discard it when they do (docs/STORY_AND_PATTERNS.md §2):
 *
 *   summary = story.summary
 *          ?? definition.summarize(config)
 *          ?? derived(config)
 *          ?? definition.description
 */

import type { ConfigSchemaField, NodeConfig, NodeDefinition, NodeType } from '../types/node';

/** The minimal node shape a summary needs. Works for canvas and serialized nodes. */
export interface SummarizableNode {
  id?: string;
  data?: {
    config?: NodeConfig;
    label?: string;
    story?: { title?: string; summary?: string; role?: string };
    /** Present iff the node is a pattern instance (STORY_AND_PATTERNS §5). */
    pattern?: { summary?: string };
  };
}

/** A definition lookup, so this module stays free of a registry import cycle. */
export type DefinitionLookup = (type: NodeType) => NodeDefinition | undefined;

const MAX_VALUE_CHARS = 32;

/** Format a config value compactly and safely (objects, arrays, booleans). */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    return value.length > MAX_VALUE_CHARS ? `${value.slice(0, MAX_VALUE_CHARS - 1)}…` : value;
  }
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length ? `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}` : '{}';
  }
  return String(value);
}

/** True when a config value is worth showing — set, and not empty. */
function isSet(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);
}

/**
 * Which schema fields to show on the card, in schema order: only fields that
 * are actually set. An unconfigured node shows no fields rather than a wall of
 * dashes — the validation state already flags what is missing.
 */
export function summaryFields(
  config: NodeConfig,
  schema: ConfigSchemaField[] | undefined,
  limit = 2
): ConfigSchemaField[] {
  return (schema ?? []).filter(f => isSet(config[f.name])).slice(0, limit);
}

/** The derived fallback: "model: gpt-4o-mini · intents: 6 items". */
export function deriveSummary(
  config: NodeConfig,
  schema: ConfigSchemaField[] | undefined,
  description?: string
): string {
  const fields = summaryFields(config, schema);
  if (fields.length) {
    return fields.map(f => `${f.label ?? f.name}: ${formatValue(config[f.name])}`).join(' · ');
  }
  return description ? description : 'Not configured';
}

/**
 * The summary a card or Story step shows.
 *
 * @param node    the node (may carry a `story.summary` override)
 * @param def     its definition, or undefined when the type is unregistered
 */
export function nodeSummary(node: SummarizableNode, def?: NodeDefinition): string {
  const override = node.data?.story?.summary;
  if (override && override.trim()) return override;

  // A pattern instance collapses to its pattern summary (§3). A Story override
  // still wins above, because it is the more specific human edit.
  const patternSummary = node.data?.pattern?.summary;
  if (patternSummary && patternSummary.trim()) return patternSummary;

  const config = node.data?.config ?? {};
  if (def?.summarize) {
    const rendered = def.summarize({ ...(def.config ?? {}), ...config });
    if (rendered && rendered.trim()) return rendered;
  }
  return deriveSummary(config, def?.configSchema, def?.description);
}

/** The title a card shows: Story override, then instance label, then the definition. */
export function nodeTitle(node: SummarizableNode, def?: NodeDefinition): string {
  const override = node.data?.story?.title;
  if (override && override.trim()) return override;
  const label = node.data?.label;
  if (label && label.trim()) return label;
  return def?.label ?? node.id ?? 'Node';
}

/** The semantic role, if the designer set one (Story view and screen readers). */
export function nodeRole(node: SummarizableNode): string | undefined {
  const role = node.data?.story?.role;
  return role && role.trim() ? role : undefined;
}
