/**
 * Navigation smoke tests
 *
 * The shell is nine sections and their pages. These mount the real App in
 * jsdom and assert the things a user would notice: the sections exist, a
 * page actually renders, the command palette finds pages and nodes, and the
 * navigation model stays consistent (unique ids, resolvable shortcuts).
 *
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import App from '../src/App';
import {
  DEFAULT_PAGE,
  PAGE_SHORTCUTS,
  SECTIONS,
  page as pageDef,
  sectionOfPage
} from '../src/navigation/navModel';
import { searchItems, scoreMatch } from '../src/navigation/search';

describe('navigation model', () => {
  it('has the nine sections, in market order', () => {
    expect(SECTIONS.map(s => s.label)).toEqual([
      'CX Designer',
      'Guardrails',
      'Voice Gateway',
      'Observability',
      'Insights',
      'Settings',
      'Admin',
      'Super Admin',
      'Help'
    ]);
  });

  it('gives every section at least one page, and the canvas a workspace page', () => {
    for (const s of SECTIONS) {
      expect(s.pages.length).toBeGreaterThan(0);
      expect(s.pages[0]).toBeDefined();
    }
    expect(pageDef(DEFAULT_PAGE)?.kind).toBe('workspace');
  });

  it('keeps page ids unique and prefixed by their section', () => {
    const ids = SECTIONS.flatMap(s => s.pages.map(p => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SECTIONS) {
      for (const p of s.pages) expect(p.id.startsWith(`${s.id}.`)).toBe(true);
    }
  });

  it('maps every shortcut to a real page, without collisions', () => {
    const keys = Object.keys(PAGE_SHORTCUTS);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(pageDef(PAGE_SHORTCUTS[key]), `${key} -> ${PAGE_SHORTCUTS[key]}`).toBeDefined();
    }
  });

  it('points every shortcut at a page that advertises it', () => {
    for (const [key, id] of Object.entries(PAGE_SHORTCUTS)) {
      const def = pageDef(id);
      expect(def?.key, `${id} key mismatch`).toBe(key);
      expect(def?.shortcut).toBeTruthy();
    }
  });

  it('resolves the owning section for every page', () => {
    for (const s of SECTIONS) {
      for (const p of s.pages) {
        expect(sectionOfPage(p.id)?.id).toBe(s.id);
      }
    }
  });

  it('describes every page (menu, palette and help all reuse the hint)', () => {
    for (const s of SECTIONS) {
      for (const p of s.pages) {
        expect(p.hint.length).toBeGreaterThan(10);
        expect(p.keywords.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('search ranking', () => {
  it('prefers prefix and word-boundary matches over scattered ones', () => {
    expect(scoreMatch('temp', 'templates')).toBeGreaterThan(scoreMatch('tap', 'templates'));
    expect(scoreMatch('intent', 'intent classifier')).toBeGreaterThan(-1);
    expect(scoreMatch('zzz', 'templates')).toBe(-1);
  });

  it('finds nodes by capability, not just by name', () => {
    const items = [
      { label: 'Guardrail', keywords: ['pii', 'redact'], group: 'x' },
      { label: 'Templates', keywords: ['start'], group: 'x' }
    ];
    expect(searchItems('redact', items)[0].item.label).toBe('Guardrail');
  });

  it('returns everything for an empty query, in declaration order', () => {
    const items = [{ label: 'A', group: 'g' }, { label: 'B', group: 'g' }];
    expect(searchItems('  ', items).map(h => h.item.label)).toEqual(['A', 'B']);
  });
});

describe('app shell', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // React Flow measures the DOM; jsdom has no layout.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const mount = () => {
    act(() => {
      root.render(React.createElement(App));
    });
  };

  it('renders all nine sections in the rail', () => {
    mount();
    const labels = Array.from(container.querySelectorAll('nav button')).map(b =>
      (b.textContent || '').trim()
    );
    for (const section of SECTIONS) {
      expect(labels.some(l => l.includes(section.label)), section.label).toBe(true);
    }
  });

  it('lands on the canvas with the palette available', () => {
    mount();
    expect(container.textContent).toContain('Node Palette');
    expect(container.textContent).toContain('Run');
  });

  it('shows the pages of the active section, not all sections at once', () => {
    mount();
    const text = container.textContent || '';
    expect(text).toContain('Preflight Lint');
    expect(text).not.toContain('Quota');
  });

  it('switches sections and renders the destination page', () => {
    mount();
    const guardrails = Array.from(container.querySelectorAll('button')).find(
      b => (b.textContent || '').includes('Guardrails')
    );
    expect(guardrails).toBeDefined();
    act(() => {
      guardrails!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('Policy Rules');
  });

  it('keeps the shell mounted across page changes', () => {
    mount();
    const before = container.querySelector('nav');
    const insights = Array.from(container.querySelectorAll('button')).find(
      b => (b.textContent || '').includes('Insights')
    );
    act(() => {
      insights!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('nav')).toBe(before);
    expect(container.textContent).toContain('Eval Suites');
  });
});
