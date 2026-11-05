/**
 * Core Node Interface — the sacred contract.
 * Every framework (LangGraph, Strands, ADK, LangChain) adapts to this.
 */

import type { ChannelId } from '../channels/types';

export type NodeType =
  // Voice Layer
  | 'voice.input'
  | 'voice.output'
  | 'voice.turn_detection'
  | 'voice.preprocessing'
  // Chat Layer
  | 'chat.input'
  | 'chat.output'
  | 'chat.page_assistant'
  // Agentic Layer
  | 'agentic.intent_classifier'
  | 'agentic.reasoning_loop'
  | 'agentic.webcrawler'
  | 'agentic.planning'
  | 'agentic.rag'
  | 'agentic.memory'
  | 'agentic.langgraph'
  | 'agentic.langgraph.llm'
  | 'agentic.langgraph.tool'
  | 'agentic.langgraph.retriever'
  | 'agentic.langgraph.memory'
  | 'agentic.langgraph.conditional'
  | 'agentic.strands'
  | 'agentic.adk'
  | 'agentic.langchain'
  | 'agentic.autogen'
  | 'agentic.crewai'
  // Deterministic Layer
  | 'deterministic.slot_collector'
  | 'deterministic.business_rule'
  | 'deterministic.compliance_script'
  | 'deterministic.data_request'
  | 'deterministic.human_handoff'
  // Control Flow
  | 'control.conditional_router'
  | 'control.parallel'
  | 'control.loop'
  | 'control.wait'
  | 'control.subflow'
  | 'control.pattern'
  // Governance
  | 'governance.guardrail'
  | 'governance.sentinel'
  | 'governance.eval_checkpoint'
  | 'governance.audit_logger'
  | 'governance.cost_tracker'
  // Integration
  | 'integration.http'
  | 'integration.mcp'
  | 'integration.database'
  | 'integration.webhook'
  | 'integration.telephony'
  | 'integration.streamlink'
  // Gateway
  | 'gateway.mcp'
  | 'gateway.custom'
  // Interop Layer (T5–T12)
  | 'agentic.copilot_action'
  | 'agentic.selfhelp_answer'
  | 'agentic.agent_skill'
  | 'gateway.mcp_tool';

export interface HandleDefinition {
  id: string;
  type: 'audio' | 'text' | 'json' | 'boolean' | 'number' | 'any';
  label: string;
  required?: boolean;
}

export interface NodeConfig {
  [key: string]: unknown;
}

/**
 * Narrative override for a node, consumed by Story view.
 * Reserved in schema v2 — nothing reads it yet, but it must survive
 * save → load → save round-trips (see docs/STORY_AND_PATTERNS.md §4).
 */
export interface StoryMeta {
  title?: string;
  summary?: string;
  /** Semantic role: 'greet' | 'understand' | 'answer' | 'escalate' | ... */
  role?: string;
}

/**
 * A pattern instance: a composite block that owns children and expands
 * into an editable subgraph. Reserved in schema v2 (Story & Patterns §5).
 */
export interface PatternInstance {
  /** e.g. 'pattern.rag_with_citations' */
  patternId: string;
  /** Template version, the anchor for migrating an instance. */
  patternVersion: number;
  /** One clean parameter form, not N loose nodes. */
  params: Record<string, unknown>;
  /** Human sentence rendered on the collapsed card. */
  summary: string;
  /**
   * Declared entry/exit boundary (Story & Patterns §5). Optional: when absent,
   * `expandPatterns()` falls back to child topology. See PatternBoundary.
   */
  boundary?: PatternBoundary;
  /**
   * Where each param lands on the children's config (Story & Patterns §5/§6),
   * copied from the template at instantiation. Optional and additive: with no
   * bindings, params stay on the instance alone (the collapsed-card form).
   */
  bindings?: PatternBinding[];
  /** UI state only — never persisted as meaningful state. */
  expanded: boolean;
}

/**
 * Binds one pattern param onto a child's config (Story & Patterns §5/§6).
 * Declared as data so expansion stays pattern-agnostic: `node` is a **local**
 * child id and `config` is a config key (a dotted path is allowed, e.g.
 * `loopDetector.maxSameToolCalls`).
 */
export interface PatternBinding {
  /** Param name on `PatternInstance.params`. */
  param: string;
  /** Local (un-prefixed) child id the value is written to. */
  node: string;
  /** Config key on that child, dot-separated for nested objects. */
  config: string;
}

/**
 * A pattern's declared entry/exit boundary. The container exposes these handles;
 * `expandPatterns()` wires the container's external edges to the named children
 * instead of guessing from topology (Story & Patterns §5/§9-Q1).
 */
export interface PatternBoundary {
  /** Local (un-prefixed) child id that the container's input edge connects to. */
  entry: string;
  /**
   * Output handle id → local child id that produces it. Use `'*'` as the
   * default for edges that carry no `sourceHandle`.
   */
  exits: Record<string, string>;
}

export interface NodeData {
  config: NodeConfig;
  label?: string;
  description?: string;
  icon?: string;
  color?: string;
  /**
   * Canonical domain type for renderer nodes (schema v2).
   * Every module must resolve a node's type through
   * `domainTypeOf()` in src/canvas/domain.ts — never read this (or the
   * legacy `type`) directly, so the one migration path stays the only path.
   */
  nodeType?: NodeType;
  /** Narrative override. Reserved; see StoryMeta. */
  story?: StoryMeta;
  /** Set iff this node is a pattern instance. Reserved; see PatternInstance. */
  pattern?: PatternInstance;
  /**
   * Legacy (pre-v2) location of the domain type.
   * Read by the normalizer during migration, never written by new code.
   * @deprecated use `domainTypeOf()`
   */
  type?: NodeType;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  /** Set when the node is owned by a pattern/subflow container. */
  parentId?: string;
  /** React Flow containment: keep the child inside its parent container. */
  extent?: 'parent';
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
}

export interface FlowGraph {
  id: string;
  name: string;
  version: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata?: FlowMetadata;
  /**
   * Schema version, stamped by `normalizeFlow()` on save and read on load.
   * A v1 flow (no stamp) migrates silently. Migration anchor for the
   * composition fields reserved in Story & Patterns §4/§7.
   */
  flowSchemaVersion?: number;
}

export interface FlowMetadata {
  guardrails?: GuardrailConfig[];
  deployment?: DeploymentConfig;
  [key: string]: unknown;
}

export interface GuardrailConfig {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface DeploymentConfig {
  channel: ChannelId;
  telephony?: {
    provider: string;
    number?: string;
  };
  regions?: string[];
}

// Execution Types

export interface ExecutionContext {
  sessionId: string;
  userId: string;
  channel: ChannelId;
  variables: Map<string, unknown>;
  audioStream?: AsyncIterable<AudioChunk>;
  voiceState: VoiceState;
  guardrails: GuardrailResult[];
  auditLog: AuditEvent[];
  costAccumulator: number;
  toolRegistry: ToolRegistry;
  mcpClients: Map<string, unknown>;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  bargeInEnabled: boolean;
  currentIntent?: string;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  sampleRate: number;
}

export interface NodeResult {
  outputs: Record<string, unknown>;
  nextNodes: string[];
  audioOutput?: AudioChunk[];
  shouldSpeak?: boolean;
  shouldListen?: boolean;
  variableUpdates: Record<string, unknown>;
  guardrailViolations: GuardrailViolation[];
  auditEvents: AuditEvent[];
}

export interface GuardrailResult {
  id: string;
  type: string;
  passed: boolean;
  violations: GuardrailViolation[];
}

export interface GuardrailViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: string;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  nodeId: string;
  eventType: 'start' | 'complete' | 'error' | 'guardrail' | 'tool_call';
  data: Record<string, unknown>;
  latencyMs: number;
}

export interface ToolRegistry {
  tools: ToolDefinition[];
  getTool(name: string): ToolDefinition | undefined;
}

export interface ToolDefinition {
  name: string;
  description: string;
  type: 'http' | 'mcp' | 'function';
  config: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

// Node Definition (for custom node registration)

export interface NodeDefinition {
  type: NodeType;
  category: 'voice' | 'chat' | 'agentic' | 'deterministic' | 'control' | 'governance' | 'integration' | 'gateway';
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  configSchema: ConfigSchemaField[];
  /** Default config values for this node type (overridden per instance). */
  config?: NodeConfig;
  /**
   * Execute with the effective config (defaults merged with the
   * instance's data.config by the engine). Never read per-instance
   * values from the definition object.
   */
  execute: (context: ExecutionContext, config: NodeConfig) => Promise<NodeResult>;
  validate: (config: NodeConfig) => ValidationResult;
  /**
   * Optional human sentence for the node card and Story view
   * ("Classify intent using gpt-4o-mini, 6 intents"). Falls back to a
   * derived summary when absent — see src/canvas/summary.ts.
   */
  summarize?: (config: NodeConfig) => string;
}

export interface ConfigSchemaField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json' | 'password';
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
  placeholder?: string;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}
