/**
 * Local metrics recorder — canvas-feature substitute for the platform's
 * Observability service. Keeps the same call surface the FlowEngine uses
 * (`recordFlowExecution` / `recordNodeExecution`) so the engine stays
 * drop-in compatible with the platform's `monitoringService` when the
 * feature is embedded into a larger product.
 *
 * Metrics buffer in memory; hosts can subscribe to consume them.
 */

export interface FlowMetric {
  kind: 'flow';
  flowId: string;
  latencyMs: number;
  cost: number;
  tokenCount: number;
  success: boolean;
  errorType?: string;
  at: number;
}

export interface NodeMetric {
  kind: 'node';
  flowId: string;
  nodeId: string;
  latencyMs: number;
  success: boolean;
  guardrailViolations: number;
  cost: number;
  at: number;
}

export type Metric = FlowMetric | NodeMetric;

type Listener = (metric: Metric) => void;

const buffer: Metric[] = [];
const MAX_BUFFER = 500;
const listeners = new Set<Listener>();

function push(metric: Metric): void {
  buffer.push(metric);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  listeners.forEach(l => l(metric));
}

export function onMetric(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function metricsSnapshot(): readonly Metric[] {
  return buffer;
}

export function resetMetrics(): void {
  buffer.length = 0;
}

export const monitoringService = {
  recordFlowExecution(
    flowId: string,
    data: { latencyMs: number; cost: number; tokenCount: number; success: boolean; errorType?: string }
  ): void {
    push({ kind: 'flow', flowId, ...data, at: Date.now() });
  },
  recordNodeExecution(
    flowId: string,
    nodeId: string,
    data: { latencyMs: number; success: boolean; guardrailViolations?: number; cost?: number }
  ): void {
    push({
      kind: 'node',
      flowId,
      nodeId,
      latencyMs: data.latencyMs,
      success: data.success,
      guardrailViolations: data.guardrailViolations ?? 0,
      cost: data.cost ?? 0,
      at: Date.now()
    });
  }
};
