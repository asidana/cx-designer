/**
 * Monitoring Dashboard — production monitoring
 */

import React, { useState, useEffect } from 'react';
import { monitoringService } from '../monitoring/Monitoring';

interface MonitoringDashboardProps {
  flowId: string;
  onClose: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ flowId, onClose }) => {
  const [healthReport, setHealthReport] = useState<ReturnType<typeof monitoringService.generateHealthReport> | null>(null);

  useEffect(() => {
    const update = () => {
      setHealthReport(monitoringService.generateHealthReport(flowId));
    };

    update();
    const interval = setInterval(update, 5000);

    return () => clearInterval(interval);
  }, [flowId]);

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      right: 16,
      zIndex: 100,
      background: 'rgba(15, 15, 26, 0.98)',
      border: '1px solid #333',
      borderRadius: 12,
      padding: 20,
      width: 400,
      maxHeight: '70vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>📊 Monitoring</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18
          }}
        >
          ×
        </button>
      </div>

      {healthReport ? (
        <>
          {/* Status */}
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: healthReport.status === 'healthy' ? 'rgba(16, 185, 129, 0.1)' :
                       healthReport.status === 'degraded' ? 'rgba(245, 158, 11, 0.1)' :
                       'rgba(239, 68, 68, 0.1)',
            borderLeft: `3px solid ${
              healthReport.status === 'healthy' ? '#10b981' :
              healthReport.status === 'degraded' ? '#f59e0b' :
              '#ef4444'
            }`,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>
              {healthReport.status}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
            {healthReport.metrics.latency && (
              <MetricCard
                label="Avg Latency"
                value={`${(healthReport.metrics.latency as any).avg.toFixed(0)}ms`}
                subValue={`p95: ${(healthReport.metrics.latency as any).p95.toFixed(0)}ms`}
              />
            )}
            {healthReport.metrics.cost && (
              <MetricCard
                label="Avg Cost"
                value={`$${(healthReport.metrics.cost as any).avg.toFixed(4)}`}
                subValue={`Total: $${(healthReport.metrics.cost as any).sum.toFixed(2)}`}
              />
            )}
            {healthReport.metrics.successRate && (
              <MetricCard
                label="Success Rate"
                value={`${((healthReport.metrics.successRate as any).avg * 100).toFixed(1)}%`}
                subValue={`${(healthReport.metrics.successRate as any).count} runs`}
              />
            )}
            <MetricCard
              label="Alerts"
              value={healthReport.alerts.length.toString()}
              subValue={healthReport.alerts.length > 0 ? 'Active' : 'None'}
            />
          </div>

          {/* Recommendations */}
          {healthReport.recommendations.length > 0 && (
            <div>
              <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
                Recommendations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {healthReport.recommendations.map((rec, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#aaa', padding: '4px 0' }}>
                    • {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {healthReport.alerts.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
                Active Alerts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {healthReport.alerts.map((alert) => (
                  <div key={alert.id} style={{
                    padding: 8,
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    <div style={{ fontWeight: 500 }}>{alert.name}</div>
                    <div style={{ color: '#888' }}>{alert.condition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
          No monitoring data available
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; subValue?: string }> = ({
  label,
  value,
  subValue
}) => (
  <div style={{
    padding: 12,
    background: '#1a1a2e',
    borderRadius: 6,
    textAlign: 'center'
  }}>
    <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
    {subValue && <div style={{ fontSize: 10, color: '#666' }}>{subValue}</div>}
  </div>
);
