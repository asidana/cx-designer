/**
 * CX Designer — application shell.
 *
 * Nine-section side menu, one page body. CX Designer > Canvas owns the
 * builder; every other page is a self-contained component reading its own
 * domain module. Navigation is declarative (navigation/navModel.ts) and
 * Ctrl+K ranks everything from the same model.
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
  Edge,
  Node,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';

import { nodeRegistry } from './nodes';
import { FlowEngine } from './engine/flowEngine';
import { ConfigForm } from './components/ConfigForm';
import { TestConsole } from './components/TestConsole';
import { FlowIO } from './components/FlowIO';
import { AnalyticsOverlay } from './components/AnalyticsOverlay';
import { BuilderChat } from './components/BuilderChat';
import { TemplateGallery } from './components/TemplateGallery';
import { ValidationPanel } from './components/ValidationPanel';
import { PreflightPanel, lintFlow } from './components/PreflightPanel';
import { Onboarding } from './components/Onboarding';
import { VersionControlPanel } from './components/VersionControlPanel';
import { ScriptView } from './components/ScriptView';
import type { VersionDiff } from './versioning/VersionControl';
import { Notifications, useNotifications } from './components/Notifications';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { historyManager } from './history/HistoryManager';
import { autoSave } from './autosave/AutoSave';
import { FlowValidator } from './validation/FlowValidator';
import { SideMenu } from './components/SideMenu';
import { CommandPalette, Command } from './components/CommandPalette';
import { PAGES } from './pages/registry';
import type { PageContext } from './pages/context';
import { DEFAULT_PAGE, PAGE_SHORTCUTS, SECTIONS, page as pageDef } from './navigation/navModel';
import { setThemeMode, theme, Button } from './components/ui';
import type { Settings } from './components/SettingsPanel';
import { recordAudit } from './workspace/store';
import { FlowGraph, FlowNode, FlowEdge, NodeType, NodeConfig } from './types/node';

// Registers built-in nodes for the palette and engine.
import './nodes';

const App: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState('Untitled Agent');
  const [flowVersion, setFlowVersion] = useState('1.0.0');

  // Workspace settings — owned by the shell, edited in Settings pages.
  const [settings, setSettings] = useState<Settings>({
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

  useEffect(() => {
    setThemeMode(settings.theme);
  }, [settings.theme]);

  // ── Navigation ────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState(DEFAULT_PAGE);
  const [pagesOpen, setPagesOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  const activeSection = useMemo(
    () => SECTIONS.find(s => s.pages.some(p => p.id === activePage))?.id || 'designer',
    [activePage]
  );
  const isCanvas = activePage === 'designer.canvas';

  const { notifications, dismissNotification, success, error } = useNotifications();

  const notify = useCallback(
    (message: string, tone: 'info' | 'good' | 'bad' = 'info') => {
      if (tone === 'good') success(message);
      else if (tone === 'bad') error(message);
      else success(message, '');
    },
    [success, error]
  );

const currentFlow: FlowGraph = useMemo(
    () => ({
      id: 'flow_1',
      name: flowName,
      version: flowVersion,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[]
    }),
    [flowName, flowVersion, nodes, edges]
  );

  const ctx: PageContext = useMemo(
    () => ({
      flowName,
      flowVersion,
      nodeCount: nodes.length,
      currentFlow,
      navigate: setActivePage,
      notify,
      settings,
      onSettingsChange: setSettings
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowName, flowVersion, nodes.length, currentFlow, notify, settings]
  );

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
      setEdges(flow.edges as never[]);
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  // ── Dirty tracking ────────────────────────────────────────────────────
  const signature = useMemo(
    () => JSON.stringify({ flowName, flowVersion, nodes, edges }),
    [flowName, flowVersion, nodes, edges]
  );
  const savedSignature = useRef<string>('');
  const dirty = signature !== savedSignature.current;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

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

  // Builder-chat operations (by node id)
  const connectNodes = useCallback(
    (sourceId: string, targetId: string): boolean => {
      if (edges.some(e => e.source === sourceId && e.target === targetId)) return false;
      pendingHistoryLabel.current = 'Connect nodes';
      setEdges(eds =>
        addEdge(
          { id: `e_${sourceId}_${targetId}_${Date.now()}`, source: sourceId, target: targetId, animated: true },
          eds
        )
      );
      return true;
    },
    [edges, setEdges]
  );

  const configureNode = useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      pendingHistoryLabel.current = 'Configure node';
      setNodes(nds =>
        nds.map(n =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...((n.data?.config as NodeConfig) || {}), ...patch } } }
            : n
        )
      );
    },
    [setNodes]
  );

  const removeNodeById = useCallback(
    (nodeId: string) => {
      pendingHistoryLabel.current = 'Delete node';
      setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
      setNodes(nds => nds.filter(n => n.id !== nodeId));
      setSelectedNode(current => (current?.id === nodeId ? null : current));
    },
    [setEdges, setNodes]
  );

  const clearCanvas = useCallback(() => {
    pendingHistoryLabel.current = 'Clear canvas';
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

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
    savedSignature.current = JSON.stringify({ flowName, flowVersion, nodes, edges });
    recordAudit('designer', 'Saved flow', `${flowName} v${flowVersion}`);
    success('Flow saved', flowName);
  }, [nodes, edges, flowName, flowVersion, success]);

  // Select all nodes
  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  const flowInstance = useRef<ReactFlowInstance | null>(null);

  // Page shortcuts (single keys) + Ctrl+K, suppressed while typing
  const navigateFromShortcut = useCallback(
    (key: string) => {
      const pageId = PAGE_SHORTCUTS[key];
      if (pageId) setActivePage(pageId);
    },
    []
  );

  useKeyboardShortcuts({
    enabled: isCanvas,
    onUndo: () => applyHistoryFlow(historyManager.undo()),
    onRedo: () => applyHistoryFlow(historyManager.redo()),
    onSave: saveFlow,
    onDuplicate: duplicateSelected,
    onDelete: deleteSelected,
    onSelectAll: selectAll,
    onZoomIn: () => flowInstance.current?.zoomIn(),
    onZoomOut: () => flowInstance.current?.zoomOut(),
    onResetZoom: () => flowInstance.current?.fitView(),
    onCommandPalette: () => setShowCommandPalette(true),
    onPageShortcut: navigateFromShortcut,
    onTogglePalette: () => setPaletteOpen(o => !o)
  });

  // Show onboarding on first run
  const [showOnboarding, setShowOnboarding] = useState(false);
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

  const handleClearTrace = useCallback(() => setActiveNodeId(null), []);

  const handleTraceSelectNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) setSelectedNode(node);
    },
    [nodes]
  );

  // Canvas nodes with live-trace highlight + version-diff tints.
  // Diff wins over trace pulse when a comparison is active.
  const [visualDiff, setVisualDiff] = useState<VersionDiff | null>(null);
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

  // Preflight issue count — badges in the menu and the toolbar
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
      if (!isCanvas) setActivePage('designer.canvas');
    },
    [createNode, isCanvas]
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
        nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, config } } : n))
      );
    },
    [setNodes]
  );

    // Execute the flow
  const [lastRun, setLastRun] = useState<{
    ok: boolean;
    latencyMs: number;
    cost: number;
    output: string;
  } | null>(null);

  const executeFlow = useCallback(async () => {
    const engine = new FlowEngine(currentFlow);
    const startedAt = Date.now();
    try {
      const result = await engine.execute('Hello, I need help with my account', 'session_1');
      const latencyMs = Date.now() - startedAt;
      const cost = (result.outputs.cost as number) || 0;
      setLastRun({
        ok: true,
        latencyMs,
        cost,
        output: String(result.outputs.response ?? result.outputs.text ?? '')
      });
      success('Flow executed', `${latencyMs} ms · $${cost.toFixed(4)}`);
    } catch (err) {
      setLastRun({ ok: false, latencyMs: Date.now() - startedAt, cost: 0, output: String(err) });
      error('Flow execution failed', String(err));
    }
  }, [currentFlow, success, error]);

  // Import flow
  const importFlow = useCallback(
    (flow: FlowGraph) => {
      pendingHistoryLabel.current = `Import ${flow.name}`;
      setNodes(flow.nodes as Node[]);
      setEdges(flow.edges as never[]);
      setFlowName(flow.name);
      setFlowVersion(flow.version);
      setSelectedNode(null);
      setVisualDiff(null);
      savedSignature.current = JSON.stringify({
        name: flow.name,
        version: flow.version,
        nodes: flow.nodes,
        edges: flow.edges
      });
      success('Flow imported', flow.name);
    },
    [setNodes, setEdges, success]
  );

  const validateFlow = useCallback(() => FlowValidator.validate(currentFlow), [currentFlow]);

  // Palette items (searchable by name, description, category)
  const paletteItems = nodeRegistry.getAll().map(node => ({
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

  // Selected node definition + live validation
  const selectedNodeDef = selectedNode?.data?.type
    ? nodeRegistry.get(selectedNode.data.type as NodeType)
    : null;
  const nodeValidation = useMemo(() => {
    if (!selectedNodeDef) return { valid: true, errors: [] as Array<{ field: string; message: string }> };
    const merged = {
      ...(selectedNodeDef.config || {}),
      ...((selectedNode?.data?.config as NodeConfig) || {})
    };
    try {
      return selectedNodeDef.validate(merged);
    } catch {
      return { valid: true, errors: [] };
    }
  }, [selectedNodeDef, selectedNode]);

  // ── Command palette ───────────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = SECTIONS.flatMap(s =>
      s.pages.map(p => ({
        id: `nav:${p.id}`,
        label: `${p.label} — ${s.label}`,
        group: 'Go to',
        icon: p.icon,
        hint: p.hint,
        shortcut: p.shortcut,
        keywords: [...p.keywords, s.label, p.label],
        run: () => setActivePage(p.id)
      }))
    );
    const canvas: Command[] = [
      { id: 'act:run', label: 'Run flow', group: 'Canvas', icon: '▶', hint: 'Execute from the entry node', shortcut: 'Ctrl+↵', run: () => void executeFlow() },
      { id: 'act:save', label: 'Save flow', group: 'Canvas', icon: '💾', shortcut: 'Ctrl+S', run: saveFlow },
      { id: 'act:undo', label: 'Undo', group: 'Canvas', icon: '↩️', shortcut: 'Ctrl+Z', run: () => applyHistoryFlow(historyManager.undo()) },
      { id: 'act:redo', label: 'Redo', group: 'Canvas', icon: '↪️', shortcut: 'Ctrl+Shift+Z', run: () => applyHistoryFlow(historyManager.redo()) },
      { id: 'act:dup', label: 'Duplicate selected node', group: 'Canvas', icon: '⧉', shortcut: 'Ctrl+D', run: duplicateSelected },
      { id: 'act:del', label: 'Delete selected node', group: 'Canvas', icon: '🗑️', run: deleteSelected },
      { id: 'act:clear', label: 'Clear canvas', group: 'Canvas', icon: '🧹', run: clearCanvas },
      { id: 'act:palette', label: 'Toggle node palette', group: 'Canvas', icon: '🎨', shortcut: 'P', run: () => setPaletteOpen(o => !o) }
    ];
    const addNodes: Command[] = nodeRegistry.getAll().map(n => ({
      id: `node:${n.type}`,
      label: `Add ${n.label}`,
      group: 'Add node',
      icon: n.icon,
      hint: n.description,
      keywords: [n.category, n.type, n.description],
      run: () => addNode(n.type)
    }));
    return [...nav, ...canvas, ...addNodes];
  }, [executeFlow, saveFlow, applyHistoryFlow, duplicateSelected, deleteSelected, clearCanvas, addNode]);

  // ── Render ────────────────────────────────────────────────────────────
  const PageComponent = PAGES[activePage];
  const activePageMeta = pageDef(activePage);

  // Designer pages that need canvas state render here rather than in the
  // page registry, because they close over the engine callbacks.
  const renderDesignerPage = (): React.ReactNode => {
    switch (activePage) {
      case 'designer.templates':
        return <TemplateGallery onSelect={importFlow} onClose={() => setActivePage('designer.canvas')} />;
      case 'designer.builder':
        return (
          <BuilderChat
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNode?.id || null}
            onReplaceFlow={importFlow}
            onAddNode={addNode}
            onConnectNodes={connectNodes}
            onConfigureNode={configureNode}
            onRemoveNode={removeNodeById}
            onClearCanvas={clearCanvas}
            onClose={() => setActivePage('designer.canvas')}
          />
        );
      case 'designer.script':
        return (
          <ScriptView
            nodes={nodes}
            edges={edges}
            onSelectNode={handleTraceSelectNode}
            onClose={() => setActivePage('designer.canvas')}
          />
        );
      case 'designer.preflight':
        return (
          <PreflightPanel
            nodes={nodes}
            edges={edges}
            flowName={flowName}
            flowVersion={flowVersion}
            onSelectNode={handleTraceSelectNode}
            onClose={() => setActivePage('designer.canvas')}
          />
        );
      case 'designer.validation':
        return (
          <ValidationPanel result={validateFlow()} onClose={() => setActivePage('designer.canvas')} />
        );
      case 'designer.analytics':
        return <AnalyticsOverlay nodes={nodes} edges={edges} metrics={nodeStats} />;
      case 'designer.versions':
        return (
          <VersionControlPanel
            flowId="flow_1"
            currentFlow={currentFlow}
            onRestore={importFlow}
            onVisualDiff={setVisualDiff}
            onClose={() => setActivePage('designer.canvas')}
          />
        );
      case 'designer.testconsole':
        return (
          <TestConsole
            nodes={nodes}
            edges={edges}
            flowName={flowName}
            onTraceEvent={handleTraceEvent}
            onSelectNode={handleTraceSelectNode}
            onClearTrace={handleClearTrace}
          />
        );
      case 'designer.flowio':
        return (
          <div style={{ padding: '64px 24px 24px', display: 'flex', justifyContent: 'center' }}>
            <FlowIO flow={currentFlow} onImport={importFlow} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', background: theme.bg }}>
      <Notifications notifications={notifications} onDismiss={dismissNotification} />

      <SideMenu
        activeSection={activeSection}
        activePage={activePage}
        onSectionChange={id => {
          const section = SECTIONS.find(s => s.id === id);
          if (section) setActivePage(section.pages[0].id);
        }}
        onPageChange={setActivePage}
        badges={{ 'designer.preflight': preflightCount }}
        pagesOpen={pagesOpen}
        onTogglePages={() => setPagesOpen(o => !o)}
        status={{ flowName, nodeCount: nodes.length, dirty }}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />

      <div style={{ flex: 1, display: 'flex', minWidth: 0, position: 'relative' }}>
        {isCanvas ? (
          <>
            {/* Node palette drawer */}
            {paletteOpen && (
              <div
                style={{
                  width: 250,
                  flex: '0 0 250px',
                  background: theme.panel,
                  color: theme.text,
                  padding: 16,
                  overflowY: 'auto',
                  borderRight: `1px solid ${theme.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ marginTop: 0, fontSize: 15 }}>🎨 Node Palette</h2>
                  <button onClick={() => setPaletteOpen(false)} style={ghostButton} title="Hide palette">
                    «
                  </button>
                </div>
                <input
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  placeholder="Search nodes…"
                  title="Filter by name, description, or category. Drag a row onto the canvas, or click to place."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: `1px solid ${theme.border}`,
                    background: theme.input,
                    color: theme.text,
                    fontSize: 13,
                    marginBottom: 8
                  }}
                />
                <div style={{ fontSize: 11, color: theme.muted, marginBottom: 12 }}>
                  Drag onto canvas · or click to place
                </div>

                {['voice', 'chat', 'agentic', 'deterministic', 'control', 'governance', 'integration'].map(
                  (category) => {
                    const items = visiblePaletteItems.filter((item) => item.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category} style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: theme.muted }}>
                          {category}
                        </h3>
                        {items.map((item) => (
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
                              background: theme.panel2,
                              borderRadius: 4,
                              cursor: 'grab',
                              fontSize: 13,
                              border: `1px solid ${theme.border}`
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </div>
                            <div style={{ fontSize: 11, color: theme.muted, marginTop: 2, lineHeight: 1.35 }}>
                              {item.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                )}
                {visiblePaletteItems.length === 0 && (
                  <div style={{ fontSize: 12, color: theme.muted, textAlign: 'center', marginTop: 16 }}>
                    No nodes match “{paletteQuery}”.
                  </div>
                )}
              </div>
            )}

            <CanvasArea
              flowName={flowName}
              setFlowName={setFlowName}
              flowVersion={flowVersion}
              dirty={dirty}
              preflightCount={preflightCount}
              paletteOpen={paletteOpen}
              onTogglePalette={() => setPaletteOpen(o => !o)}
              onSave={saveFlow}
              onRun={() => void executeFlow()}
              onNavigate={setActivePage}
              canvasRef={canvasRef}
              displayNodes={displayNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNode(node)}
              onPaneClick={() => setSelectedNode(null)}
              onInit={instance => {
                flowInstance.current = instance;
              }}
              onDrop={onDropNode}
              lastRun={lastRun}
              nodeCount={nodes.length}
            />
          </>
        ) : (
          <PageFrame title={activePageMeta?.label || activePage}>
            {PageComponent ? (
              <PageComponent {...ctx} />
            ) : (
              renderDesignerPage()
            )}
          </PageFrame>
        )}
      </div>

      {/* Config panel — only while designing */}
      {isCanvas && selectedNode && selectedNodeDef && (
        <aside
          style={{
            width: 320,
            flex: '0 0 320px',
            background: theme.panel,
            color: theme.text,
            padding: 16,
            overflowY: 'auto',
            borderLeft: `1px solid ${theme.border}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 15 }}>
              {selectedNodeDef.icon} {selectedNodeDef.label}
            </h2>
            <button onClick={() => setSelectedNode(null)} style={{ ...ghostButton, border: 'none', fontSize: 16 }}>
              ×
            </button>
          </div>

          <p style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
            {selectedNodeDef.description}
          </p>

          {!nodeValidation.valid && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 6,
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.4)',
                fontSize: 12,
                color: theme.text
              }}
            >
              {nodeValidation.errors.map((e, i) => (
                <div key={i}>
                  • <strong>{e.field}</strong>: {e.message}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <ConfigForm
              schema={selectedNodeDef.configSchema}
              config={(selectedNode.data?.config as NodeConfig) || {}}
              onChange={(config) => updateNodeConfig(selectedNode.id, config)}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <Button
              size="sm"
              tone="ghost"
              onClick={() => updateNodeConfig(selectedNode.id, {})}
              title="Clear instance overrides — the node falls back to its type defaults"
            >
              Reset to defaults
            </Button>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
            <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: theme.muted }}>Inputs</h3>
            {selectedNodeDef.inputs.map((input) => (
              <div key={input.id} style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                • {input.label} ({input.type})
                {input.required && <span style={{ color: theme.danger }}> *</span>}
              </div>
            ))}

            <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: theme.muted, marginTop: 12 }}>
              Outputs
            </h3>
            {selectedNodeDef.outputs.map((output) => (
              <div key={output.id} style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                • {output.label} ({output.type})
              </div>
            ))}
          </div>
        </aside>
      )}

      <CommandPalette
        open={showCommandPalette}
        commands={commands}
        onClose={() => setShowCommandPalette(false)}
      />

      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
    </div>
  );
};

/** Standard frame for page bodies that are not the canvas. */
const PageFrame: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ flex: 1, minWidth: 0, position: 'relative', background: theme.bg, overflow: 'hidden' }}>
    {children}
    <span
      style={{
        position: 'absolute',
        right: 14,
        bottom: 10,
        fontSize: 10,
        color: theme.muted,
        pointerEvents: 'none',
        opacity: 0.6
      }}
    >
      {title}
    </span>
  </div>
);

// ── Canvas workspace ─────────────────────────────────────────────────────

interface CanvasAreaProps {
  flowName: string;
  setFlowName: (v: string) => void;
  flowVersion: string;
  dirty: boolean;
  preflightCount: number;
  paletteOpen: boolean;
  onTogglePalette: () => void;
  onSave: () => void;
  onRun: () => void;
  onNavigate: (pageId: string) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  displayNodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (c: Connection) => void;
  onNodeClick: (e: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  onInit: (instance: ReactFlowInstance) => void;
  onDrop: (e: React.DragEvent) => void;
  lastRun: { ok: boolean; latencyMs: number; cost: number; output: string } | null;
  nodeCount: number;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  flowName,
  setFlowName,
  flowVersion,
  dirty,
  preflightCount,
  paletteOpen,
  onTogglePalette,
  onSave,
  onRun,
  onNavigate,
  canvasRef,
  displayNodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onInit,
  onDrop,
  lastRun,
  nodeCount
}) => (
  <div
    ref={canvasRef}
    onDrop={onDrop}
    onDragOver={(e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }}
    style={{ flex: 1, position: 'relative', minWidth: 0 }}
  >
    {/* Toolbar — identity, status, run. Everything else lives in the menu. */}
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 10,
        display: 'flex',
        gap: 8,
        alignItems: 'center'
      }}
    >
      {!paletteOpen && (
        <button onClick={onTogglePalette} style={{ ...ghostButton, background: theme.panel2 }} title="Show palette (P)">
          🎨
        </button>
      )}
      <input
        value={flowName}
        onChange={(e) => setFlowName(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: 6,
          border: `1px solid ${theme.border}`,
          background: theme.input,
          color: theme.text,
          fontSize: 13,
          width: 200
        }}
      />
      <span style={{ fontSize: 11, color: theme.muted }}>v{flowVersion}</span>
      <span style={{ fontSize: 11, color: dirty ? theme.warn : theme.success }}>
        {dirty ? '● unsaved' : '✓ saved'}
      </span>
      <span style={{ fontSize: 11, color: theme.muted }}>
        {nodeCount} node{nodeCount === 1 ? '' : 's'}
      </span>

      <div style={{ flex: 1 }} />

      <button onClick={onSave} style={{ ...ghostButton, background: theme.panel2 }} title="Save (Ctrl+S)">
        💾 Save
      </button>
      <button
        onClick={() => onNavigate('designer.preflight')}
        style={{
          ...ghostButton,
          background: preflightCount > 0 ? '#b45309' : theme.panel2,
          color: preflightCount > 0 ? '#fff' : theme.text
        }}
        title={`Preflight lint — ${preflightCount} issue(s) (L)`}
      >
        ✈️ Preflight{preflightCount > 0 ? ` ${preflightCount}` : ''}
      </button>
      <button
        onClick={() => onNavigate('designer.testconsole')}
        style={{ ...ghostButton, background: theme.panel2 }}
        title="Test console (Shift+Y)"
      >
        🧪 Test
      </button>
      <button
        onClick={() => onNavigate('designer.builder')}
        style={{ ...ghostButton, background: theme.panel2 }}
        title="Builder chat (B)"
      >
        🤖 Builder
      </button>
      <button onClick={onRun} style={{ ...ghostButton, background: theme.success, color: '#052e1f', fontWeight: 600 }}>
        ▶ Run
      </button>
    </div>

    <ReactFlow
      nodes={displayNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onInit={onInit}
      fitView
      style={{ paddingTop: 56 }}
    >
      <Background color="#333" gap={16} />
      <Controls />
      {nodeCount === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: theme.muted,
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎛️</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Start here</div>
          <div style={{ fontSize: 13, marginBottom: 14, maxWidth: 320, lineHeight: 1.6 }}>
            Load a template, tell Builder Chat what you want, or drag nodes in from the palette.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', pointerEvents: 'auto' }}>
            <button onClick={() => onNavigate('designer.templates')} style={ghostButton}>
              📚 Templates
            </button>
            <button onClick={() => onNavigate('designer.builder')} style={ghostButton}>
              🤖 Describe it
            </button>
          </div>
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

    {/* Last run summary — the end-to-end answer, without opening a panel */}
    {lastRun && (
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          zIndex: 20,
          maxWidth: 520,
          background: theme.panel,
          border: `1px solid ${lastRun.ok ? theme.border : theme.danger}`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 12,
          color: theme.text
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span>{lastRun.ok ? '✅' : '🛑'}</span>
          <strong>{lastRun.ok ? 'Run complete' : 'Run failed'}</strong>
          <span style={{ color: theme.muted }}>{lastRun.latencyMs} ms</span>
          <span style={{ color: theme.muted }}>${lastRun.cost.toFixed(4)}</span>
          <button onClick={() => onNavigate('designer.testconsole')} style={{ ...ghostButton, padding: '2px 8px', fontSize: 11 }}>
            Trace
          </button>
        </div>
        {lastRun.output && (
          <div style={{ marginTop: 6, color: theme.muted, maxHeight: 48, overflow: 'hidden' }}>
            {lastRun.output}
          </div>
        )}
      </div>
    )}
  </div>
);

export default App;

const ghostButton: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 6,
  border: `1px solid ${theme.border}`,
  background: theme.panel2,
  color: theme.text,
  cursor: 'pointer',
  fontSize: 12
};