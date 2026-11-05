/**
 * Custom Nodes — user-authored node types.
 *
 * The `CustomNodeSDK` (src/sdk/CustomNodeSDK.ts) has always been able to build a
 * `NodeDefinition`, but nothing called it: there was no authoring surface and no
 * persistence, so "custom nodes" were a code-only promise. This module closes
 * that loop:
 *
 *   workspace store (persisted) → syncCustomNodes() → nodeRegistry → palette,
 *   command palette and the engine.
 *
 * Custom types are namespaced under `custom.` so they can never shadow a
 * built-in, and a node is defined from a small set of **behaviours** (request,
 * LLM, transform, guardrail) rather than arbitrary code — which keeps authored
 * nodes inspectable and safe to execute.
 *
 * Execution is simulated, exactly like the built-in integration nodes
 * (`integration.http` etc. return canned results today): a custom node runs a
 * real `execute()` against the session variables, but talks to the local
 * simulator, not the network. The authoring UI says so plainly.
 */

import type {
  ConfigSchemaField,
  ExecutionContext,
  HandleDefinition,
  NodeConfig,
  NodeDefinition,
  NodeResult,
  NodeType,
  ValidationResult
} from '../types/node';
import { nodeRegistry } from './registry';

/** Every authored type lives under this namespace. */
export const CUSTOM_NODE_PREFIX = 'custom.';

export type CustomNodeBehavior = 'http' | 'llm' | 'transform' | 'guardrail';

export interface CustomNodeRecord {
  id: string;
  /** Domain type, always `custom.<slug>`. */
  type: string;
  label: string;
  description: string;
  category: NodeDefinition['category'];
  icon: string;
  color: string;
  behavior: CustomNodeBehavior;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  configSchema: ConfigSchemaField[];
  /** Default config the instance inherits (merged under per-instance values). */
  defaults: NodeConfig;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BehaviorPreset {
  id: CustomNodeBehavior;
  label: string;
  description: string;
  category: NodeDefinition['category'];
  icon: string;
  color: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  configSchema: ConfigSchemaField[];
  defaults: NodeConfig;
}

/**
 * Behaviour presets. Each is a complete node shape; the author edits the
 * metadata and the default config, not the I/O contract (v1 keeps the
 * interface stable so authored nodes stay predictable on the canvas).
 */
export const BEHAVIOR_PRESETS: BehaviorPreset[] = [
  {
    id: 'http',
    label: 'Request',
    description: 'Call an HTTP endpoint (simulated locally until a runtime is bound)',
    category: 'integration',
    icon: '🌐',
    color: '#6366f1',
    inputs: [{ id: 'input', type: 'any', label: 'Trigger' }],
    outputs: [
      { id: 'response', type: 'json', label: 'Response' },
      { id: 'status', type: 'number', label: 'Status Code' }
    ],
    configSchema: [
      { name: 'url', label: 'URL', type: 'string', placeholder: 'https://api.example.com/v1/data', required: true },
      {
        name: 'method',
        label: 'Method',
        type: 'select',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' }
        ],
        default: 'GET'
      },
      { name: 'headers', label: 'Headers (JSON)', type: 'json' },
      { name: 'timeout', label: 'Timeout (ms)', type: 'number', default: 5000 }
    ],
    defaults: { url: '', method: 'GET', timeout: 5000 }
  },
  {
    id: 'llm',
    label: 'LLM',
    description: 'Prompt a language model and read its response',
    category: 'agentic',
    icon: '🧠',
    color: '#8b5cf6',
    inputs: [{ id: 'input', type: 'text', label: 'User Input', required: true }],
    outputs: [
      { id: 'response', type: 'text', label: 'Response' },
      { id: 'tokens', type: 'number', label: 'Tokens' }
    ],
    configSchema: [
      {
        name: 'model',
        label: 'Model',
        type: 'string',
        placeholder: 'Leave blank to use the platform default',
        description: 'Resolved at runtime from the provider layer — never hardcoded here.'
      },
      { name: 'systemPrompt', label: 'System Prompt', type: 'textarea' },
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7 }
    ],
    defaults: { model: '', systemPrompt: '', temperature: 0.7 }
  },
  {
    id: 'transform',
    label: 'Transform',
    description: 'Reshape a value with a {{variable}} template',
    category: 'deterministic',
    icon: '🔧',
    color: '#14b8a6',
    inputs: [{ id: 'input', type: 'any', label: 'Input' }],
    outputs: [{ id: 'output', type: 'any', label: 'Output' }],
    configSchema: [
      {
        name: 'expression',
        label: 'Expression',
        type: 'string',
        placeholder: '{{input}}',
        description: 'Use {{variable}} placeholders resolved from session variables.'
      }
    ],
    defaults: { expression: '{{input}}' }
  },
  {
    id: 'guardrail',
    label: 'Guardrail',
    description: 'Screen content before it moves on',
    category: 'governance',
    icon: '🛡️',
    color: '#f97316',
    inputs: [{ id: 'input', type: 'text', label: 'Content to Check', required: true }],
    outputs: [
      { id: 'allowed', type: 'boolean', label: 'Allowed' },
      { id: 'violations', type: 'json', label: 'Violations' }
    ],
    configSchema: [
      {
        name: 'checkType',
        label: 'Check Type',
        type: 'select',
        options: [
          { label: 'PII', value: 'pii' },
          { label: 'Toxicity', value: 'toxicity' },
          { label: 'Injection', value: 'injection' },
          { label: 'Custom', value: 'custom' }
        ],
        default: 'pii'
      }
    ],
    defaults: { checkType: 'pii' }
  }
];

export function behaviorPreset(behavior: CustomNodeBehavior): BehaviorPreset {
  return BEHAVIOR_PRESETS.find(b => b.id === behavior) ?? BEHAVIOR_PRESETS[0];
}

/** URL-safe slug from a human label. */
export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'node'
  );
}

/** Derive a domain type from a label. */
export function suggestType(label: string): string {
  return `${CUSTOM_NODE_PREFIX}${slugify(label)}`;
}

const TYPE_RE = /^custom\.[a-z][a-z0-9_]*$/;

export function isValidCustomType(type: string): boolean {
  return TYPE_RE.test(type);
}

/** Human-readable reason a type is rejected, or null when it is fine. */
export function customTypeError(type: string): string | null {
  if (!type) return 'Type is required.';
  if (!type.startsWith(CUSTOM_NODE_PREFIX)) {
    return `Type must start with "${CUSTOM_NODE_PREFIX}" so it cannot shadow a built-in node.`;
  }
  if (!isValidCustomType(type)) {
    return 'After "custom.", use lowercase letters, digits and underscores, starting with a letter.';
  }
  return null;
}

function emptyResult(outputs: Record<string, unknown>, variableUpdates: Record<string, unknown> = {}): NodeResult {
  return {
    outputs,
    nextNodes: [],
    variableUpdates,
    guardrailViolations: [],
    auditEvents: []
  };
}

/** Fill a {{variable}} template from the session variables. */
function renderTemplate(template: string, context: ExecutionContext): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, name: string) =>
    String(context.variables.get(name) ?? '')
  );
}

/**
 * Turn a persisted record into a live `NodeDefinition`. The returned object is
 * what the engine executes and the palette renders.
 */
export function customNodeDefinition(record: CustomNodeRecord): NodeDefinition {
  const requiredFields = record.configSchema.filter(f => f.required).map(f => f.name);

  async function execute(context: ExecutionContext, config: NodeConfig = {}): Promise<NodeResult> {
    switch (record.behavior) {
      case 'http': {
        const url = String(config.url ?? '');
        return emptyResult(
          { response: { ok: true, url, simulated: true }, status: 200 },
          { [`${record.type}.status`]: 200 }
        );
      }
      case 'llm': {
        const prompt = String(config.systemPrompt ?? '');
        const input = String(context.variables.get('input') ?? '');
        return emptyResult(
          {
            response: `Simulated ${record.label} response to “${input || prompt}”`,
            tokens: 42,
            cost: 0.0001
          },
          { [`${record.type}.response`]: `simulated:${input || prompt}` }
        );
      }
      case 'transform': {
        const template = String(config.expression ?? '{{input}}');
        const output = renderTemplate(template, context);
        return emptyResult({ output }, { [`${record.type}.output`]: output });
      }
      case 'guardrail':
      default:
        return emptyResult({ allowed: true, violations: [] });
    }
  }

  function validate(config: NodeConfig): ValidationResult {
    const errors = requiredFields
      .filter(name => config[name] === undefined || config[name] === '')
      .map(name => ({ field: name, message: `${name} is required` }));
    return { valid: errors.length === 0, errors };
  }

  return {
    type: record.type as NodeType,
    category: record.category,
    label: record.label,
    description: record.description,
    icon: record.icon,
    color: record.color,
    inputs: record.inputs,
    outputs: record.outputs,
    configSchema: record.configSchema,
    config: record.defaults,
    execute,
    validate
  };
}

// ── Registry synchronisation ─────────────────────────────────────────────

/** Types this module has registered, so we can retract ones the user removed. */
const registeredTypes = new Set<string>();

/**
 * Reconcile the live registry with the persisted custom nodes: register
 * enabled ones, retract anything disabled, renamed or deleted. Idempotent and
 * safe to call on every workspace change.
 */
export function syncCustomNodes(records: CustomNodeRecord[]): void {
  const wanted = new Map<string, CustomNodeRecord>();
  for (const record of records) {
    if (record.enabled && isValidCustomType(record.type)) wanted.set(record.type, record);
  }

  for (const type of [...registeredTypes]) {
    if (!wanted.has(type)) {
      nodeRegistry.unregister(type as NodeType);
      registeredTypes.delete(type);
    }
  }

  for (const [type, record] of wanted) {
    nodeRegistry.register(customNodeDefinition(record));
    registeredTypes.add(type);
  }
}

/** For tests/diagnostics: the custom types currently live in the registry. */
export function registeredCustomTypes(): string[] {
  return [...registeredTypes];
}
