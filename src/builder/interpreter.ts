/**
 * Builder interpreter — plain-text instructions → canvas operations.
 *
 * Rule-based and deterministic (no LLM needed): matches node types from
 * the registry, node refs by label, and config fields from each node's
 * schema. The chat component executes the returned ops against App state.
 */

import type { Node, Edge } from 'reactflow';
import { nodeRegistry } from '../nodes/registry';
import { FlowGenerator } from '../ai/FlowGenerator';
import type { FlowGraph, NodeType } from '../types/node';

export type BuilderOp =
  | { kind: 'add'; nodeType: NodeType }
  | { kind: 'connect'; from: string; to: string }
  | { kind: 'configure'; nodeId: string; patch: Record<string, unknown> }
  | { kind: 'remove'; nodeId: string }
  | { kind: 'replace'; flow: FlowGraph }
  | { kind: 'clear' };

export interface BuilderPlan {
  reply: string;
  ops: BuilderOp[];
}

export interface BuilderContext {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
}

const norm = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function findNodes(nodes: Node[], ref: string): Node[] {
  const q = norm(ref);
  if (q.length === 0) return [];
  const byId = nodes.filter(n => n.id === ref.trim());
  if (byId.length > 0) return byId;
  return nodes.filter(n => {
    const label = norm(String(n.data?.label || ''));
    const type = norm(String(n.data?.type || ''));
    return label.includes(q) || q.includes(label) || type.includes(q.replace(/ /g, '.'));
  });
}

function matchNodeType(phrase: string): NodeType | null {
  const q = norm(phrase);
  let best: { type: NodeType; score: number } | null = null;
  for (const def of nodeRegistry.getAll()) {
    const label = norm(def.label);
    const type = norm(def.type);
    let score = 0;
    if (label === q || type === q.replace(/ /g, '.')) score = 100;
    else if (label.includes(q) || q.includes(label)) score = 50 + q.length;
    else {
      const words = q.split(' ').filter(w => w.length > 2);
      const hits = words.filter(w => label.includes(w) || def.description.toLowerCase().includes(w));
      if (hits.length > 0) score = hits.length * 10;
    }
    if (score > 0 && (!best || score > best.score)) best = { type: def.type, score };
  }
  return best && best.score >= 20 ? best.type : null;
}

function matchConfigField(
  type: NodeType,
  phrase: string
): { name: string; fieldType: string } | null {
  const def = nodeRegistry.get(type);
  if (!def) return null;
  const q = norm(phrase).replace(/ /g, '');
  const candidates = def.configSchema.map(f => ({
    name: f.name,
    fieldType: f.type,
    keys: [norm(f.name).replace(/ /g, ''), norm(f.label).replace(/ /g, '')]
  }));
  const exact = candidates.find(c => c.keys.includes(q));
  if (exact) return { name: exact.name, fieldType: exact.fieldType };
  const partial = candidates.filter(c => c.keys.some(k => k.includes(q) || q.includes(k)));
  if (partial.length === 1) return { name: partial[0].name, fieldType: partial[0].fieldType };
  return null;
}

function parseValue(raw: string, fieldType: string): unknown {
  const v = raw.trim().replace(/^["']|["']$/g, '');
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  if (fieldType === 'number') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : v;
  }
  if (fieldType === 'json') {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  const n = parseFloat(v);
  if (fieldType !== 'string' && v !== '' && Number.isFinite(n) && String(n) === v) return n;
  return v;
}

function describeFlow(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) return 'The canvas is empty. Ask me to build something, e.g. "build a billing voice bot".';
  const kinds: Record<string, number> = {};
  for (const n of nodes) {
    const t = String(n.data?.type || 'unknown');
    kinds[t] = (kinds[t] || 0) + 1;
  }
  const lines = Object.entries(kinds).map(([t, c]) => `• ${t} × ${c}`);
  return `This flow has ${nodes.length} node(s) and ${edges.length} connection(s):\n${lines.join('\n')}`;
}

const HELP_TEXT =
  'I can: build a flow ("build a billing voice bot"), add nodes ("add an intent classifier"), ' +
  'connect them ("connect voice input to intent"), configure ("set model to gpt-4o-mini on reasoning"), ' +
  'remove ("remove the guardrail"), describe ("what is this flow?"), or clear the canvas ("start over").';

export async function interpret(text: string, ctx: BuilderContext): Promise<BuilderPlan> {
  const raw = text.trim();
  const t = norm(raw);
  const { nodes } = ctx;
  const noOps = (reply: string): BuilderPlan => ({ reply, ops: [] });

  if (t.length === 0) return noOps('Tell me what to build or change — e.g. "add a guardrail".');

  // Clear canvas
  if (/^(clear|reset|start over|empty the canvas)/.test(t)) {
    if (nodes.length === 0) return noOps('The canvas is already empty.');
    return { reply: 'Cleared the canvas. What should we build?', ops: [{ kind: 'clear' }] };
  }

  // Help / capabilities
  if (/^(help|what can you do|commands)$/.test(t)) return noOps(HELP_TEXT);

  // Describe flow
  if (/^(what|describe|explain|summar|show|how).*(flow|canvas|this)|^(describe|explain)/.test(t)) {
    return noOps(describeFlow(nodes, ctx.edges));
  }

  // Remove node
  {
    const m = t.match(/^(remove|delete)\s+(?:the\s+)?(.+)$/);
    if (m) {
      const hits = findNodes(nodes, m[2]);
      if (hits.length === 0) return noOps(`I can't find "${m[2]}" on the canvas.`);
      if (hits.length > 1) {
        return noOps(`"${m[2]}" matches ${hits.length} nodes — be more specific.`);
      }
      const label = String(hits[0].data?.label || hits[0].id);
      return { reply: `Removed ${label}.`, ops: [{ kind: 'remove', nodeId: hits[0].id }] };
    }
  }

  // Connect nodes
  {
    const m = t.match(/^(connect|link|wire|join)\s+(.+?)\s+to\s+(.+)$/);
    if (m) {
      const from = findNodes(nodes, m[2]);
      const to = findNodes(nodes, m[3]);
      if (from.length === 0) return noOps(`I can't find "${m[2]}" on the canvas.`);
      if (to.length === 0) return noOps(`I can't find "${m[3]}" on the canvas.`);
      if (from.length > 1 || to.length > 1) {
        return noOps('That matches more than one node — name them more precisely.');
      }
      if (from[0].id === to[0].id) return noOps("A node can't connect to itself.");
      const already = ctx.edges.some(e => e.source === from[0].id && e.target === to[0].id);
      if (already) return noOps('Those two are already connected.');
      return {
        reply: `Connected ${from[0].data?.label} → ${to[0].data?.label}.`,
        ops: [{ kind: 'connect', from: from[0].id, to: to[0].id }]
      };
    }
  }

  // Configure: "set X to Y [on Z]" / "change X to Y [on Z]" / "update ..."
  // NOTE: matched against raw text (not normalized) so values keep
  // hyphens and case ("gpt-4o-mini"); field/node lookup normalizes.
  {
    const m = raw.match(/^(set|change|update)\s+(.+?)\s+(to|=|as)\s+(.+)$/i);
    if (m) {
      const fieldPhrase = m[2];
      const valueRaw = m[4];
      // Optional trailing "on <node>"
      const onMatch = valueRaw.match(/^(.+?)\s+on\s+(.+)$/);
      const value = onMatch ? onMatch[1] : valueRaw;
      const nodeRef = onMatch ? onMatch[2] : null;

      let targets = nodeRef
        ? findNodes(nodes, nodeRef)
        : ctx.selectedNodeId
          ? nodes.filter(n => n.id === ctx.selectedNodeId)
          : nodes;
      // Keep only nodes whose schema actually has the field
      const withField = targets.filter(n =>
        matchConfigField(n.data?.type as NodeType, fieldPhrase)
      );
      if (withField.length === 0) {
        return noOps(
          nodeRef
            ? `No "${fieldPhrase}" setting on anything matching "${nodeRef}".`
            : `Nothing on the canvas has a "${fieldPhrase}" setting. Select a node or name it ("... on intent").`
        );
      }
      if (withField.length > 1) {
        return noOps(
          `"${fieldPhrase}" exists on ${withField.length} nodes — say which one ("... on intent").`
        );
      }
      const target = withField[0];
      const field = matchConfigField(target.data?.type as NodeType, fieldPhrase)!;
      const patch = { [field.name]: parseValue(value, field.fieldType) };
      const label = String(target.data?.label || target.id);
      return {
        reply: `Set ${field.name} to ${JSON.stringify(patch[field.name])} on ${label}.`,
        ops: [{ kind: 'configure', nodeId: target.id, patch }]
      };
    }
  }

  // Build / generate a full flow
  if (/^(build|create|make|generate|scaffold|start)\b/.test(t)) {
    try {
      const result = await FlowGenerator.generate({ description: raw });
      return {
        reply: `Built it: ${result.explanation} ${result.suggestions.slice(0, 2).join(' ')}`.trim(),
        ops: [{ kind: 'replace', flow: result.flow }]
      };
    } catch {
      return noOps('I could not generate that flow. Try describing the use case differently.');
    }
  }

  // Add node (explicit or bare-noun)
  {
    const m = t.match(/^(add|insert|put|place)\s+(?:an?\s+|the\s+)?(.+)$/);
    const phrase = m ? m[2] : t;
    // Don't treat connect/remove/etc leftovers as adds
    const type = matchNodeType(phrase);
    if (type) {
      const def = nodeRegistry.get(type)!;
      return {
        reply: m
          ? `Added ${def.label} — select it to configure.`
          : `That sounds like a ${def.label} — added it. Say more to refine.`,
        ops: [{ kind: 'add', nodeType: type }]
      };
    }
  }

  return noOps(
    `I didn't get that. ${HELP_TEXT}`
  );
}
