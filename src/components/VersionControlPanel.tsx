/**
 * Version Control Panel — manage flow versions
 */

import React, { useState, useEffect } from 'react';
import { versionControl, FlowVersion, VersionDiff } from '../versioning/VersionControl';
import { FlowGraph } from '../types/node';

interface VersionControlPanelProps {
  flowId: string;
  currentFlow: FlowGraph;
  onRestore: (flow: FlowGraph) => void;
  onVisualDiff: (diff: VersionDiff | null) => void;
  onClose: () => void;
}

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  flowId,
  currentFlow,
  onRestore,
  onVisualDiff,
  onClose
}) => {
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const [diff, setDiff] = useState<VersionDiff | null>(null);

  useEffect(() => {
    setVersions(versionControl.getVersions(flowId));
  }, [flowId]);

  const handleCreateVersion = () => {
    const name = prompt('Version name:');
    if (!name) return;

    const description = prompt('Description:') || '';
    versionControl.createVersion(flowId, currentFlow, name, description, 'user');
    setVersions(versionControl.getVersions(flowId));
  };

  const handleRollback = (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this version?')) return;

    const flow = versionControl.rollback(flowId, versionId);
    if (flow) {
      onRestore(flow);
      setVersions(versionControl.getVersions(flowId));
    }
  };

  const handleCompare = () => {
    if (!selectedVersion || !compareVersion) return;

    const result = versionControl.compareVersions(flowId, selectedVersion, compareVersion);
    setDiff(result);
    onVisualDiff(result);
  };

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
        <h2 style={{ margin: 0, fontSize: 16 }}>📝 Version History</h2>
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

      {/* Create version */}
      <button
        onClick={handleCreateVersion}
        style={{
          width: '100%',
          padding: 10,
          borderRadius: 6,
          border: 'none',
          background: '#8b5cf6',
          color: 'white',
          cursor: 'pointer',
          fontSize: 13,
          marginBottom: 16
        }}
      >
        + Create Version
      </button>

      {/* Version list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#666', fontSize: 13 }}>
            No versions yet. Create your first version!
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              style={{
                padding: 12,
                background: '#1a1a2e',
                borderRadius: 6,
                borderLeft: `3px solid ${selectedVersion === version.id ? '#8b5cf6' : 'transparent'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{version.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    v{version.version} • {new Date(version.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setSelectedVersion(version.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: selectedVersion === version.id ? '#8b5cf6' : '#333',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 11
                    }}
                  >
                    Select
                  </button>
                  <button
                    onClick={() => handleRollback(version.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: 'none',
                      background: '#ef4444',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 11
                    }}
                  >
                    Restore
                  </button>
                </div>
              </div>
              {version.description && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  {version.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Compare */}
      {selectedVersion && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #333' }}>
          <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
            Compare Versions
          </h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select
              value={compareVersion || ''}
              onChange={(e) => setCompareVersion(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 4,
                border: '1px solid #333',
                background: '#1a1a2e',
                color: 'white',
                fontSize: 12
              }}
            >
              <option value="">Select version...</option>
              {versions
                .filter((v) => v.id !== selectedVersion)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (v{v.version})
                  </option>
                ))}
            </select>
            <button
              onClick={handleCompare}
              disabled={!compareVersion}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: 'none',
                background: compareVersion ? '#6366f1' : '#333',
                color: 'white',
                cursor: compareVersion ? 'pointer' : 'not-allowed',
                fontSize: 12
              }}
            >
              Compare
            </button>
          </div>

          {diff && (
            <div style={{ fontSize: 12 }}>
              {diff.added.length > 0 && (
                <div style={{ color: '#10b981', marginBottom: 4 }}>
                  + Added: {diff.added.join(', ')}
                </div>
              )}
              {diff.removed.length > 0 && (
                <div style={{ color: '#ef4444', marginBottom: 4 }}>
                  - Removed: {diff.removed.join(', ')}
                </div>
              )}
              {diff.modified.length > 0 && (
                <div style={{ color: '#f59e0b' }}>
                  ~ Modified: {diff.modified.map((m) => m.nodeId).join(', ')}
                </div>
              )}
              {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 && (
                <div style={{ color: '#888' }}>No differences found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
