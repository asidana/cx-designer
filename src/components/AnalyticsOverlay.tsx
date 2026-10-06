/**
 * Analytics Overlay — visualize flow performance on the canvas
 * 
 * Shows:
 * - Node execution time (color-coded)
 * - Cost per node
 * - Error rates
 * - Traffic flow
 * - Drop-off points
 */

import React from 'react';
import { Node, Edge } from 'reactflow';

interface AnalyticsOverlayProps {
  nodes: Node[];
  edges: Edge[];
  metrics: Map<string, NodeMetrics>;
}

interface NodeMetrics {
  avgLatencyMs: number;
  avgCost: number;
  errorRate: number;
  executionCount: number;
  lastExecuted?: number;
}

export const AnalyticsOverlay: React.FC<AnalyticsOverlayProps> = ({ nodes, edges, metrics }) => {
  // Calculate max values for normalization
  const maxLatency = Math.max(...Array.from(metrics.values()).map(m => m.avgLatencyMs), 1);
  const maxCost = Math.max(...Array.from(metrics.values()).map(m => m.avgCost), 0.01);

  // Get color based on latency (green → yellow → red)
  const getLatencyColor = (latencyMs: number): string => {
    const ratio = latencyMs / maxLatency;
    if (ratio < 0.3) return '#10b981'; // green
    if (ratio < 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  // Get color based on cost (green → red)
  const getCostColor = (cost: number): string => {
    const ratio = cost / maxCost;
    if (ratio < 0.3) return '#10b981';
    if (ratio < 0.6) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      right: 16,
      zIndex: 50,
      background: 'rgba(15, 15, 26, 0.95)',
      border: '1px solid #333',
      borderRadius: 8,
      padding: 12,
      width: 220,
      maxHeight: 400,
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>📊 Analytics</h3>
      
      {/* Legend */}
      <div style={{ marginBottom: 12, fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }} />
          <span style={{ color: '#aaa' }}>Fast (&lt;30%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }} />
          <span style={{ color: '#aaa' }}>Medium (30-60%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }} />
          <span style={{ color: '#aaa' }}>Slow (&gt;60%)</span>
        </div>
      </div>

      {/* Node metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nodes.map((node) => {
          const metric = metrics.get(node.id);
          if (!metric) return null;

          return (
            <div
              key={node.id}
              style={{
                padding: 8,
                background: '#1a1a2e',
                borderRadius: 4,
                borderLeft: `3px solid ${getLatencyColor(metric.avgLatencyMs)}`
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                {node.data?.label || node.id}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#888' }}>Latency</span>
                <span style={{ color: getLatencyColor(metric.avgLatencyMs), fontFamily: 'monospace' }}>
                  {metric.avgLatencyMs.toFixed(0)}ms
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#888' }}>Cost</span>
                <span style={{ color: getCostColor(metric.avgCost), fontFamily: 'monospace' }}>
                  ${metric.avgCost.toFixed(4)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#888' }}>Errors</span>
                <span style={{ color: metric.errorRate > 0.1 ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>
                  {(metric.errorRate * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#888' }}>Runs</span>
                <span style={{ color: '#aaa', fontFamily: 'monospace' }}>
                  {metric.executionCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #333' }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Total Executions</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {Array.from(metrics.values()).reduce((sum, m) => sum + m.executionCount, 0)}
        </div>
      </div>
    </div>
  );
};
