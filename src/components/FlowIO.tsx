/**
 * Flow Import/Export — save and load flow definitions
 * 
 * Supports:
 * - Export to JSON (download)
 * - Import from JSON (upload)
 * - Import from LangGraph Python code
 * - Export to LangGraph Python code
 */

import React, { useCallback } from 'react';
import { FlowGraph } from '../types/node';
import { LangGraphAdapter } from '../adapters/langgraph/LangGraphAdapter';

interface FlowIOProps {
  flow: FlowGraph;
  onImport: (flow: FlowGraph) => void;
}

export const FlowIO: React.FC<FlowIOProps> = ({ flow, onImport }) => {
  // Export flow as JSON
  const exportJSON = useCallback(() => {
    const json = JSON.stringify(flow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name.replace(/\s+/g, '_')}_v${flow.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [flow]);

  // Export flow as LangGraph Python code
  const exportLangGraph = useCallback(() => {
    const pythonCode = LangGraphAdapter.exportToLangGraph(flow);
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name.replace(/\s+/g, '_')}.py`;
    a.click();
    URL.revokeObjectURL(url);
  }, [flow]);

  // Import flow from JSON
  const importJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importedFlow = JSON.parse(text) as FlowGraph;
        onImport(importedFlow);
      } catch (error) {
        alert(`Import failed: ${error}`);
      }
    };
    input.click();
  }, [onImport]);

  // Copy flow JSON to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(flow, null, 2));
    alert('Flow JSON copied to clipboard');
  }, [flow]);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={exportJSON}
        style={buttonStyle}
        title="Export as JSON"
      >
        💾 Export JSON
      </button>
      <button
        onClick={exportLangGraph}
        style={buttonStyle}
        title="Export as LangGraph Python"
      >
        🐍 Export Python
      </button>
      <button
        onClick={importJSON}
        style={buttonStyle}
        title="Import from JSON"
      >
        📂 Import
      </button>
      <button
        onClick={copyToClipboard}
        style={buttonStyle}
        title="Copy to clipboard"
      >
        📋 Copy
      </button>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 4,
  border: '1px solid #333',
  background: '#1a1a2e',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 12
};
