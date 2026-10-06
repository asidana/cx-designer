/**
 * Validation Panel — show flow validation results
 */

import React from 'react';
import { ValidationResult } from '../validation/FlowValidator';

interface ValidationPanelProps {
  result: ValidationResult;
  onClose: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ result, onClose }) => {
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
        <h2 style={{ margin: 0, fontSize: 16 }}>
          {result.valid ? '✅' : '❌'} Validation
        </h2>
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        <StatBox label="Nodes" value={result.stats.nodeCount} />
        <StatBox label="Edges" value={result.stats.edgeCount} />
        <StatBox label="Entry" value={result.stats.entryNodeCount} />
        <StatBox label="Orphaned" value={result.stats.orphanedNodeCount} />
      </div>

      {/* Issues */}
      {result.issues.length > 0 ? (
        <div>
          <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
            Issues ({result.issues.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.issues.map((issue, index) => (
              <div
                key={index}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  background: issue.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                             issue.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                             'rgba(99, 102, 241, 0.1)',
                  borderLeft: `3px solid ${
                    issue.type === 'error' ? '#ef4444' :
                    issue.type === 'warning' ? '#f59e0b' :
                    '#6366f1'
                  }`
                }}
              >
                <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
                  {issue.type.toUpperCase()}
                </div>
                <div style={{ fontSize: 13 }}>{issue.message}</div>
                {issue.nodeId && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    Node: {issue.nodeId}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20, color: '#10b981' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14 }}>No issues found!</div>
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div style={{
    padding: 8,
    background: '#1a1a2e',
    borderRadius: 4,
    textAlign: 'center'
  }}>
    <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
  </div>
);
