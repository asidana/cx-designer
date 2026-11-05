/**
 * Normalization tests — the single migration point.
 *
 * Covers the Phase 1 acceptance criteria in docs/STORY_AND_PATTERNS.md §10:
 * all six creation paths normalize, every node resolves a domain type, v1
 * flows migrate silently, the reserved composition fields survive a
 * round-trip, and no module bypasses `domainTypeOf`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Node } from 'reactflow';
import {
  FLOW_SCHEMA_VERSION,
  domainTypeOf,
  normalizeFlow,
  normalizeNode,
  normalizeCanvasNodes,
  unresolvedNodes,
  toCanvasNode,
  CANVAS_RENDERER_TYPE
} from '../src/designer/canvas/domain';
import { FlowEngine } from '../src/designer/engine/flowEngine';
import { flowTemplates } from '../src/designer/templates/FlowTemplates';
import '../src/designer/nodes/index';

// ── The six creation paths, in the shapes they actually produce ─────────

/** 1 & 2. Palette click / drag-drop → App.createNode */
function paletteNode(type: string): Node {
  return {
    id: `${type}_1700000000`,
    type: 'default',
    position: { x: 420, y: 300 },
    style: { borderColor: '#6366f1' },
    data: { label: 'Node', config: {}, type }
  } as Node;
}

/** 3. Templates / adapters → domain type on node.type, nothing in data */
function templateNode(id: string, type: string): Node {
  return {
    id,
    type,
    position: { x: 100, y: 200 },
    data: { label: id, config: {} }
  } as Node;
}

/** 5. Import of a hand-edited / foreign file — domain type in data.type */
function importedNode(id: string, type: string): Node {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { config: { model: 'gpt-4o-mini' }, label: id, type }
  } as Node;
}

describe('domainTypeOf', () => {
  it('reads the canonical v2 field first', () => {
    expect(domainTypeOf({ type: 'default', data: { config: {}, nodeType: 'voice.input', type: 'chat.input' } }))
      .toBe('voice.input');
  });

  it('falls back to the legacy data.type', () => {
    expect(domainTypeOf({ type: 'default', data: { config: {}, type: 'chat.input' } })).toBe('chat.input');
  });

  it('falls back to a domain type in node.type', () => {
    expect(domainTypeOf({ type: 'voice.input', data: { config: {} } })).toBe('voice.input');
  });

  it('returns null rather than guessing', () => {
    expect(domainTypeOf({ type: 'default', data: { config: {} } })).toBeNull();
    expect(domainTypeOf(null)).toBeNull();
    expect(domainTypeOf(undefined)).toBeNull();
  });

  it('does not mistake a renderer key for a domain type', () => {
    for (const renderer of ['default', 'input', 'output', 'group']) {
      expect(domainTypeOf({ type: renderer, data: { config: {} } })).toBeNull();
    }
  });

  it('resolves every node of a real template', () => {
    const flow = flowTemplates[0].flow;
    expect(unresolvedNodes(flow)).toEqual([]);
    expect(flow.nodes.every(n => domainTypeOf(n) !== null)).toBe(true);
  });
});

describe('normalizeFlow — all six creation paths', () => {
  it('1/2. palette click and drag-drop nodes resolve their type', () => {
    const flow = normalizeFlow({
      id: 'f', name: 'n', version: '1.0.0',
      nodes: [paletteNode('voice.input'), paletteNode('agentic.intent_classifier')] as never,
      edges: []
    });
    expect(unresolvedNodes(flow)).toEqual([]);
    expect(flow.nodes[0].type).toBe('voice.input');
    expect(flow.nodes[0].data.nodeType).toBe('voice.input');
  });

  it('3. template nodes keep their domain type and gain the canonical field', () => {
    const flow = normalizeFlow({
      id: 'f', name: 'n', version: '1.0.0',
      nodes: [templateNode('a', 'voice.input'), templateNode('b', 'voice.output')] as never,
      edges: []
    });
    expect(flow.nodes.map(n => n.type)).toEqual(['voice.input', 'voice.output']);
    expect(flow.nodes.every(n => n.data.nodeType === n.type)).toBe(true);
  });

  it('4. adapter nodes (domain type on node.type, custom ids) normalize', () => {
    const flow = normalizeFlow({
      id: 'f', name: 'n', version: '1.0.0',
      nodes: [templateNode('lg_1', 'agentic.langgraph')] as never,
      edges: []
    });
    expect(flow.nodes[0].data.nodeType).toBe('agentic.langgraph');
  });

  it('5. imported nodes (domain type in data.type) migrate', () => {
    const flow = normalizeFlow({
      id: 'f', name: 'n', version: '1.0.0',
      nodes: [importedNode('x', 'integration.http')] as never,
      edges: []
    });
    expect(flow.nodes[0].type).toBe('integration.http');
    expect(flow.nodes[0].data.config).toEqual({ model: 'gpt-4o-mini' });
  });

  it('6. every shipped template normalizes without untyped nodes', () => {
    for (const t of flowTemplates) {
      const flow = normalizeFlow(t.flow);
      expect(unresolvedNodes(flow), `${t.id} has untyped nodes`).toEqual([]);
      expect(flow.flowSchemaVersion).toBe(FLOW_SCHEMA_VERSION);
    }
  });
});

describe('normalizeFlow — engine contract', () => {
  it('a palette-built flow no longer throws "Unknown node type"', async () => {
    // Regression guard for the latent bug: these nodes used to carry
    // type:'default', so FlowEngine.executeNode threw at run time.
    const flow = normalizeFlow({
      id: 'f', name: 'n', version: '1.0.0',
      nodes: [
        paletteNode('chat.input'),
        templateNode('out', 'chat.output')
      ] as never,
      edges: [{ id: 'e1', source: 'chat.input_1700000000', target: 'out' }]
    });
    const engine = new FlowEngine(flow);
    await expect(engine.execute('hello', 's1')).resolves.toBeDefined();
  });

  it('a template-built flow still executes', async () => {
    const flow = normalizeFlow(flowTemplates[0].flow);
    await expect(new FlowEngine(flow).execute('I need help with billing', 's1')).resolves.toBeDefined();
  });

  it('reports an unresolvable node instead of failing as "unknown type"', async () => {
    const flow = normalizeFlow({
      id: 'f', name: 'n', version: '1.0.0',
      nodes: [{ id: 'mystery', type: 'default', position: { x: 0, y: 0 }, data: { config: {} } }] as never,
      edges: []
    });
    expect(unresolvedNodes(flow)).toHaveLength(1);
    // The node is preserved, not silently dropped.
    expect(flow.nodes).toHaveLength(1);
  });
});

describe('normalizeFlow — schema version & migration', () => {
  it('stamps the current version', () => {
    expect(normalizeFlow({ id: 'f' }).flowSchemaVersion).toBe(FLOW_SCHEMA_VERSION);
    expect(normalizeFlow({ id: 'f' }).flowSchemaVersion).toBe(2);
  });

  it('migrates an unstamped v1 flow silently', () => {
    const v1 = {
      id: 'legacy', name: 'Legacy', version: '0.9.0',
      nodes: [templateNode('a', 'voice.input')],
      edges: []
    };
    expect(v1.flowSchemaVersion).toBeUndefined();
    const v2 = normalizeFlow(v1);
    expect(v2.flowSchemaVersion).toBe(2);
    expect(v2.name).toBe('Legacy');
    expect(v2.nodes[0].type).toBe('voice.input');
  });

  it('is idempotent', () => {
    const once = normalizeFlow(flowTemplates[0].flow);
    const twice = normalizeFlow(once);
    expect(twice).toEqual(once);
  });

  it('supplies defaults for a sparse flow', () => {
    const flow = normalizeFlow({ id: 'f' });
    expect(flow.name).toBe('Untitled flow');
    expect(flow.nodes).toEqual([]);
    expect(flow.edges).toEqual([]);
  });
});

describe('reserved composition fields survive a round-trip', () => {
  const reserved = {
    id: 'inst_1',
    type: 'agentic.reasoning_loop' as const,
    position: { x: 10, y: 20 },
    parentId: 'pattern_root',
    extent: 'parent' as const,
    data: {
      config: { model: 'gpt-4o' },
      label: 'RAG with citations',
      story: { title: 'Answer from the KB', summary: 'Looks up the KB and cites it.', role: 'answer' },
      pattern: {
        patternId: 'pattern.rag_with_citations',
        patternVersion: 1,
        params: { topK: 5 },
        summary: 'Retrieve, ground, and answer with citations.',
        expanded: true
      }
    }
  };

  it('preserves story, pattern, parentId and extent', () => {
    const node = normalizeNode(reserved);
    expect(node.parentId).toBe('pattern_root');
    expect(node.extent).toBe('parent');
    expect(node.data.story).toEqual(reserved.data.story);
    expect(node.data.pattern).toEqual(reserved.data.pattern);
  });

  it('survives save → load → save with no drift', () => {
    const saved = normalizeFlow({ id: 'f', name: 'n', version: '1.0.0', nodes: [reserved] as never, edges: [] });
    // …persisted, reloaded from JSON…
    const reloaded = JSON.parse(JSON.stringify(saved)) as typeof saved;
    const resaved = normalizeFlow(reloaded);
    expect(resaved).toEqual(saved);
    expect(resaved.nodes[0].data.story?.role).toBe('answer');
    expect(resaved.nodes[0].data.pattern?.patternId).toBe('pattern.rag_with_citations');
    expect(resaved.nodes[0].parentId).toBe('pattern_root');
  });

  it('stamps nodeType on a reserved node without disturbing the reserved fields', () => {
    const node = normalizeNode(reserved);
    expect(node.data.nodeType).toBe('agentic.reasoning_loop');
    expect(node.position).toEqual({ x: 10, y: 20 });
  });
});

describe('canvas projection', () => {
  it('normalizeCanvasNodes keeps a renderer key the canvas can draw', () => {
    const [node] = normalizeCanvasNodes([paletteNode('voice.input'), templateNode('t', 'chat.output')]);
    expect(node.type).toBe(CANVAS_RENDERER_TYPE);
    expect(node.data.nodeType).toBe('voice.input');
  });

  it('toCanvasNode can apply a renderer key without touching data', () => {
    const node = normalizeNode(templateNode('t', 'chat.output'));
    const canvas = toCanvasNode(node, 'default');
    expect(canvas.type).toBe('default');
    expect(canvas.data.nodeType).toBe('chat.output');
    // The domain type is never lost when the renderer key changes.
    expect(domainTypeOf(canvas)).toBe('chat.output');
  });

  it('strips the ephemeral status field so it never persists', () => {
    const node = normalizeNode({
      ...templateNode('t', 'chat.output'),
      data: { config: {}, label: 't', cxStatus: 'running' }
    });
    expect((node.data as Record<string, unknown>).cxStatus).toBeUndefined();
  });

  it('preserves node position through normalization', () => {
    expect(normalizeNode(paletteNode('voice.input')).position).toEqual({ x: 420, y: 300 });
  });
});

describe('single source of truth', () => {
  // §10 criterion 5: domainTypeOf is the only way a module resolves a type.
  // This is a structural test, so a new direct read fails the build rather
  // than quietly reintroducing the two-truths bug.
  it('no module reads node.data.type outside the normalizer', () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) {
          const src = readFileSync(full, 'utf8');
          if (/\bdata\??\.type\b/.test(src)) offenders.push(full);
        }
      }
    };
    walk(join(process.cwd(), 'src'));

    // The normalizer is the single place allowed to read the legacy field.
    const NORMALIZER = join('src', 'designer', 'canvas', 'domain.ts');
    const strays = offenders.filter(o => !o.endsWith(NORMALIZER));
    expect(strays, `read data.type directly: ${strays.join(', ')}`).toEqual([]);
    expect(offenders.length).toBeGreaterThan(0); // the normalizer itself is exempt
  });
});