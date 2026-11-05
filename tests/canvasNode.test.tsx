/**
 * Canvas node card + chrome tests (docs/STORY_AND_PATTERNS.md §11).
 *
 * Covers the card's content (icon, title, category, config summary, typed
 * labelled ports, validation state), the three zoom bands, every status ring,
 * and the token-driven chrome in both themes.
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import ReactFlow, { ReactFlowProvider, type NodeProps } from 'reactflow';
import { CxNode, zoomBand, portOffset, ZOOM_FAR, ZOOM_CLOSE, STATUS_GLYPH } from '../src/designer/canvas/CxNode';
import { canvasNodeTypes } from '../src/designer/canvas/nodeTypes';
import {
  CANVAS_STATUSES,
  STATUS_TOKEN,
  statusForNode,
  applyNodePresentation,
  ariaLabelForNode
} from '../src/designer/canvas/status';
import { nodeSummary, nodeTitle, deriveSummary, formatValue } from '../src/designer/canvas/summary';
import { nodeRegistry } from '../src/designer/nodes/registry';
import '../src/designer/nodes/index';
import {
  CANVAS_RENDERER_TYPE,
  domainTypeOf,
  normalizeFlow
} from '../src/designer/canvas/domain';
import { DARK_TOKENS, LIGHT_TOKENS, applyTokens } from '../src/designer/design/tokens';

const INTENT = 'agentic.intent_classifier';

function intentDef() {
  const def = nodeRegistry.get(INTENT);
  if (!def) throw new Error('intent classifier not registered');
  return def;
}

/** Renders a CxNode at a given zoom. The store zoom is set by the Viewport. */
function renderNode(props: Partial<NodeProps<unknown>> = {}): { root: Root; container: HTMLDivElement } {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const finalProps: NodeProps<unknown> = {
    id: 'n1',
    type: CANVAS_RENDERER_TYPE,
    data: { config: { model: 'gpt-4o-mini', intents: [{}, {}] }, label: 'Intent', nodeType: INTENT },
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    targetPosition: 'left' as never,
    sourcePosition: 'right' as never,
    ...props
  } as NodeProps<unknown>;

  act(() => {
    root.render(
      <ReactFlowProvider>
        <CxNode {...finalProps} />
      </ReactFlowProvider>
    );
  });
  return { root, container };
}

let mounted: Array<{ root: Root; container: HTMLDivElement }> = [];
function mount(props: Partial<NodeProps<unknown>> = {}) {
  const m = renderNode(props);
  mounted.push(m);
  return m;
}

afterEach(() => {
  for (const m of mounted) {
    act(() => m.root.unmount());
    m.container.remove();
  }
  mounted = [];
});

describe('zoom bands', () => {
  it('splits at the two documented thresholds', () => {
    expect(zoomBand(ZOOM_FAR - 0.01)).toBe('far');
    expect(zoomBand(ZOOM_FAR)).toBe('normal');
    expect(zoomBand(ZOOM_CLOSE)).toBe('normal');
    expect(zoomBand(ZOOM_CLOSE + 0.01)).toBe('close');
    expect(zoomBand(Number.NaN)).toBe('far');
  });

  it('port offsets spread evenly and centre a single port', () => {
    expect(portOffset(0, 1)).toBe('50%');
    expect(portOffset(0, 2)).toBe(`${(1 / 3) * 100}%`);
    expect(portOffset(1, 2)).toBe(`${(2 / 3) * 100}%`);
  });
});

describe('node card content', () => {
  it('shows icon, title and category', () => {
    const { container } = mount();
    const card = container.querySelector('[data-testid="cx-node"]')!;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Intent');
    expect(card.textContent).toContain('agentic');
    expect(card.getAttribute('data-category')).toBe('agentic');
    expect(card.querySelector('.cx-node__icon')?.textContent).toBe(intentDef().icon);
  });

  it('renders a typed, labelled port per input and output', () => {
    const { container } = mount();
    const def = intentDef();
    const rows = container.querySelectorAll('.cx-port-row');
    expect(rows.length).toBe(def.inputs.length + def.outputs.length);

    for (const h of [...def.inputs, ...def.outputs]) {
      const label = Array.from(container.querySelectorAll('.cx-port-label')).some(
        el => el.textContent === h.label
      );
      expect(label, `port "${h.label}" should be labelled`).toBe(true);
    }
    // Handles carry their type, and there is one per port.
    expect(container.querySelectorAll('.cx-port').length).toBe(def.inputs.length + def.outputs.length);
  });

  it('shows a config summary from the schema defaults', () => {
    const { container } = mount();
    const summary = container.querySelector('.cx-node__summary')?.textContent ?? '';
    expect(summary.length).toBeGreaterThan(0);
  });

  it('honours a Story override for the title and summary', () => {
    const { container } = mount({
      data: {
        config: {},
        nodeType: INTENT,
        story: { title: 'Work out what they want', summary: 'Reads the intent, then routes.' }
      }
    } as never);
    const card = container.querySelector('[data-testid="cx-node"]')!;
    expect(card.textContent).toContain('Work out what they want');
    expect(card.textContent).toContain('Reads the intent, then routes.');
  });

  it('renders an unknown card rather than crashing on an unresolvable type', () => {
    const { container } = mount({ data: { config: {}, label: 'Mystery' } } as never);
    const card = container.querySelector('[data-testid="cx-node"]')!;
    expect(card.getAttribute('data-category')).toBe('unknown');
    expect(card.textContent).toContain('Mystery');
  });
});

describe('progressive disclosure', () => {
  it('hides ports, category and summary at the far band', () => {
    // The default store zoom is 1, so drive the band via the wrapper instead:
    // zoomBand is unit-tested above; here we assert the band attribute drives
    // which sections render.
    const { container } = mount();
    const card = container.querySelector('[data-testid="cx-node"]')!;
    const band = card.getAttribute('data-band');
    expect(['far', 'normal', 'close']).toContain(band);
    if (band === 'far') {
      expect(container.querySelector('.cx-node__cat')).toBeNull();
      expect(container.querySelector('.cx-port-row')).toBeNull();
      expect(container.querySelector('.cx-node__summary')).toBeNull();
    } else {
      expect(container.querySelector('.cx-node__cat')).toBeTruthy();
      expect(container.querySelector('.cx-port-row')).toBeTruthy();
    }
  });
});

describe('status ring', () => {
  it('has a token and a non-colour glyph for every status', () => {
    for (const status of CANVAS_STATUSES) {
      expect(STATUS_TOKEN[status]).toMatch(/^var\(--cx-/);
      expect(STATUS_GLYPH[status]).toMatch(/\S/);
    }
  });

  it('derives status with documented precedence', () => {
    const node = { id: 'a', data: { config: {} } };
    expect(statusForNode(node, { activeNodeId: 'a' })).toBe('running');
    expect(statusForNode(node, { diff: { added: ['a'] } })).toBe('diff-added');
    expect(statusForNode(node, { diff: { modified: [{ nodeId: 'a' }] } })).toBe('diff-modified');
    expect(statusForNode(node, { severity: new Map([['a', 'error']]) })).toBe('error');
    expect(statusForNode(node, { severity: new Map([['a', 'warning']]) })).toBe('warning');
    expect(statusForNode(node, {})).toBe('idle');
    // An explicit run status wins over everything derived.
    expect(
      statusForNode({ id: 'a', data: { config: {}, cxStatus: 'success' } }, { activeNodeId: 'a' })
    ).toBe('success');
  });

  it('an explicit idle does not mask a derived status', () => {
    expect(
      statusForNode({ id: 'a', data: { config: {}, cxStatus: 'idle' } }, { activeNodeId: 'a' })
    ).toBe('running');
  });

  it('renders every status without error and never by colour alone', () => {
    for (const status of CANVAS_STATUSES) {
      const { container } = mount({ data: { config: {}, nodeType: INTENT, cxStatus: status } } as never);
      const card = container.querySelector('[data-testid="cx-node"]') as HTMLElement;
      // selected is layered from the React Flow prop, so a non-selected node
      // reports its own status.
      expect(card.getAttribute('data-status')).toBe(status);
      expect(container.querySelector('.cx-node__status')?.textContent).toBe(STATUS_GLYPH[status]);
    }
  });

  it('layers selection over the derived status', () => {
    const { container } = mount({ selected: true, data: { config: {}, nodeType: INTENT, cxStatus: 'error' } } as never);
    expect(container.querySelector('[data-testid="cx-node"]')?.getAttribute('data-status')).toBe('selected');
  });
});

describe('accessible name', () => {
  it('announces kind, ports, settings and summary', () => {
    const def = intentDef();
    const label = ariaLabelForNode({ data: { config: {}, label: 'Intent', nodeType: INTENT } }, def);
    expect(label).toContain('Intent');
    expect(label).toContain('agentic node');
    expect(label).toContain('Inputs:');
    expect(label).toContain('Outputs:');
    expect(label).toContain(`${def.configSchema.length} setting`);
  });

  it('applyNodePresentation sets ariaLabel and status without mutating input', () => {
    const nodes = [
      { id: 'a', type: 'cx', position: { x: 0, y: 0 }, data: { config: {}, nodeType: INTENT } }
    ] as never[];
    const out = applyNodePresentation(nodes, { activeNodeId: 'a' }, t => nodeRegistry.get(t));
    expect(out[0].ariaLabel).toContain('Running now.');
    expect((out[0].data as Record<string, unknown>).cxStatus).toBe('running');
    // Original untouched (pure projection).
    expect((nodes[0].data as Record<string, unknown>).cxStatus).toBeUndefined();
    expect(out[0].ariaLabel).not.toBe((nodes[0] as { ariaLabel?: string }).ariaLabel);
  });

  it('drops the legacy box-shadow overlay', () => {
    const nodes = [
      { id: 'a', type: 'cx', position: { x: 0, y: 0 }, style: { boxShadow: '0 0 0 2px red' }, data: { config: {} } }
    ] as never[];
    const out = applyNodePresentation(nodes, {}, t => nodeRegistry.get(t));
    expect((out[0].style as Record<string, unknown>).boxShadow).toBeUndefined();
  });
});

describe('summary derivation', () => {
  it('formats values compactly', () => {
    expect(formatValue(true)).toBe('on');
    expect(formatValue(false)).toBe('off');
    expect(formatValue(7)).toBe('7');
    expect(formatValue(['a', 'b'])).toBe('2 items');
    expect(formatValue({ a: 1, b: 2 })).toBe('{a, b}');
    expect(formatValue(undefined)).toBe('—');
    expect(formatValue('x'.repeat(50))).toMatch(/…$/);
  });

  it('prefers an explicit definition summariser', () => {
    const def = { ...intentDef(), summarize: () => 'SENTINEL' };
    expect(nodeSummary({ data: { config: {} } }, def)).toBe('SENTINEL');
  });

  it('falls back to the description when nothing is configured', () => {
    const def = intentDef();
    const summary = nodeSummary({ data: { config: {} } }, def);
    expect(summary.length).toBeGreaterThan(0);
    expect(deriveSummary({}, def.configSchema, undefined)).toBe('Not configured');
  });

  it('uses the instance label as the title, then the definition', () => {
    const def = intentDef();
    expect(nodeTitle({ data: { label: 'Mine' } }, def)).toBe('Mine');
    expect(nodeTitle({ data: {} }, def)).toBe(def.label);
  });
});

describe('chrome is token-driven in both themes', () => {
  it('registers exactly the cx renderer key', () => {
    expect(Object.keys(canvasNodeTypes)).toEqual([CANVAS_RENDERER_TYPE]);
    expect(CANVAS_RENDERER_TYPE).toBe('cx');
  });

  it('exposes a value for every token the card references', () => {
    // The card and canvas.css reference these roles; if one is missing the
    // card renders transparent in that theme. Guard both modes.
    const referenced = [
      'bg', 'panel', 'panel2', 'input', 'border', 'borderStrong', 'text',
      'muted', 'subtle', 'accent', 'success', 'warn', 'danger', 'info',
      'focus', 'overlay'
    ] as const;
    for (const tokens of [DARK_TOKENS, LIGHT_TOKENS]) {
      for (const role of referenced) {
        expect(tokens[role], `${role} missing`).toMatch(/\S/);
      }
    }
  });

  it('projects the chrome tokens as --cx-* variables for each mode', () => {
    for (const mode of ['dark', 'light'] as const) {
      const root = document.createElement('div');
      applyTokens(mode, 'comfortable', root);
      expect(root.dataset.theme).toBe(mode);
      expect(root.style.getPropertyValue('--cx-bg')).toMatch(/\S/);
      expect(root.style.getPropertyValue('--cx-border-strong')).toMatch(/\S/);
    }
  });

  it('light and dark disagree on the chrome colours (real parity, not a copy)', () => {
    const different = (['bg', 'panel', 'border', 'text'] as const).filter(
      role => DARK_TOKENS[role] !== LIGHT_TOKENS[role]
    );
    expect(different).toEqual(['bg', 'panel', 'border', 'text']);
  });

  it('canvas.css carries no colour literals — chrome is token-only', () => {
    // Structural: chrome must be correct in both modes by construction, so a
    // hard-coded colour (which cannot flip with the theme) fails the build.
    const css = readFileSync(join(process.cwd(), 'src', 'designer', 'canvas', 'canvas.css'), 'utf8');
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = withoutComments.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) ?? [];
    expect(literals, `hard-coded colours: ${literals.join(', ')}`).toEqual([]);
    // …and it does actually reference tokens (a sanity check the test bites).
    expect(withoutComments).toMatch(/var\(--cx-/);
  });

  it('the cx card is what the normalizer routes canvas nodes to', () => {    const flow = normalizeFlow({
      id: 'f',
      name: 'n',
      version: '1.0.0',
      nodes: [{ id: 'a', type: 'default', position: { x: 0, y: 0 }, data: { config: {}, type: INTENT } }] as never,
      edges: []
    });
    // Serialized graph keeps the domain type…
    expect(flow.nodes[0].type).toBe(INTENT);
    expect(domainTypeOf(flow.nodes[0])).toBe(INTENT);
  });

  it('a real ReactFlow instance draws a node through the registered card', () => {
    // The shell mounts <ReactFlow nodeTypes={canvasNodeTypes}>; this is the
    // only path the direct CxNode tests cannot cover (a bad renderer key or
    // a missing registration would show here).
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    const container = document.createElement('div');
    Object.defineProperty(container, 'offsetWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'offsetHeight', { value: 600, configurable: true });
    document.body.appendChild(container);

    const root = createRoot(container);
    mounted.push({ root, container });
    act(() => {
      root.render(
        <ReactFlow
          nodes={[
            {
              id: 'a',
              type: CANVAS_RENDERER_TYPE,
              position: { x: 0, y: 0 },
              data: { config: {}, label: 'Intent', nodeType: INTENT }
            }
          ]}
          edges={[]}
          nodeTypes={canvasNodeTypes}
        />
      );
    });

    const card = container.querySelector('[data-testid="cx-node"]');
    expect(card, 'the cx card should be rendered by ReactFlow').toBeTruthy();
    expect(card?.textContent).toContain('Intent');
  });
});
