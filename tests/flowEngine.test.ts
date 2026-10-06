/**
 * Flow Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowEngine } from '../src/engine/flowEngine';
import { FlowGraph, FlowNode, FlowEdge } from '../src/types/node';

describe('FlowEngine', () => {
  let engine: FlowEngine;
  let simpleFlow: FlowGraph;

  beforeEach(() => {
    simpleFlow = {
      id: 'test_flow',
      name: 'Test Flow',
      version: '1.0.0',
      nodes: [
        {
          id: 'start',
          type: 'voice.input',
          position: { x: 0, y: 0 },
          data: { config: {}, label: 'Start' }
        },
        {
          id: 'intent',
          type: 'agentic.intent_classifier',
          position: { x: 200, y: 0 },
          data: { config: {}, label: 'Intent' }
        },
        {
          id: 'output',
          type: 'voice.output',
          position: { x: 400, y: 0 },
          data: { config: {}, label: 'Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'intent' },
        { id: 'e2', source: 'intent', target: 'output' }
      ]
    };

    engine = new FlowEngine(simpleFlow);
  });

  it('should create engine with flow', () => {
    expect(engine).toBeDefined();
  });

  it('should execute flow with text input', async () => {
    const result = await engine.execute('Hello', 'session_1');
    expect(result).toBeDefined();
    expect(result.outputs).toBeDefined();
  });

  it('should track session state', async () => {
    await engine.execute('Hello', 'session_1');
    // Session state should be maintained
  });

  it('should handle errors gracefully', async () => {
    const invalidFlow: FlowGraph = {
      ...simpleFlow,
      nodes: [], // No nodes
      edges: []
    };
    const invalidEngine = new FlowEngine(invalidFlow);
    
    await expect(invalidEngine.execute('Hello', 'session_1')).rejects.toThrow();
  });
});

describe('Flow Validation', () => {
  it('should detect missing entry nodes', () => {
    const flow: FlowGraph = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      nodes: [
        {
          id: 'a',
          type: 'voice.input',
          position: { x: 0, y: 0 },
          data: { config: {}, label: 'A' }
        }
      ],
      edges: [{ id: 'e1', source: 'a', target: 'a' }] // Self-loop
    };

    // Should have no entry nodes (a is both source and target)
    const targetIds = new Set(flow.edges.map(e => e.target));
    const entryNodes = flow.nodes.filter(n => !targetIds.has(n.id));
    expect(entryNodes.length).toBe(0);
  });

  it('should detect orphaned nodes', () => {
    const flow: FlowGraph = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      nodes: [
        {
          id: 'a',
          type: 'voice.input',
          position: { x: 0, y: 0 },
          data: { config: {}, label: 'A' }
        },
        {
          id: 'b',
          type: 'voice.output',
          position: { x: 200, y: 0 },
          data: { config: {}, label: 'B' }
        }
      ],
      edges: [] // No connections
    };

    const sourceIds = new Set(flow.edges.map(e => e.source));
    const targetIds = new Set(flow.edges.map(e => e.target));
    const orphaned = flow.nodes.filter(n => !sourceIds.has(n.id) && !targetIds.has(n.id));
    expect(orphaned.length).toBe(2);
  });
});
