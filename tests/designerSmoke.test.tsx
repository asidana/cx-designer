/**
 * CanvasDesigner smoke tests — the embeddable feature boots, renders the
 * registry into the palette, prepares starter nodes, and reports changes.
 */

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// React Flow needs these browser APIs jsdom doesn't ship.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
class DOMMatrixStub {
  m11 = 1;
  m22 = 1;
  e(n: number): number {
    return n;
  }
}
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  (globalThis as unknown as { ResizeObserver: new () => ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}
if (typeof (globalThis as { DOMMatrixReadOnly?: unknown }).DOMMatrixReadOnly === 'undefined') {
  (globalThis as unknown as { DOMMatrixReadOnly: new () => DOMMatrixStub }).DOMMatrixReadOnly = DOMMatrixStub;
}

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { CanvasDesigner, type CanvasDesignerHandle } from '../src/designer/CanvasDesigner';
import type { FlowGraph } from '../src/designer/types/node';
import { nodeRegistry } from '../src/designer/nodes/registry';
import '../src/designer/nodes/index';

const STARTER: FlowGraph = {
  id: 'flow_smoke',
  name: 'Smoke Flow',
  version: '1.0.0',
  nodes: [
    {
      id: 'in_1',
      type: 'chat.input',
      position: { x: 0, y: 0 },
      data: { nodeType: 'chat.input', label: 'Chat Input', config: {} }
    },
    {
      id: 'out_1',
      type: 'chat.output',
      position: { x: 200, y: 0 },
      data: { nodeType: 'chat.output', label: 'Chat Output', config: {} }
    }
  ],
  edges: [{ id: 'e1', source: 'in_1', target: 'out_1' }]
};

describe('CanvasDesigner', () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mount = (ui: React.ReactElement): void => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(ui));
  };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('boots with the starter flow: toolbar identity, palette and node count', () => {
    mount(<CanvasDesigner initialFlow={STARTER} persistence={false} />);
    const toolbar = host!.textContent ?? '';
    const nameInput = host!.querySelector<HTMLInputElement>('input[aria-label="Flow name"]');
    expect(nameInput?.value).toBe('Smoke Flow');
    expect(toolbar).toContain('v1.0.0');
    expect(toolbar).toContain('2 nodes');
    expect(document.body.textContent).toContain('Node Palette');
    // Registry driven: the palette lists built-in nodes.
    expect(nodeRegistry.getAll().length).toBeGreaterThan(20);
    expect(host!.querySelectorAll('.react-flow__node').length).toBe(2);
  });

  it('emits the canonical flow via onChange', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    mount(<CanvasDesigner initialFlow={STARTER} persistence={false} onChange={onChange} />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onChange).toHaveBeenCalled();
    const emitted = onChange.mock.calls[0][0] as FlowGraph;
    expect(emitted.id).toBe('flow_smoke');
    expect(emitted.name).toBe('Smoke Flow');
    expect(emitted.nodes.map(n => n.type).sort()).toEqual(
      [expect.anything()].flatMap(() => ['chat.input', 'chat.output'])
    );
    expect(emitted.nodes.every(n => n.data.nodeType)).toBe(true);
    vi.useRealTimers();
  });

  it('exposes an imperative handle (getFlow / addNode / focusNode)', () => {
    const ref = { current: null as CanvasDesignerHandle | null };
    mount(
      <CanvasDesigner ref={ref as unknown as React.Ref<CanvasDesignerHandle>} initialFlow={STARTER} persistence={false} />
    );
    const flow = ref.current?.getFlow();
    expect(flow?.nodes.length).toBe(2);
    act(() => ref.current?.addNode('chat.page_assistant'));
    expect(ref.current?.getFlow().nodes.length).toBe(3);
  });

  it('renders the run control', () => {
    mount(<CanvasDesigner initialFlow={STARTER} persistence={false} />);
    const run = Array.from(host!.querySelectorAll('button')).find(b => b.textContent?.includes('Run'));
    expect(run).toBeTruthy();
  });
});
