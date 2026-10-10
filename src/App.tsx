/**
 * Agentic CX Designer — Main Application
 * 
 * A visual canvas for building AI voice agents.
 * Built with React Flow + Zustand.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeRegistry } from './nodes';
import { FlowEngine } from './engine/flowEngine';
import { ConfigForm } from './components/ConfigForm';
import { TestConsole } from './components/TestConsole';
import { FlowIO } from './components/FlowIO';
import { AnalyticsOverlay } from './components/AnalyticsOverlay';
import { AIGenerator } from './components/AIGenerator';
import { PluginMarketplace } from './components/PluginMarketplace';
import { TemplateGallery } from './components/TemplateGallery';
import { ValidationPanel } from './components/ValidationPanel';
import { PreflightPanel, lintFlow } from './components/PreflightPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { HelpPanel } from './components/HelpPanel';
import { Onboarding } from './components/Onboarding';
import { VersionControlPanel } from './components/VersionControlPanel';
import { ScriptView } from './components/ScriptView';
import type { VersionDiff } from './versioning/VersionControl';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { CollaborationPanel } from './components/CollaborationPanel';
import { Notifications, useNotifications } from './components/Notifications';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { historyManager } from './history/HistoryManager';
import { autoSave } from './autosave/AutoSave';
import { FlowValidator } from './validation/FlowValidator';
import { FlowGraph, FlowNode, FlowEdge, NodeType, NodeConfig } from './types/node';

// Initialize built-in nodes
import './nodes';

const App: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState('Untitled Agent');
  const [showTestConsole, setShowTestConsole] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVersionControl, setShowVersionControl] = useState(false);
  const [showScriptView, setShowScriptView] = useState(false);
  const [visualDiff, setVisualDiff] = useState<VersionDiff | null>(null);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [flowVersion, setFlowVersion] = useState('1.0.0');
  const [settings, setSettings] = useState({
    theme: 'dark',
    autoSave: true,
    autoSaveInterval: 5000,
    defaultModel: 'gpt-4o',
    defaultSTT: 'deepgram',
    defaultTTS: 'elevenlabs',
    language: 'en',
    notifications: true,
    sounds: true
  });

  const { notifications, dismissNotification, success, error } = useNotifications();

  // Structural-change history (add/delete/import only — drags don't pollute undo)
  const pendingHistoryLabel = useRef<string | null>(null);
  useEffect(() => {
    if (pendingHistoryLabel.current) {
      const label = pendingHistoryLabel.current;
      pendingHistoryLabel.current = null;
      historyManager.record(
        {
          id: 'flow_1',
          name: flowName,
          version: flowVersion,
          nodes: nodes as FlowNode[],
          edges: edges as FlowEdge[]
        },
        label
      );
    }
  }, [nodes, edges, flowName, flowVersion]);

  const applyHistoryFlow = useCallback(
    (flow: FlowGraph | null) => {
      if (!flow) return;
      setNodes(flow.nodes as Node[]);
      setEdges(flow.edges as Edge[]);
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  // Delete selected node + its edges
  const deleteSelected = useCallback(() => {
    if (!selectedNode) return;
    pendingHistoryLabel.current = `Delete ${selectedNode.data?.label || 'node'}`;
    const id = selectedNode.id;
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setSelectedNode(null);
  }, [selectedNode, setEdges, setNodes]);

  // Duplicate selected node with offset
  const duplicateSelected = useCallback(() => {
    if (!selectedNode) return;
    pendingHistoryLabel.current = 'Duplicate node';
    const copy: Node = {
      ...selectedNode,
      id: `${selectedNode.data?.type || 'node'}_${Date.now()}`,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40
      },
      selected: false
    };
    setNodes((nds) => nds.concat(copy));
    setSelectedNode(copy);
  }, [selectedNode, setNodes]);

  // Manual save
  const saveFlow = useCallback(() => {
    autoSave.update({
      id: 'flow_1',
      name: flowName,
      version: flowVersion,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[]
    });
    autoSave.save();
    success('Flow saved', flowName);
  }, [nodes, edges, flowName, flowVersion, success]);

  // Select all nodes
  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  const flowInstance = useRef<ReactFlowInstance | null>(null);

  useKeyboardShortcuts({
    onUndo: () => applyHistoryFlow(historyManager.undo()),
    onRedo: () => applyHistoryFlow(historyManager.redo()),
    onSave: saveFlow,
    onDuplicate: duplicateSelected,
    onDelete: deleteSelected,
    onSelectAll: selectAll,
    onZoomIn: () => flowInstance.current?.zoomIn(),
    onZoomOut: () => flowInstance.current?.zoomOut(),
    onResetZoom: () => flowInstance.current?.fitView()
  });

  // Show onboarding on first run
  useEffect(() => {
    try {
      if (!localStorage.getItem('agentic_cx_onboarded')) {
        setShowOnboarding(true);
        localStorage.setItem('agentic_cx_onboarded', '1');
      }
    } catch {
      // localStorage unavailable (private mode) — skip onboarding
    }
  }, []);

  // Live trace state: active node pulse + per-node stats for analytics
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [nodeStats, setNodeStats] = useState(
    new Map<string, { avgLatencyMs: number; avgCost: number; errorRate: number; executionCount: number }>()
  );

  const handleTraceEvent = useCallback(
    (
      nodeId: string,
      event: 'start' | 'complete' | 'error',
      stats: { latencyMs: number; cost?: number }
    ) => {
      setActiveNodeId(nodeId);
      if (event === 'complete' || event === 'error') {
        setNodeStats(prev => {
          const next = new Map(prev);
          const cur = next.get(nodeId) || {
            avgLatencyMs: 0,
            avgCost: 0,
            errorRate: 0,
            executionCount: 0
          };
          const runs = cur.executionCount + 1;
          next.set(nodeId, {
            avgLatencyMs: (cur.avgLatencyMs * cur.executionCount + stats.latencyMs) / runs,
            avgCost: (cur.avgCost * cur.executionCount + (stats.cost || 0)) / runs,
            errorRate:
              (cur.errorRate * cur.executionCount + (event === 'error' ? 1 : 0)) / runs,
            executionCount: runs
          });
          return next;
        });
      }
    },
    []
  );

  const handleClearTrace = useCallback(() => {
    setActiveNodeId(null);
  }, []);

  const handleTraceSelectNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) setSelectedNode(node);
    },
    [nodes]
  );

  // Canvas nodes with live-trace highlight + version-diff tints.
  // Diff wins over trace pulse when a comparison is active.
  const displayNodes = useMemo(() => {
    const added = new Set(visualDiff?.added || []);
    const modified = new Set((visualDiff?.modified || []).map(m => m.nodeId));
    return nodes.map(n => {
      if (n.id === activeNodeId && !visualDiff) {
        return {
          ...n,
          style: {
            ...(n.style || {}),
            boxShadow: '0 0 0 2px #8b5cf6, 0 0 18px #8b5cf6'
          }
        };
      }
      if (added.has(n.id)) {
        return {
          ...n,
          style: {
            ...(n.style || {}),
            boxShadow: '0 0 0 2px #10b981, 0 0 14px #10b981'
          }
        };
      }
      if (modified.has(n.id)) {
        return {
          ...n,
          style: {
            ...(n.style || {}),
            boxShadow: '0 0 0 2px #f59e0b, 0 0 14px #f59e0b'
          }
        };
      }
      return n;
    });
  }, [nodes, activeNodeId, visualDiff]);

  // Preflight issue count for the toolbar badge
  const preflightCount = useMemo(
    () => lintFlow(nodes, edges).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges, flowName, flowVersion]
  );

  // Handle node connection
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  // Add a new node to the canvas.
  // Two paths, one creator (the palette's biggest job):
  // - click: smart placement at viewport center + cascade offset
  // - drag-and-drop: exact drop point via screenToFlowPosition
  // Border style encodes node kind (not color alone): dashed = AI,
  // dotted = governance, double = voice/chat, solid = deterministic/control.
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const placeCascade = useRef(0);

  const createNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      const nodeDef = nodeRegistry.get(type);
      if (!nodeDef) return;

      const borderByCategory: Record<string, { borderStyle: string; borderWidth: number }> = {
        voice: { borderStyle: 'double', borderWidth: 4 },
        chat: { borderStyle: 'double', borderWidth: 4 },
        agentic: { borderStyle: 'dashed', borderWidth: 2 },
        governance: { borderStyle: 'dotted', borderWidth: 2 },
        deterministic: { borderStyle: 'solid', borderWidth: 2 },
        control: { borderStyle: 'solid', borderWidth: 2 },
        integration: { borderStyle: 'solid', borderWidth: 2 },
        gateway: { borderStyle: 'solid', borderWidth: 2 }
      };
      const border = borderByCategory[nodeDef.category] || {
        borderStyle: 'solid',
        borderWidth: 2
      };

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type: 'default',
        position,
        style: { borderColor: nodeDef.color, ...border },
        data: {
          label: nodeDef.label,
          config: {},
          type
        }
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
      pendingHistoryLabel.current = `Add ${nodeDef.label}`;
      success('Node added', `${nodeDef.label} added to canvas`);
    },
    [setNodes, success]
  );

  const addNode = useCallback(
    (type: NodeType) => {
      // Smart click-to-add: viewport center, cascaded so repeats never stack.
      const rect = canvasRef.current?.getBoundingClientRect();
      let position = { x: 400 + Math.random() * 200, y: 300 + Math.random() * 200 };
      if (rect && flowInstance.current) {
        const center = flowInstance.current.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
        const step = (placeCascade.current % 6) * 36;
        placeCascade.current += 1;
        position = { x: center.x - 75 + step, y: center.y - 20 + step };
      }
      createNode(type, position);
    },
    [createNode]
  );

  const onDropNode = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/cx-node') as NodeType;
      if (!type || !flowInstance.current) return;
      createNode(type, flowInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [createNode]
  );

  // Update node config
  const updateNodeConfig = useCallback(
    (nodeId: string, config: NodeConfig) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
        )
      );
    },
    [setNodes]
  );

  // Execute the flow
  const executeFlow = useCallback(async () => {
    const graph: FlowGraph = {
      id: 'flow_1',
      name: flowName,
      version: flowVersion,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[]
    };

    const engine = new FlowEngine(graph);
    try {
      const result = await engine.execute('Hello, I need help with my account', 'session_1');
      console.log('Flow result:', result);
      success('Flow executed', `Cost: $${result.outputs.cost || 0}`);
    } catch (err) {
      error('Flow execution failed', String(err));
    }
  }, [nodes, edges, flowName, flowVersion, success, error]);

  // Import flow
  const importFlow = useCallback((flow: FlowGraph) => {
    pendingHistoryLabel.current = `Import ${flow.name}`;
    setNodes(flow.nodes as Node[]);
    setEdges(flow.edges as Edge[]);
    setFlowName(flow.name);
    setFlowVersion(flow.version);
    setSelectedNode(null);
    setVisualDiff(null);
    success('Flow imported', flow.name);
  }, [setNodes, setEdges, success]);

  // Validate flow
  const validateFlow = useCallback(() => {
    const graph: FlowGraph = {
      id: 'flow_1',
      name: flowName,
      version: flowVersion,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[]
    };
    return FlowValidator.validate(graph);
  }, [nodes, edges, flowName, flowVersion]);

  // Get nodes by category for the palette (with descriptions for search)
  const [paletteQuery, setPaletteQuery] = useState('');
  const paletteItems = nodeRegistry.getAll().map((node) => ({
    type: node.type,
    label: node.label,
    icon: node.icon,
    color: node.color,
    category: node.category,
    description: node.description
  }));
  const query = paletteQuery.trim().toLowerCase();
  const visiblePaletteItems = query
    ? paletteItems.filter(
        item =>
          item.label.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.category.includes(query)
      )
    : paletteItems;

  // Get selected node definition
  const selectedNodeDef = selectedNode?.data?.type
    ? nodeRegistry.get(selectedNode.data.type as NodeType)
    : null;

  // Current flow as FlowGraph
  const currentFlow: FlowGraph = {
    id: 'flow_1',
    name: flowName,
    version: flowVersion,
    nodes: nodes as FlowNode[],
    edges: edges as FlowEdge[]
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* Notifications */}
      <Notifications notifications={notifications} onDismiss={dismissNotification} />

      {/* Node Palette */}
      <div
        style={{
          width: 250,
          background: '#1a1a2e',
          color: 'white',
          padding: 16,
          overflowY: 'auto',
          borderRight: '1px solid #333'
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>🎨 Node Palette</h2>
        <input
          value={paletteQuery}
          onChange={(e) => setPaletteQuery(e.target.value)}
          placeholder="Search nodes…"
          title="Filter by name, description, or category. Drag a row onto the canvas, or click to place."
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #333',
            background: '#0f0f1a',
            color: 'white',
            fontSize: 13,
            marginBottom: 12
          }}
        />
        <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
          Drag onto canvas · or click to place
        </div>

        {['voice', 'chat', 'agentic', 'deterministic', 'control', 'governance', 'integration'].map(
          (category) => {
            const items = visiblePaletteItems.filter((item) => item.category === category);
            if (items.length === 0) return null;
            return (
            <div key={category} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888' }}>
                {category}
              </h3>
              {items
                .map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/cx-node', item.type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => addNode(item.type)}
                    title={`${item.label} — ${item.description}`}
                    style={{
                      padding: '8px 12px',
                      marginBottom: 4,
                      background: '#16213e',
                      borderRadius: 4,
                      cursor: 'grab',
                      fontSize: 13,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1e3a5f';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#16213e';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.35 }}>
                      {item.description}
                    </div>
                  </div>
                ))}
            </div>
            );
          }
        )}
        {visiblePaletteItems.length === 0 && (
          <div style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 16 }}>
            No nodes match “{paletteQuery}”.
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onDrop={onDropNode}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        style={{ flex: 1, position: 'relative' }}
      >
        {/* Toolbar */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 10,
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}
        >
          <input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #333',
              background: '#1a1a2e',
              color: 'white',
              fontSize: 14,
              width: 200
            }}
          />
          <span style={{ fontSize: 12, color: '#888' }}>v{flowVersion}</span>
          
          <div style={{ flex: 1 }} />
          
          <button
            onClick={() => setShowCollaboration(true)}
            title="Collaboration"
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            👥
          </button>
          
          <button
            onClick={() => setShowMonitoring(true)}
            title="Monitoring dashboard"
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            📈
          </button>
          
          <button
            onClick={() => setShowVersionControl(true)}
            title="Version history"
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            📝
          </button>
          
          <button
            onClick={() => setShowHelp(true)}
            title="Help & shortcuts"
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            ❓
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            ⚙️
          </button>
          
          <button
            onClick={() => setShowValidation(true)}
            title="Validate flow"
            style={{ ...toolbarButtonStyle, background: '#10b981' }}
          >
            ✅
          </button>

          <button
            onClick={() => setShowPreflight(!showPreflight)}
            title={`Preflight lint (${preflightCount} issue${preflightCount === 1 ? '' : 's'})`}
            style={{
              ...toolbarButtonStyle,
              background: showPreflight
                ? '#f59e0b'
                : preflightCount > 0
                  ? '#b45309'
                  : '#6366f1'
            }}
          >
            ✈️{preflightCount > 0 ? ` ${preflightCount}` : ''}
          </button>
          
          <button
            onClick={() => setShowTemplates(true)}
            title="Template gallery"
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            📚
          </button>

          <button
            onClick={() => setShowScriptView(!showScriptView)}
            title="Script view (linear conversation outline)"
            style={{ ...toolbarButtonStyle, background: showScriptView ? '#f59e0b' : '#6366f1' }}
          >
            📜
          </button>
          
          <button
            onClick={() => setShowAIGenerator(true)}
            title="Generate flow with AI"
            style={{ ...toolbarButtonStyle, background: '#8b5cf6' }}
          >
            🤖
          </button>
          
          <button
            onClick={() => setShowPlugins(true)}
            title="Plugin marketplace"
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            🧩
          </button>
          
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            title="Node analytics overlay"
            style={{ ...toolbarButtonStyle, background: showAnalytics ? '#f59e0b' : '#6366f1' }}
          >
            📊
          </button>
          
          <FlowIO flow={currentFlow} onImport={importFlow} />
          
          <button
            onClick={() => setShowTestConsole(!showTestConsole)}
            title="Real-time test console"
            style={{ ...toolbarButtonStyle, background: showTestConsole ? '#f59e0b' : '#6366f1' }}
          >
            🧪
          </button>
          
          <button
            onClick={executeFlow}
            title="Run flow"
            style={{ ...toolbarButtonStyle, background: '#10b981' }}
          >
            ▶
          </button>
        </div>

        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
          onInit={(instance) => {
            flowInstance.current = instance;
          }}
          fitView
          style={{ paddingTop: 60 }}
        >
          <Background color="#333" gap={16} />
          <Controls />
          {nodes.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#666',
                pointerEvents: 'none',
                zIndex: 5
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎙️</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}>
                Start with a template (📚), generate with AI (🤖),
              </div>
              <div style={{ fontSize: 15 }}>or drag nodes from the palette →</div>
            </div>
          )}
          <MiniMap
            nodeColor={(n) => {
              const type = n.data?.type as NodeType;
              const def = nodeRegistry.get(type);
              return def?.color || '#666';
            }}
          />
        </ReactFlow>

        {/* Overlays */}
        {showAnalytics && (
          <AnalyticsOverlay nodes={nodes} edges={edges} metrics={nodeStats} />
        )}

        {showAIGenerator && (
          <AIGenerator
            onGenerate={(flow) => {
              importFlow(flow);
              setShowAIGenerator(false);
            }}
            onClose={() => setShowAIGenerator(false)}
          />
        )}

        {showPlugins && <PluginMarketplace onClose={() => setShowPlugins(false)} />}

        {showTemplates && (
          <TemplateGallery
            onSelect={(flow) => {
              importFlow(flow);
              setShowTemplates(false);
            }}
            onClose={() => setShowTemplates(false)}
          />
        )}

        {showValidation && (
          <ValidationPanel
            result={validateFlow()}
            onClose={() => setShowValidation(false)}
          />
        )}

        {showSettings && (
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

        {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

        {showVersionControl && (
          <VersionControlPanel
            flowId="flow_1"
            currentFlow={currentFlow}
            onRestore={(flow) => {
              importFlow(flow);
              setShowVersionControl(false);
            }}
            onVisualDiff={setVisualDiff}
            onClose={() => setShowVersionControl(false)}
          />
        )}

        {showScriptView && (
          <ScriptView
            nodes={nodes}
            edges={edges}
            onSelectNode={handleTraceSelectNode}
            onClose={() => setShowScriptView(false)}
          />
        )}

        {visualDiff && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(15, 15, 26, 0.95)',
              border: '1px solid #333',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12
            }}
          >
            <span>
              <span style={{ color: '#10b981' }}>■ added ({visualDiff.added.length})</span>
              {' · '}
              <span style={{ color: '#f59e0b' }}>
                ■ modified ({visualDiff.modified.length})
              </span>
              {' · '}
              <span style={{ color: '#ef4444' }}>
                ■ removed ({visualDiff.removed.join(', ') || 'none on canvas'})
              </span>
            </span>
            <button
              onClick={() => setVisualDiff(null)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid #333',
                background: 'transparent',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              Exit diff
            </button>
          </div>
        )}

        {showMonitoring && (
          <MonitoringDashboard
            flowId="flow_1"
            onClose={() => setShowMonitoring(false)}
          />
        )}

        {showCollaboration && (
          <CollaborationPanel
            flowId="flow_1"
            currentUser={{
              id: 'user_1',
              name: 'User',
              email: 'user@example.com',
              color: '#8b5cf6',
              isOnline: true,
              lastActive: Date.now()
            }}
            onClose={() => setShowCollaboration(false)}
          />
        )}

        {showPreflight && (
          <PreflightPanel
            nodes={nodes}
            edges={edges}
            flowName={flowName}
            flowVersion={flowVersion}
            onSelectNode={handleTraceSelectNode}
            onClose={() => setShowPreflight(false)}
          />
        )}

        {showTestConsole && (
          <TestConsole
            nodes={nodes}
            edges={edges}
            flowName={flowName}
            onTraceEvent={handleTraceEvent}
            onSelectNode={handleTraceSelectNode}
            onClearTrace={handleClearTrace}
          />
        )}
      </div>

      {/* Config Panel */}
      {selectedNode && selectedNodeDef && (
        <div
          style={{
            width: 320,
            background: '#1a1a2e',
            color: 'white',
            padding: 16,
            overflowY: 'auto',
            borderLeft: '1px solid #333'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>
              {selectedNodeDef.icon} {selectedNodeDef.label}
            </h2>
            <button
              onClick={() => setSelectedNode(null)}
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
          
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            {selectedNodeDef.description}
          </p>
          
          <div style={{ marginTop: 16 }}>
            <ConfigForm
              schema={selectedNodeDef.configSchema}
              config={(selectedNode.data?.config as NodeConfig) || {}}
              onChange={(config) => updateNodeConfig(selectedNode.id, config)}
            />
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #333' }}>
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888' }}>
              Inputs
            </h3>
            {selectedNodeDef.inputs.map((input) => (
              <div key={input.id} style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                • {input.label} ({input.type})
                {input.required && <span style={{ color: '#ef4444' }}> *</span>}
              </div>
            ))}
            
            <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginTop: 12 }}>
              Outputs
            </h3>
            {selectedNodeDef.outputs.map((output) => (
              <div key={output.id} style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                • {output.label} ({output.type})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const toolbarButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 4,
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontSize: 14
};

export default App;
