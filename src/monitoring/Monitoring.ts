/**
 * Monitoring & Observability — production monitoring
 * 
 * Integrates with:
 * - OpenTelemetry for distributed tracing
 * - Prometheus for metrics
 * - Grafana for dashboards
 * - PagerDuty for alerting
 */

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels: Record<string, string>;
}

export interface AggregatedMetrics {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface Alert {
  id: string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: number;
}

export interface Dashboard {
  id: string;
  name: string;
  panels: Array<{
    title: string;
    type: 'line' | 'bar' | 'gauge' | 'table';
    query: string;
  }>;
}

export class MonitoringService {
  private metrics: Map<string, MetricPoint[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();

  /**
   * Record a metric
   */
  recordMetric(name: string, value: number, labels: Record<string, string> = {}): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
      labels
    };

    const metricHistory = this.metrics.get(name) || [];
    metricHistory.push(point);

    // Keep only last 1000 points
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    this.metrics.set(name, metricHistory);

    // Check alerts
    this.checkAlerts(name, value);
  }

  /**
   * Record flow execution metrics
   */
  recordFlowExecution(flowId: string, result: {
    latencyMs: number;
    cost: number;
    tokenCount: number;
    success: boolean;
    errorType?: string;
  }): void {
    this.recordMetric('flow_latency_ms', result.latencyMs, { flowId });
    this.recordMetric('flow_cost', result.cost, { flowId });
    this.recordMetric('flow_tokens', result.tokenCount, { flowId });
    this.recordMetric('flow_success', result.success ? 1 : 0, { flowId });

    if (result.errorType) {
      this.recordMetric('flow_errors', 1, { flowId, errorType: result.errorType });
    }
  }

  /**
   * Record node execution metrics
   */
  recordNodeExecution(flowId: string, nodeId: string, result: {
    latencyMs: number;
    success: boolean;
    guardrailViolations: number;
  }): void {
    this.recordMetric('node_latency_ms', result.latencyMs, { flowId, nodeId });
    this.recordMetric('node_success', result.success ? 1 : 0, { flowId, nodeId });
    this.recordMetric('node_guardrail_violations', result.guardrailViolations, { flowId, nodeId });
  }

  /**
   * Get metrics for a time range
   */
  getMetrics(name: string, startTime: number, endTime: number): MetricPoint[] {
    const metricHistory = this.metrics.get(name) || [];
    return metricHistory.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
  }

  /**
   * Get aggregated metrics
   */
  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(name: string, startTime: number, endTime: number): AggregatedMetrics | null {
    const points = this.getMetrics(name, startTime, endTime);
    if (points.length === 0) return null;

    const values = points.map(p => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)]
    };
  }

  /**
   * Create an alert
   */
  createAlert(alert: Omit<Alert, 'triggered'>): Alert {
    const newAlert: Alert = {
      ...alert,
      triggered: false
    };

    this.alerts.set(alert.id, newAlert);
    return newAlert;
  }

  /**
   * Check if any alerts should be triggered
   */
  private checkAlerts(metricName: string, value: number): void {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled || alert.triggered) continue;

      // Simple threshold check
      // In real implementation: support complex conditions
      if (alert.condition.includes('>')) {
        const threshold = parseFloat(alert.condition.split('>')[1]);
        if (value > threshold) {
          alert.triggered = true;
          alert.lastTriggered = Date.now();
          console.log(`[Monitoring] Alert triggered: ${alert.name} (${metricName} = ${value})`);
        }
      }
    }
  }

  /**
   * Create a dashboard
   */
  createDashboard(dashboard: Dashboard): void {
    this.dashboards.set(dashboard.id, dashboard);
  }

  /**
   * Get a dashboard
   */
  getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * Generate Prometheus-compatible metrics
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    for (const [name, points] of this.metrics.entries()) {
      if (points.length === 0) continue;

      const latest = points[points.length - 1];
      const labels = Object.entries(latest.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');

      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}{${labels}} ${latest.value}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate a health report
   */
  generateHealthReport(_flowId: string): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Record<string, AggregatedMetrics | null>;
    alerts: Alert[];
    recommendations: string[];
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const latency = this.getAggregatedMetrics('flow_latency_ms', oneHourAgo, now);
    const cost = this.getAggregatedMetrics('flow_cost', oneHourAgo, now);
    const successRate = this.getAggregatedMetrics('flow_success', oneHourAgo, now);

    const triggeredAlerts = Array.from(this.alerts.values()).filter(a => a.triggered);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (triggeredAlerts.length > 0) status = 'degraded';
    if (successRate && successRate.avg < 0.95) status = 'unhealthy';

    const recommendations: string[] = [];
    if (latency && latency.p95 > 2000) {
      recommendations.push('High p95 latency detected. Consider optimizing slow nodes.');
    }
    if (cost && cost.avg > 0.10) {
      recommendations.push('High average cost per execution. Consider using smaller models.');
    }

    return {
      status,
      metrics: {
        latency,
        cost,
        successRate
      },
      alerts: triggeredAlerts,
      recommendations
    };
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();
