/**
 * Core Node Interface — the sacred contract.
 * Every framework (LangGraph, Strands, ADK, LangChain) adapts to this.
 */

export type NodeType =
  // Voice Layer
  | 'voice.input'
  | 'voice.output'
  | 'voice.turn_detection'
  | 'voice.preprocessing'
  // Agentic Layer
  | 'agentic.intent_classifier'
  | 'agentic.reasoning_loop'
  | 'agentic.planning'
  | 'agentic.rag'
  | 'agentic.memory'
  | 'agentic.langgraph'
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
  | 'gateway.custom';

export interface HandleDefinition {
  id: string;
  type: 'audio' | 'text' | 'json' | 'boolean' | 'number' | 'any';
  label: string;
  required?: boolean;
}

export interface NodeConfig {
  [key: string]: unknown;
}

export interface NodeData {
  config: NodeConfig;
  label?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
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
  channel: 'voice' | 'chat' | 'sms';
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
  channel: 'voice' | 'chat' | 'sms';
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

// Node Definition (for custom node registration)

export interface NodeDefinition {
  type: NodeType;
  category: 'voice' | 'agentic' | 'deterministic' | 'control' | 'governance' | 'integration' | 'gateway';
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  configSchema: ConfigSchemaField[];
  execute: (context: ExecutionContext) => Promise<NodeResult>;
  validate: (config: NodeConfig) => ValidationResult;
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
