/**
 * Custom nodes — authoring contract, execution and registry synchronisation.
 *
 * The point of this layer is that a persisted record becomes a *live*
 * `NodeDefinition`: the palette and the engine read the registry, so these
 * tests pin both halves — the shape/execute of a definition, and the
 * reconcile step that keeps the registry equal to the workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  BEHAVIOR_PRESETS,
  behaviorPreset,
  customNodeDefinition,
  customTypeError,
  isValidCustomType,
  registeredCustomTypes,
  slugify,
  suggestType,
  syncCustomNodes,
  type CustomNodeBehavior,
  type CustomNodeRecord
} from '../src/designer/nodes/custom';
import { nodeRegistry } from '../src/designer/nodes/registry';
import type { ExecutionContext, NodeType } from '../src/designer/types/node';

const context = (vars: Record<string, unknown> = {}): ExecutionContext => ({
  sessionId: 's1',
  userId: 'u1',
  channel: 'webchat',
  variables: new Map(Object.entries(vars)),
  voiceState: { isListening: false, isSpeaking: false, bargeInEnabled: false },
  guardrails: [],
  auditLog: [],
  costAccumulator: 0,
  toolRegistry: { tools: [], getTool: () => undefined },
  mcpClients: new Map()
});

const record = (over: Partial<CustomNodeRecord> = {}): CustomNodeRecord => {
  const preset = behaviorPreset('http');
  return {
    id: 'cn_1',
    type: 'custom.weather',
    label: 'Weather',
    description: 'Look up the weather',
    category: preset.category,
    icon: preset.icon,
    color: preset.color,
    behavior: 'http',
    inputs: preset.inputs,
    outputs: preset.outputs,
    configSchema: preset.configSchema,
    defaults: { ...preset.defaults },
    enabled: true,
    createdAt: 1,
    updatedAt: 1,
    ...over
  };
};

const behaviourRecord = (behavior: CustomNodeBehavior, over: Partial<CustomNodeRecord> = {}) => {
  const preset = behaviorPreset(behavior);
  return record({
    type: `custom.${behavior}_node`,
    behavior,
    category: preset.category,
    inputs: preset.inputs,
    outputs: preset.outputs,
    configSchema: preset.configSchema,
    defaults: { ...preset.defaults },
    ...over
  });
};

afterEach(() => {
  // Leave the registry as we found it — retract anything a test registered.
  syncCustomNodes([]);
});

describe('custom node identity', () => {
  it('derives a namespaced, slugged type from a label', () => {
    expect(slugify('Sentiment Analysis!')).toBe('sentiment_analysis');
    expect(suggestType('Order Lookup')).toBe('custom.order_lookup');
    expect(suggestType('')).toBe('custom.node');
  });

  it('only accepts types under the custom namespace', () => {
    expect(isValidCustomType('custom.sentiment')).toBe(true);
    expect(isValidCustomType('agentic.intent_classifier')).toBe(false);
    expect(customTypeError('weather')).toMatch(/must start with "custom\."/);
    expect(customTypeError('custom.9lives')).toMatch(/lowercase letters/);
    expect(customTypeError('custom.ok_2')).toBeNull();
  });

  it('ships a preset for every behaviour', () => {
    expect(BEHAVIOR_PRESETS.map(b => b.id)).toEqual(['http', 'llm', 'transform', 'guardrail']);
    // Model IDs are never hardcoded in the presets — resolved at runtime.
    const llm = behaviorPreset('llm');
    const modelField = llm.configSchema.find(f => f.name === 'model');
    expect(modelField?.default).toBeUndefined();
    expect(JSON.stringify(llm.defaults)).not.toContain('gpt-');
  });
});

describe('customNodeDefinition', () => {
  it('carries the record metadata, defaults and I/O onto the definition', () => {
    const def = customNodeDefinition(record());
    expect(def.type).toBe('custom.weather');
    expect(def.label).toBe('Weather');
    expect(def.category).toBe('integration');
    expect(def.config).toEqual({ url: '', method: 'GET', timeout: 5000 });
    expect(def.inputs.length).toBeGreaterThan(0);
    expect(def.outputs.map(o => o.id)).toContain('response');
  });

  it('validates required config fields', () => {
    const def = customNodeDefinition(record());
    const bad = def.validate({});
    expect(bad.valid).toBe(false);
    expect(bad.errors.some(e => e.field === 'url')).toBe(true);
    expect(def.validate({ url: 'https://example.com' }).valid).toBe(true);
  });

  it('executes a request node against the simulator', async () => {
    const def = customNodeDefinition(record());
    const result = await def.execute(context(), { url: 'https://api.example.com', method: 'GET' });
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.response).toMatchObject({ simulated: true, url: 'https://api.example.com' });
  });

  it('executes an LLM node without inventing a model id', async () => {
    const def = customNodeDefinition(behaviourRecord('llm'));
    const result = await def.execute(context({ input: 'hello' }), { temperature: 0.2 });
    expect(String(result.outputs.response)).toContain('hello');
    expect(result.outputs.tokens).toBe(42);
  });

  it('executes a transform node with {{variable}} substitution', async () => {
    const def = customNodeDefinition(behaviourRecord('transform'));
    const result = await def.execute(context({ input: 'world' }), { expression: 'Hello {{input}}' });
    expect(result.outputs.output).toBe('Hello world');
  });

  it('executes a guardrail node as a pass-through screen', async () => {
    const def = customNodeDefinition(behaviourRecord('guardrail'));
    const result = await def.execute(context(), { checkType: 'pii' });
    expect(result.outputs.allowed).toBe(true);
    expect(result.outputs.violations).toEqual([]);
  });
});

describe('syncCustomNodes', () => {
  it('registers enabled nodes and retracts disabled ones', () => {
    syncCustomNodes([record()]);
    expect(nodeRegistry.get('custom.weather' as NodeType)).toBeDefined();
    expect(registeredCustomTypes()).toEqual(['custom.weather']);

    syncCustomNodes([record({ enabled: false })]);
    expect(nodeRegistry.get('custom.weather' as NodeType)).toBeUndefined();
    expect(registeredCustomTypes()).toEqual([]);
  });

  it('retracts a renamed type and registers the new one', () => {
    syncCustomNodes([record()]);
    syncCustomNodes([record({ type: 'custom.forecast' })]);
    expect(nodeRegistry.get('custom.weather' as NodeType)).toBeUndefined();
    expect(nodeRegistry.get('custom.forecast' as NodeType)).toBeDefined();
  });

  it('ignores records that are not valid custom types', () => {
    syncCustomNodes([record({ type: 'agentic.intent_classifier' })]);
    expect(registeredCustomTypes()).toEqual([]);
  });

  it('re-registers an edited node so the registry reflects the latest shape', () => {
    syncCustomNodes([record()]);
    syncCustomNodes([record({ label: 'Weather v2' })]);
    expect(nodeRegistry.get('custom.weather' as NodeType)?.label).toBe('Weather v2');
  });
});
