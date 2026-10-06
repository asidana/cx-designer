/**
 * Agentic CX Designer — Main Application
 * 
 * A visual canvas for building AI voice agents.
 * Built with React Flow + Zustand.
 */

import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge
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
import { SettingsPanel } from './components/SettingsPanel';
import { HelpPanel } from './components/HelpPanel';
import { Onboarding } from './components/Onboarding';
import { VersionControlPanel } from './components/VersionControlPanel';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { CollaborationPanel } from './components/CollaborationPanel';
import { Notifications, useNotifications } from './components/Notifications';
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
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVersionControl, setShowVersionControl] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [flowVersion, setFlowVersion] = useState('1.0.0');
  const [analyticsMetrics] = useState(new Map());
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

  // Handle node connection
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  // Add a new node to the canvas
  const addNode = useCallback(
    (type: NodeType) => {
      const nodeDef = nodeRegistry.get(type);
      if (!nodeDef) return;

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type: 'default',
        position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
        data: {
          label: nodeDef.label,
          config: {},
          type
        }
      };

      setNodes((nds) => nds.concat(newNode));
      success('Node added', `${nodeDef.label} added to canvas`);
    },
    [setNodes, success]
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
    setNodes(flow.nodes as Node[]);
    setEdges(flow.edges as Edge[]);
    setFlowName(flow.name);
    setFlowVersion(flow.version);
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

  // Get nodes by category for the palette
  const paletteItems = nodeRegistry.getAll().map((node) => ({
    type: node.type,
    label: node.label,
    icon: node.icon,
    color: node.color,
    category: node.category
  }));

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
        
        {['voice', 'agentic', 'deterministic', 'control', 'governance', 'integration'].map(
          (category) => (
            <div key={category} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888' }}>
                {category}
              </h3>
              {paletteItems
                .filter((item) => item.category === category)
                .map((item) => (
                  <div
                    key={item.type}
                    onClick={() => addNode(item.type)}
                    style={{
                      padding: '8px 12px',
                      marginBottom: 4,
                      background: '#16213e',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = '#1e3a5f';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = '#16213e';
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
            </div>
          )
        )}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
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
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            👥
          </button>
          
          <button
            onClick={() => setShowMonitoring(true)}
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            📊
          </button>
          
          <button
            onClick={() => setShowVersionControl(true)}
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            📝
          </button>
          
          <button
            onClick={() => setShowHelp(true)}
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            ❓
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            ⚙️
          </button>
          
          <button
            onClick={() => setShowValidation(true)}
            style={{ ...toolbarButtonStyle, background: '#10b981' }}
          >
            ✅
          </button>
          
          <button
            onClick={() => setShowTemplates(true)}
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            📚
          </button>
          
          <button
            onClick={() => setShowAIGenerator(true)}
            style={{ ...toolbarButtonStyle, background: '#8b5cf6' }}
          >
            🤖
          </button>
          
          <button
            onClick={() => setShowPlugins(true)}
            style={{ ...toolbarButtonStyle, background: '#6366f1' }}
          >
            🧩
          </button>
          
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            style={{ ...toolbarButtonStyle, background: showAnalytics ? '#f59e0b' : '#6366f1' }}
          >
            📊
          </button>
          
          <FlowIO flow={currentFlow} onImport={importFlow} />
          
          <button
            onClick={() => setShowTestConsole(!showTestConsole)}
            style={{ ...toolbarButtonStyle, background: showTestConsole ? '#f59e0b' : '#6366f1' }}
          >
            🧪
          </button>
          
          <button
            onClick={executeFlow}
            style={{ ...toolbarButtonStyle, background: '#10b981' }}
          >
            ▶
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
          style={{ paddingTop: 60 }}
        >
          <Background color="#333" gap={16} />
          <Controls />
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
          <AnalyticsOverlay nodes={nodes} edges={edges} metrics={analyticsMetrics} />
        )}

        {showAIGenerator && (
          <AIGenerator
            onGenerate={(flow) => {
              importFlow(flow);
              setShowAIGenerator(false);
            }}
          />
        )}

        {showPlugins && <PluginMarketplace />}

        {showTemplates && (
          <TemplateGallery
            onSelect={(flow) => {
              importFlow(flow);
              setShowTemplates(false);
            }}
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
            onClose={() => setShowVersionControl(false)}
          />
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

        {showTestConsole && (
          <TestConsole nodes={nodes} edges={edges} flowName={flowName} />
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
