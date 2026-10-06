/**
 * Help Panel — documentation and keyboard shortcuts
 */

import React, { useState } from 'react';

export const HelpPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'docs' | 'about'>('shortcuts');

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      background: 'rgba(15, 15, 26, 0.98)',
      border: '1px solid #333',
      borderRadius: 12,
      padding: 24,
      width: 600,
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>❓ Help</h2>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['shortcuts', 'docs', 'about'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              background: activeTab === tab ? '#8b5cf6' : '#1a1a2e',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12,
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'shortcuts' && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Keyboard Shortcuts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ShortcutItem keys={['Ctrl', 'Z']} description="Undo" />
            <ShortcutItem keys={['Ctrl', 'Shift', 'Z']} description="Redo" />
            <ShortcutItem keys={['Ctrl', 'S']} description="Save" />
            <ShortcutItem keys={['Ctrl', 'D']} description="Duplicate node" />
            <ShortcutItem keys={['Delete']} description="Delete selected" />
            <ShortcutItem keys={['Ctrl', 'A']} description="Select all" />
            <ShortcutItem keys={['Space']} description="Pan canvas" />
            <ShortcutItem keys={['Ctrl', '+']} description="Zoom in" />
            <ShortcutItem keys={['Ctrl', '-']} description="Zoom out" />
            <ShortcutItem keys={['Ctrl', '0']} description="Reset zoom" />
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Quick Start</h3>
          <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            <p><strong>1. Add nodes</strong> — Drag nodes from the palette onto the canvas</p>
            <p><strong>2. Connect nodes</strong> — Drag from an output handle to an input handle</p>
            <p><strong>3. Configure</strong> — Click a node to edit its configuration</p>
            <p><strong>4. Test</strong> — Click the 🧪 button to test your flow</p>
            <p><strong>5. Deploy</strong> — Export your flow as JSON or Python code</p>
          </div>

          <h3 style={{ fontSize: 14, margin: '16px 0 12px' }}>Node Categories</h3>
          <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            <p><strong>Voice</strong> — STT, TTS, VAD, barge-in</p>
            <p><strong>Agentic</strong> — Intent classification, reasoning, RAG, memory</p>
            <p><strong>Deterministic</strong> — Slot collection, business rules, handoff</p>
            <p><strong>Control</strong> — Routing, parallel, wait, sub-flows</p>
            <p><strong>Governance</strong> — Guardrails, evals, audit</p>
            <p><strong>Integration</strong> — HTTP, telephony, webhooks, database</p>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>Agentic CX Designer</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            A visual voice agent builder — Flowise-class, but purpose-built for AI voice agents.
          </p>
          <p style={{ fontSize: 12, color: '#666' }}>
            Version 0.1.0 • Built with React Flow + FastAPI
          </p>
        </div>
      )}
    </div>
  );
};

const ShortcutItem: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 13 }}>{description}</span>
    <div style={{ display: 'flex', gap: 4 }}>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: '#666', fontSize: 11 }}>+</span>}
          <kbd style={{
            padding: '2px 6px',
            borderRadius: 4,
            background: '#333',
            fontSize: 11,
            fontFamily: 'monospace'
          }}>
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  </div>
);
