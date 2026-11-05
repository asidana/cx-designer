/**
 * Pattern expansion tests — AX1 composition core (Story & Patterns §5).
 *
 * Authoring composes (instance + children); everything that runs or exports
 * works on the flat graph. `expandPatterns()` is the pure seam between them.
 */

import { describe, it, expect } from 'vitest';
import { expandPatterns, isPatternInstance, hasPatterns, childrenOf, applyPatternParams } from '../src/designer/canvas/patterns';
import { FlowEngine } from '../src/designer/engine/flowEngine';
import { domainTypeOf, normalizeFlow } from '../src/designer/canvas/domain';
import { nodeSummary } from '../src/designer/canvas/summary';
import { nodeRegistry } from '../src/designer/nodes/registry';
import { getTemplate, getPattern } from '../src/designer/templates/FlowTemplates';
import { instantiatePattern } from '../src/designer/templates/instantiate';
import { patternFormSchema } from '../src/designer/templates/patternForm';
import type { FlowGraph, FlowNode, NodeType, PatternBinding, PatternInstance } from '../src/designer/types/node';

function pattern(overrides: Partial<PatternInstance> = {}): PatternInstance {
  return {
    patternId: 'pattern.rag_with_citations',
    patternVersion: 1,
    params: {},
    summary: 'answers with citations',
    expanded: false,
    ...overrides,
  };
}

function node(id: string, type: NodeType, extra: Partial<FlowNode> = {}): FlowNode {
  return { id, type, position: { x: 0, y: 0 }, data: { config: {} }, ...extra };
}

function instance(id: string, extra: Partial<FlowNode> = {}): FlowNode {
  return node(id, 'voice.input', { data: { config: {}, pattern: pattern() }, ...extra });
}

function graph(nodes: FlowNode[], edges: FlowGraph['edges']): FlowGraph {
  return { id: 'g', name: 'G', version: '1.0.0', nodes, edges };
}

/** Normalised arc list for order-independent edge assertions. */
const arcs = (g: FlowGraph) => g.edges.map(e => `${e.source}->${e.target}`).sort();

describe('expandPatterns', () => {
  it('is a no-op for graphs without patterns (same arrays, no copy)', () => {
    const flow = graph(
      [node('a', 'voice.input'), node('b', 'voice.output')],
      [{ id: 'e1', source: 'a', target: 'b' }]
    );
    const result = expandPatterns(flow);
    expect(result).toEqual(flow);
    expect(result.nodes).toBe(flow.nodes);
    expect(result.edges).toBe(flow.edges);
  });

  it('expands an instance into its children and rewires boundary edges', () => {
    const flow = graph(
      [
        node('head', 'voice.input'),
        instance('blk'),
        node('c1', 'agentic.intent_classifier', { parentId: 'blk' }),
        node('c2', 'voice.output', { parentId: 'blk', extent: 'parent' }),
        node('tail', 'voice.output'),
      ],
      [
        { id: 'e1', source: 'head', target: 'blk' },
        { id: 'e2', source: 'blk', target: 'tail' },
        { id: 'e3', source: 'c1', target: 'c2' },
      ]
    );

    const out = expandPatterns(flow);
    expect(out.nodes.map(n => n.id).sort()).toEqual(['blk/c1', 'blk/c2', 'head', 'tail']);
    // Hoisted children detach from the container.
    expect(out.nodes.find(n => n.id === 'blk/c1')?.parentId).toBeUndefined();
    expect(out.nodes.find(n => n.id === 'blk/c2')?.extent).toBeUndefined();
    // entry = c1 (no internal incoming); exit = c2 (no internal outgoing).
    expect(arcs(out)).toEqual(['blk/c1->blk/c2', 'blk/c2->tail', 'head->blk/c1']);
    expect(hasPatterns(out)).toBe(false);
  });

  it('is pure — the input graph is untouched', () => {
    const flow = graph(
      [instance('blk'), node('c1', 'voice.output', { parentId: 'blk' })],
      []
    );
    const snapshot = JSON.parse(JSON.stringify(flow));
    const out = expandPatterns(flow);
    expect(flow).toEqual(snapshot);
    expect(out).not.toBe(flow);
  });

  it('is idempotent', () => {
    const flow = graph(
      [instance('blk'), node('c1', 'voice.output', { parentId: 'blk' })],
      []
    );
    const once = expandPatterns(flow);
    expect(expandPatterns(once)).toEqual(once);
  });

  it('fans out to every entry and exit child', () => {
    const flow = graph(
      [
        node('head', 'voice.input'),
        instance('blk'),
        node('c1', 'voice.output', { parentId: 'blk' }),
        node('c2', 'voice.output', { parentId: 'blk' }),
        node('tail', 'voice.output'),
      ],
      [
        { id: 'e1', source: 'head', target: 'blk' },
        { id: 'e2', source: 'blk', target: 'tail' },
      ]
    );
    expect(arcs(expandPatterns(flow))).toEqual([
      'blk/c1->tail',
      'blk/c2->tail',
      'head->blk/c1',
      'head->blk/c2',
    ]);
  });

  it('falls back to the first child when the child set is a closed loop', () => {
    const flow = graph(
      [
        node('head', 'voice.input'),
        instance('blk'),
        node('c1', 'voice.output', { parentId: 'blk' }),
        node('c2', 'voice.output', { parentId: 'blk' }),
        node('tail', 'voice.output'),
      ],
      [
        { id: 'e1', source: 'head', target: 'blk' },
        { id: 'e2', source: 'blk', target: 'tail' },
        { id: 'e3', source: 'c1', target: 'c2' },
        { id: 'e4', source: 'c2', target: 'c1' },
      ]
    );
    expect(arcs(expandPatterns(flow))).toEqual([
      'blk/c1->blk/c2',
      'blk/c1->tail',
      'blk/c2->blk/c1',
      'head->blk/c1',
    ]);
  });

  it('expands nested patterns, deepest first, keeping levels', () => {
    const flow = graph(
      [
        instance('a'),
        instance('b', { parentId: 'a' }),
        node('c', 'voice.output', { parentId: 'b' }),
        node('tail', 'voice.output'),
      ],
      [{ id: 'e1', source: 'a', target: 'tail' }]
    );

    const out = expandPatterns(flow);
    expect(out.nodes.map(n => n.id).sort()).toEqual(['a/b/c', 'tail']);
    expect(out.nodes.find(n => n.id === 'a/b/c')?.parentId).toBeUndefined();
    expect(arcs(out)).toEqual(['a/b/c->tail']);
  });

  it('leaves a params-only instance (no children) in place', () => {
    const flow = graph([instance('blk'), node('tail', 'voice.output')], [
      { id: 'e1', source: 'blk', target: 'tail' },
    ]);
    expect(expandPatterns(flow)).toEqual(flow);
    expect(hasPatterns(flow)).toBe(false); // nothing to expand
  });

  it('reports instances and their children', () => {
    const blk = instance('blk');
    const flow = graph([blk, node('c1', 'voice.output', { parentId: 'blk' })], []);
    expect(isPatternInstance(blk)).toBe(true);
    expect(isPatternInstance(node('x', 'voice.output'))).toBe(false);
    expect(childrenOf('blk', flow.nodes).map(n => n.id)).toEqual(['c1']);
    expect(hasPatterns(flow)).toBe(true);
  });
});

describe('FlowEngine runs the flattened graph', () => {
  const flow = graph(
    [
      instance('blk'),
      node('c1', 'agentic.intent_classifier', { parentId: 'blk' }),
      node('out', 'voice.output'),
    ],
    [{ id: 'e1', source: 'blk', target: 'out' }]
  );

  it('executes the hoisted child as the entry node', async () => {
    const result = await new FlowEngine(flow).execute('Hello', 's1');
    expect(result.outputs).toBeDefined();
  });

  it('no longer exposes the container id', async () => {
    // The instance was replaced by its children, so "start from here" on the
    // container id must fail — proof the engine stored the flat graph.
    await expect(new FlowEngine(flow).executeFrom('blk', 'Hello', 's1')).rejects.toThrow(
      /Node not found/
    );
  });
});

describe('declared pattern boundary (STORY_AND_PATTERNS §5)', () => {
  const withBoundary = (boundary: PatternInstance['boundary']) =>
    instance('blk', { data: { config: {}, pattern: pattern({ boundary }) } });

  it('wires external edges to the declared boundary, not topology', () => {
    const flow = graph(
      [
        node('head', 'voice.input'),
        withBoundary({ entry: 'c2', exits: { response: 'c3' } }),
        node('c1', 'voice.output', { parentId: 'blk' }),
        node('c2', 'voice.output', { parentId: 'blk' }),
        node('c3', 'voice.output', { parentId: 'blk' }),
        node('tail', 'voice.output'),
      ],
      [
        { id: 'e1', source: 'head', target: 'blk' },
        { id: 'e2', source: 'blk', target: 'tail' },
        { id: 'e3', source: 'c1', target: 'c2' },
        { id: 'e4', source: 'c2', target: 'c3' },
      ]
    );
    // Topology alone would pick c1 in / c3 out; the declared boundary says c2 / c3.
    expect(arcs(expandPatterns(flow))).toEqual([
      'blk/c1->blk/c2',
      'blk/c2->blk/c3',
      'blk/c3->tail',
      'head->blk/c2',
    ]);
  });

  it('routes each output handle to its declared child', () => {
    const flow = graph(
      [
        node('head', 'voice.input'),
        withBoundary({ entry: 'in', exits: { response: 'ok', fallback: 'no' } }),
        node('in', 'voice.output', { parentId: 'blk' }),
        node('ok', 'voice.output', { parentId: 'blk' }),
        node('no', 'voice.output', { parentId: 'blk' }),
        node('rTail', 'voice.output'),
        node('fTail', 'voice.output'),
      ],
      [
        { id: 'e1', source: 'head', target: 'blk' },
        { id: 'e2', source: 'blk', target: 'rTail', sourceHandle: 'response' },
        { id: 'e3', source: 'blk', target: 'fTail', sourceHandle: 'fallback' },
      ]
    );
    expect(arcs(expandPatterns(flow))).toEqual([
      'blk/no->fTail',
      'blk/ok->rTail',
      'head->blk/in',
    ]);
  });

  it('ignores a boundary that names unknown children (topology fallback)', () => {
    const flow = graph(
      [
        node('head', 'voice.input'),
        withBoundary({ entry: 'ghost', exits: { response: 'ghost' } }),
        node('c1', 'voice.output', { parentId: 'blk' }),
        node('c2', 'voice.output', { parentId: 'blk' }),
        node('tail', 'voice.output'),
      ],
      [
        { id: 'e1', source: 'head', target: 'blk' },
        { id: 'e2', source: 'blk', target: 'tail' },
        { id: 'e3', source: 'c1', target: 'c2' },
      ]
    );
    expect(arcs(expandPatterns(flow))).toEqual([
      'blk/c1->blk/c2',
      'blk/c2->tail',
      'head->blk/c1',
    ]);
  });

  it('preserves a declared boundary through normalizeFlow', () => {
    const norm = normalizeFlow({
      id: 'g',
      nodes: [
        {
          id: 'blk',
          type: 'control.pattern',
          position: { x: 0, y: 0 },
          data: { config: {}, pattern: pattern({ boundary: { entry: 'c1', exits: { response: 'c1' } } }) },
        },
      ],
      edges: [],
    });
    expect(norm.nodes[0].data.pattern?.boundary).toEqual({ entry: 'c1', exits: { response: 'c1' } });
  });
});

describe('control.pattern container (E17.1)', () => {
  it('is registered so the container has a resolvable domain type', () => {
    const def = nodeRegistry.get('control.pattern');
    expect(def).toBeDefined();
    expect(def?.category).toBe('control');
    expect(def?.inputs.map(h => h.id)).toEqual(['input']);
    expect(def?.outputs.map(h => h.id)).toEqual(['output']);
  });

  it('resolves via domainTypeOf like any other node', () => {
    expect(domainTypeOf(node('blk', 'control.pattern'))).toBe('control.pattern');
  });

  it('collapses to the pattern summary on the card', () => {
    const summary = nodeSummary(
      { data: { pattern: { summary: 'resolve the dispute' } } },
      nodeRegistry.get('control.pattern')
    );
    expect(summary).toBe('resolve the dispute');
  });

  it('keeps a Story override above the pattern summary', () => {
    const summary = nodeSummary(
      { data: { pattern: { summary: 'resolve the dispute' }, story: { summary: 'custom wording' } } },
      nodeRegistry.get('control.pattern')
    );
    expect(summary).toBe('custom wording');
  });
});

describe('pattern.unified_agent seed (Story & Patterns §6)', () => {
  const tpl = getTemplate('pattern-unified-agent');

  it('is authored as FlowTemplate data with a coherent boundary', () => {
    expect(tpl?.pattern?.id).toBe('pattern.unified_agent');
    expect(tpl?.pattern?.params.map(p => p.name)).toEqual([
      'goal',
      'successCriteria',
      'tools',
      'guardrailRef',
      'fallback',
      'model',
      'maxIterations',
      'costCeiling',
      'deadlineMs',
    ]);

    const ids = new Set(tpl!.flow.nodes.map(n => n.id));
    expect(ids.has(tpl!.pattern!.boundary.entry)).toBe(true);
    for (const child of Object.values(tpl!.pattern!.boundary.exits)) {
      expect(ids.has(child)).toBe(true);
    }
    // Every node type in the seed must be a real, registered node.
    for (const n of tpl!.flow.nodes) {
      expect(nodeRegistry.get(n.type), `${n.id} (${n.type})`).toBeTruthy();
    }
  });

  it('instantiates from its subgraph and expands on its declared boundary', () => {
    const p = tpl!.pattern!;
    const children = tpl!.flow.nodes.map(n => ({ ...n, parentId: 'blk' }));
    const flow = graph(
      [
        node('head', 'voice.input'),
        instance('blk', {
          data: {
            config: {},
            pattern: pattern({
              patternId: p.id,
              patternVersion: p.version,
              summary: p.summary,
              params: { goal: 'resolve the dispute' },
              boundary: p.boundary,
            }),
          },
        }),
        ...children,
        node('tail', 'voice.output'),
        node('tail2', 'voice.output'),
      ],
      [
        { id: 'h', source: 'head', target: 'blk' },
        { id: 'r', source: 'blk', target: 'tail' },
        { id: 'f', source: 'blk', target: 'tail2', sourceHandle: 'fallback' },
        ...tpl!.flow.edges,
      ]
    );

    const out = expandPatterns(flow);
    const ids = out.nodes.map(n => n.id);
    expect(ids).not.toContain('blk');
    expect(ids).toContain('blk/guard_pre');
    expect(ids).toContain('blk/guard_post');

    const arcsOut = arcs(out);
    // Inbound → declared entry; default handle → declared response; fallback handle → fallback.
    expect(arcsOut).toContain('head->blk/guard_pre');
    expect(arcsOut).toContain('blk/guard_post->tail');
    expect(arcsOut).toContain('blk/fallback->tail2');
    // Internal subgraph edges survive, re-idded under the instance prefix.
    expect(arcsOut).toContain('blk/guard_pre->blk/goal_check');
    expect(arcsOut).toContain('blk/goal_check->blk/agent');
  });
});

describe('param → child-config binding (AX1)', () => {
  const bindings: PatternBinding[] = [
    { param: 'goal', node: 'agent', config: 'goal' },
    { param: 'model', node: 'agent', config: 'model' },
    { param: 'maxSame', node: 'agent', config: 'loopDetector.maxSameToolCalls' },
    { param: 'pii', node: 'guard', config: 'builtin.piiRedaction' },
  ];

  it('writes bound params onto the named child configs (dotted paths included)', () => {
    const children = [
      node('agent', 'agentic.reasoning_loop', { data: { config: { model: 'gpt-4o' } } }),
      node('guard', 'governance.guardrail'),
    ];
    const out = applyPatternParams(children, { goal: 'resolve', maxSame: 5, pii: false }, bindings);
    expect(out.find(n => n.id === 'agent')?.data.config).toEqual({
      model: 'gpt-4o',
      goal: 'resolve',
      loopDetector: { maxSameToolCalls: 5 },
    });
    expect(out.find(n => n.id === 'guard')?.data.config).toEqual({ builtin: { piiRedaction: false } });
  });

  it('is pure — the input children are untouched', () => {
    const children = [node('agent', 'agentic.reasoning_loop', { data: { config: { model: 'gpt-4o' } } })];
    applyPatternParams(children, { model: 'gpt-4o-mini' }, bindings);
    expect(children[0].data.config).toEqual({ model: 'gpt-4o' });
    expect(children).toHaveLength(1);
  });

  it('ignores unbound params, unknown children and undefined values', () => {
    const children = [node('agent', 'agentic.reasoning_loop')];
    const out = applyPatternParams(
      children,
      { nope: 1, model: undefined, goal: 'x' },
      [
        { param: 'model', node: 'agent', config: 'model' },
        { param: 'goal', node: 'ghost', config: 'goal' }, // names a missing child
      ]
    );
    expect(out).toBe(children); // nothing applied → same array, no copy
    expect(out[0].data.config).toEqual({});
  });

  it('applies bindings when expanding an instance', () => {
    const flow = graph(
      [
        instance('blk', {
          data: {
            config: {},
            pattern: pattern({
              params: { goal: 'resolve the dispute', model: 'gpt-4o-mini', maxIterations: 3 },
              bindings: [
                { param: 'goal', node: 'agent', config: 'goal' },
                { param: 'model', node: 'agent', config: 'model' },
                { param: 'maxIterations', node: 'agent', config: 'maxIterations' },
              ],
            }),
          },
        }),
        node('agent', 'agentic.reasoning_loop', {
          parentId: 'blk',
          data: { config: { goal: '', model: 'gpt-4o', maxIterations: 8 } },
        }),
        node('tail', 'voice.output'),
      ],
      [{ id: 'e1', source: 'blk', target: 'tail' }]
    );

    const agent = expandPatterns(flow).nodes.find(n => n.id === 'blk/agent')!;
    expect(agent.data.config).toEqual({ goal: 'resolve the dispute', model: 'gpt-4o-mini', maxIterations: 3 });
  });

  it('leaves children untouched without a binding (params stay on the card)', () => {
    const flow = graph(
      [
        instance('blk', { data: { config: {}, pattern: pattern({ params: { goal: 'x' } }) } }),
        node('agent', 'agentic.reasoning_loop', { parentId: 'blk', data: { config: { goal: '' } } }),
      ],
      []
    );
    const agent = expandPatterns(flow).nodes.find(n => n.id === 'blk/agent')!;
    expect(agent.data.config).toEqual({ goal: '' });
  });
});

describe('instantiatePattern (§6)', () => {
  const tpl = getTemplate('pattern-unified-agent')!;
  const childIds = ['agent', 'fallback', 'goal_check', 'guard_post', 'guard_pre'];

  it('builds a collapsed instance plus its children and internal edges', () => {
    const { instance, nodes, edges } = instantiatePattern(tpl, { instanceId: 'blk', params: { goal: 'x' } });

    expect(instance.type).toBe('control.pattern');
    expect(instance.data.pattern?.patternId).toBe('pattern.unified_agent');
    expect(instance.data.pattern?.expanded).toBe(false);
    expect(instance.data.pattern?.params).toMatchObject({ goal: 'x', model: 'gpt-4o-mini' });
    expect(instance.data.pattern?.bindings?.length).toBe(6);
    expect(instance.data.pattern?.boundary).toEqual(tpl.pattern?.boundary);

    expect(nodes.map(n => n.id).sort()).toEqual(childIds);
    expect(nodes.every(n => n.parentId === 'blk')).toBe(true);
    expect(edges.map(e => e.id).sort()).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
  });

  it('seeds descriptor defaults, overridden by supplied params', () => {
    const { nodes } = instantiatePattern(tpl, {
      instanceId: 'blk',
      params: { goal: 'resolve the dispute', model: 'gpt-4o', maxIterations: 3, costCeiling: 0.1 },
    });
    expect(nodes.find(n => n.id === 'agent')?.data.config).toMatchObject({
      goal: 'resolve the dispute',
      model: 'gpt-4o',
      maxIterations: 3,
      costCeiling: 0.1,
      deadlineMs: 12000, // default, not supplied
      tools: [], // default
    });
  });

  it('does not mutate the template', () => {
    const snapshot = JSON.parse(JSON.stringify(tpl));
    instantiatePattern(tpl, { instanceId: 'blk', params: { goal: 'x', model: 'gpt-4o' } });
    expect(JSON.parse(JSON.stringify(tpl))).toEqual(snapshot);
  });

  it('round-trips through expansion on its declared boundary', () => {
    const { instance, nodes, edges } = instantiatePattern(tpl, {
      instanceId: 'blk',
      params: { goal: 'resolve the dispute', model: 'gpt-4o-mini' },
    });
    const flow = graph(
      [node('head', 'voice.input'), instance, ...nodes, node('tail', 'voice.output')],
      [
        { id: 'h', source: 'head', target: 'blk' },
        { id: 'r', source: 'blk', target: 'tail' },
        ...edges,
      ]
    );

    const out = expandPatterns(flow);
    expect(out.nodes.map(n => n.id)).not.toContain('blk');
    expect(out.nodes.find(n => n.id === 'blk/agent')?.data.config).toMatchObject({
      goal: 'resolve the dispute',
      model: 'gpt-4o-mini',
    });
    expect(arcs(out)).toContain('head->blk/guard_pre');
    expect(arcs(out)).toContain('blk/guard_post->tail');
  });

  it('throws for a template that is not a pattern', () => {
    expect(() => instantiatePattern(getTemplate('customer-support')!, { instanceId: 'x' })).toThrow(
      /not a pattern/
    );
  });
});

describe('pattern.unified_agent seed bindings (§6)', () => {
  const tpl = getTemplate('pattern-unified-agent')!;

  it('declares bindings over real params, children and config keys', () => {
    const ids = new Set(tpl.flow.nodes.map(n => n.id));
    const paramNames = new Set(tpl.pattern!.params.map(p => p.name));

    expect(tpl.pattern!.bindings?.length).toBeGreaterThan(0);
    for (const b of tpl.pattern!.bindings ?? []) {
      expect(paramNames.has(b.param), `param ${b.param}`).toBe(true);
      expect(ids.has(b.node), `child ${b.node}`).toBe(true);

      // The config key (its first segment) is declared by the child's schema or
      // present in the child's seed config — no binding into a void.
      const child = tpl.flow.nodes.find(n => n.id === b.node)!;
      const schema = nodeRegistry.get(child.type)?.configSchema ?? [];
      const head = b.config.split('.')[0];
      const declared =
        schema.some(f => f.name.split('.')[0] === head) || head in (child.data.config ?? {});
      expect(declared, `${b.node}.${b.config}`).toBe(true);
    }
  });
});

describe('pattern param form (AX1 config schema)', () => {
  const tpl = getTemplate('pattern-unified-agent')!;

  it('projects a descriptor\'s params onto renderable config-form fields', () => {
    const schema = patternFormSchema(tpl.pattern!);
    // One form field per declared param, in authoring order.
    expect(schema.map(f => f.name)).toEqual(tpl.pattern!.params.map(p => p.name));
    // Every field type is one ConfigForm renders (string|number|boolean|select|textarea|json).
    for (const f of schema) {
      expect(['string', 'number', 'boolean', 'select', 'textarea', 'json']).toContain(f.type);
    }
  });

  it('carries label, type, options, default, placeholder and description through', () => {
    const fields = patternFormSchema(tpl.pattern!);

    expect(fields.find(f => f.name === 'goal')).toMatchObject({
      label: 'Goal',
      type: 'textarea',
      placeholder: 'Resolve the dispute',
    });

    const guard = fields.find(f => f.name === 'guardrailRef')!;
    expect(guard.type).toBe('select');
    expect(guard.options?.map(o => o.value)).toEqual(['pre+post', 'pre', 'post']);
    expect(guard.default).toBe('pre+post');

    expect(fields.find(f => f.name === 'tools')).toMatchObject({ type: 'json', default: [] });
  });

  it('is pure — the descriptor is untouched', () => {
    const snapshot = JSON.parse(JSON.stringify(tpl.pattern));
    patternFormSchema(tpl.pattern!);
    expect(tpl.pattern).toEqual(snapshot);
  });
});

describe('getPattern catalogue lookup (§6)', () => {
  it('resolves the seed descriptor by its patternId', () => {
    expect(getPattern('pattern.unified_agent')?.id).toBe('pattern.unified_agent');
  });

  it('returns undefined for an unknown patternId', () => {
    expect(getPattern('pattern.nope')).toBeUndefined();
  });

  it('resolves the descriptor a freshly instantiated instance points at', () => {
    const { instance } = instantiatePattern(getTemplate('pattern-unified-agent')!, { instanceId: 'blk' });
    const descriptor = getPattern(instance.data.pattern!.patternId)!;
    expect(descriptor).toBeDefined();
    // The form's fields come from the catalogue, the values from the instance.
    expect(patternFormSchema(descriptor).map(f => f.name)).toContain('goal');
    // Defaults are seeded; `goal` has none, so its field renders empty.
    expect(instance.data.pattern!.params).toMatchObject({ model: 'gpt-4o-mini', tools: [] });
    expect('goal' in instance.data.pattern!.params).toBe(false);
  });
});

describe('agentic node carries the block config schema (AX1)', () => {
  const tpl = getTemplate('pattern-unified-agent')!;

  it('declares every bound agent key in the reasoning-loop schema', () => {
    const agent = tpl.flow.nodes.find(n => n.id === 'agent')!;
    const declared = new Set(
      (nodeRegistry.get(agent.type)?.configSchema ?? []).map(f => f.name.split('.')[0])
    );
    const boundHeads = new Set((tpl.pattern!.bindings ?? []).map(b => b.config.split('.')[0]));

    // Goal + tools + the ceilings — the exact keys the block advertises.
    expect(boundHeads).toEqual(
      new Set(['goal', 'tools', 'model', 'maxIterations', 'costCeiling', 'deadlineMs'])
    );
    for (const head of boundHeads) {
      expect(declared.has(head), `${agent.type}.${head}`).toBe(true);
    }
  });
});
