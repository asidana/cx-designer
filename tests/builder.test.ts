/**
 * Builder Interpreter Tests
 *
 * The interpreter is pure (registry + text in, plan out) except the
 * build intent, which delegates to FlowGenerator.
 */

import { describe, it, expect } from 'vitest';
import type { Node, Edge } from 'reactflow';
import { interpret } from '../src/builder/interpreter';
import '../src/nodes/index';

function node(id: string, type: string, label: string): Node {
  return {
    id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label, type, config: {} }
  } as Node;
}

const ctx = {
  nodes: [
    node('voice_input', 'voice.input', 'Voice Input'),
    node('intent', 'agentic.intent_classifier', 'Intent'),
    node('reasoning', 'agentic.reasoning_loop', 'Reasoning')
  ],
  edges: [] as Edge[],
  selectedNodeId: null as string | null
};

describe('builder interpreter', () => {
  it('adds a node by name', async () => {
    const plan = await interpret('add an intent classifier', ctx);
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0]).toMatchObject({ kind: 'add', nodeType: 'agentic.intent_classifier' });
  });

  it('connects two nodes by label', async () => {
    const plan = await interpret('connect voice input to intent', ctx);
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0]).toMatchObject({ kind: 'connect', from: 'voice_input', to: 'intent' });
  });

  it('refuses unknown connect endpoints', async () => {
    const plan = await interpret('connect voice input to billing', ctx);
    expect(plan.ops).toHaveLength(0);
    expect(plan.reply).toMatch(/can't find/i);
  });

  it('configures an unambiguous field', async () => {
    const plan = await interpret('set model to gpt-4o-mini on reasoning', ctx);
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0]).toMatchObject({
      kind: 'configure',
      nodeId: 'reasoning',
      patch: { model: 'gpt-4o-mini' }
    });
  });

  it('asks when a field exists on several nodes', async () => {
    const multi = {
      ...ctx,
      nodes: [
        node('r1', 'agentic.reasoning_loop', 'Reasoning One'),
        node('r2', 'agentic.reasoning_loop', 'Reasoning Two')
      ]
    };
    const plan = await interpret('set model to gpt-4o', multi);
    expect(plan.ops).toHaveLength(0);
    expect(plan.reply).toMatch(/which one|more precisely|... on /i);
  });

  it('removes a node by label', async () => {
    const plan = await interpret('remove the intent classifier', ctx);
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0]).toMatchObject({ kind: 'remove', nodeId: 'intent' });
  });

  it('describes the flow without ops', async () => {
    const plan = await interpret('what is this flow?', ctx);
    expect(plan.ops).toHaveLength(0);
    expect(plan.reply).toMatch(/3 node/);
  });

  it('clears a non-empty canvas', async () => {
    const plan = await interpret('start over', ctx);
    expect(plan.ops).toEqual([{ kind: 'clear' }]);
  });

  it('answers help without ops', async () => {
    const plan = await interpret('help', ctx);
    expect(plan.ops).toHaveLength(0);
    expect(plan.reply).toMatch(/I can:/);
  });

  it('clarifies gibberish with examples', async () => {
    const plan = await interpret('xyzzy frobnicate', ctx);
    expect(plan.ops).toHaveLength(0);
    expect(plan.reply).toMatch(/didn't get that/);
  });
});
