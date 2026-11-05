/**
 * agentic-cx-designer — canvas feature public API.
 *
 * Everything a host needs to embed the drag-and-drop agent flow canvas:
 *
 *   import { CanvasDesigner, CanvasDesignerHandle } from 'agentic-cx-designer/designer';
 *
 * See ../../../docs/EMBEDDING.md for the embedding contract.
 */

export { CanvasDesigner } from './CanvasDesigner';
export type {
  CanvasDesignerProps,
  CanvasDesignerHandle,
  CanvasDesignerFeatures
} from './CanvasDesigner';
export { ghostButtonStyle } from './CanvasDesigner';

// Types
export type {
  FlowGraph,
  FlowNode,
  FlowEdge,
  FlowMetadata,
  NodeType,
  NodeConfig,
  NodeData,
  NodeDefinition,
  ConfigSchemaField,
  HandleDefinition,
  ValidationResult,
  ExecutionContext,
  NodeResult,
  StoryMeta,
  PatternInstance,
  PatternBinding,
  PatternBoundary
} from './types/node';

// Registry + custom nodes
export { nodeRegistry } from './nodes/registry';
export {
  syncCustomNodes,
  customNodeDefinition,
  behaviorPreset,
  CUSTOM_NODE_PREFIX,
  type CustomNodeRecord
} from './nodes/custom';

// Engine
export { FlowEngine, type TraceCallback } from './engine/flowEngine';
export { FlowValidator, type ValidationIssue } from './validation/FlowValidator';

// Normalization (returns a canonical, engine-ready graph)
export {
  normalizeFlow,
  normalizeNode,
  normalizeEdge,
  normalizeCanvasNodes,
  domainTypeOf,
  hasDomainType,
  CURRENT_RENDERER_TYPE,
  FLOW_SCHEMA_VERSION
} from './canvas/domain';

// History / persistence (exported for hosts that want to drive them)
export { historyManager } from './history/HistoryManager';
export { autoSave } from './autosave/AutoSave';
export { versionControl, type FlowVersion, type VersionDiff } from './versioning/VersionControl';
export { monitoringService, onMetric, metricsSnapshot, type Metric } from './engine/metrics';
