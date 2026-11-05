/**
 * Validation Panel — show flow validation results
 */

import React from 'react';
import { ValidationResult } from '../validation/FlowValidator';
import { theme } from '../design/themeRuntime';
import { Z } from './ui';

interface ValidationPanelProps {
  result: ValidationResult;
  onClose?: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ result, onClose, onSelectNode }) => {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Flow validation results"
      style={{
      position: 'absolute',
      top: 60,
      right: 16,
      zIndex: Z.panel,
      background: theme.panel,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 20,
      width: 400,
      maxHeight: '70vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: theme.text }}>
          {result.valid ? '✅' : '❌'} Validation
        </h2>
        <button
          onClick={() => onClose?.()}
          aria-label="Close validation panel"
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.muted,
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
        <div role="alert">
          <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: theme.muted, marginBottom: 8 }}>
            Issues ({result.issues.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.issues.map((issue, index) => (
              <div
                key={index}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  background: issue.type === 'error' ? `${theme.danger}1a` :
                             issue.type === 'warning' ? `${theme.warn}1a` :
                             `${theme.accent}1a`,
                  borderLeft: `3px solid ${
                    issue.type === 'error' ? theme.danger :
                    issue.type === 'warning' ? theme.warn :
                    theme.accent
                  }`
                }}
              >
                <div style={{ fontSize: 11, color: theme.muted, marginBottom: 2 }}>
                  {issue.type.toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: theme.text }}>{issue.message}</div>
                {issue.nodeId && (
                  onSelectNode ? (
                    <button
                      onClick={() => onSelectNode(issue.nodeId!)}
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: theme.info,
                        textDecoration: 'underline'
                      }}
                    >
                      Node: {issue.nodeId} — jump to node
                    </button>
                  ) : (
                    <div style={{ fontSize: 11, color: theme.subtle, marginTop: 4 }}>
                      Node: {issue.nodeId}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 20, color: theme.success }}>
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
    background: theme.input,
    borderRadius: 4,
    textAlign: 'center'
  }}>
    <div style={{ fontSize: 18, fontWeight: 600, color: theme.text }}>{value}</div>
    <div style={{ fontSize: 11, color: theme.muted }}>{label}</div>
  </div>
);
