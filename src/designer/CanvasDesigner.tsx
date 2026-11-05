/**
 * CanvasDesigner — the whole canvas feature as one embeddable component.
 *
 * This is the n8n / AWS Connect–style drag-and-drop flow editor extracted
 * from the platform's application shell. It owns:
 *
 *   · React Flow canvas (drag from palette, connect, rearrange, configure)
 *   · Node palette (searchable, grouped by category, drag or click to place)
 *   · Node config panel (schema-driven forms + live validation)
 *   · Run (client-side FlowEngine simulation with live trace pulses)
 *   · Undo/redo history · autosave + boot restore · dirty tracking
 *   · Feature drawers: Preflight · Script · Validation · Flow I/O ·
 *     Versions · Builder chat · Analytics
 *
 * Embedding contract:
 *   - Uncontrolled by default: pass `initialFlow`, read via `onChange`/ref.
 *   - `onChange` emits the canonical (normalized) FlowGraph, debounced ~250ms
 *     so position drags don't spam the host.
 *   - A host can hand an authoritative flow back via the `flow` prop or
 *     `ref.importFlow(flow)`; canvas nodes always normalize at the door.
 *   - `customNodes` / `mcpSystems` props are the plug points the platform
 *     drove through its workspace store.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react';
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
// Loaded after React Flow's own stylesheet so the token overrides win.
import './canvas/canvas.css';

import { nodeRegistry, registerBuiltInNodes } from './nodes';
import { syncCustomNodes, type CustomNodeRecord } from './nodes/custom';
import { refreshMcpToolOptions } from './nodes/gateway/mcpTool';
import { FlowEngine } from './engine/flowEngine';
import { ConfigForm } from './components/ConfigForm';
import { FlowIO } from './components/FlowIO';
import { AnalyticsOverlay } from './components/AnalyticsOverlay';
import { BuilderChat } from './components/BuilderChat';
import { ValidationPanel } from './components/ValidationPanel';
import { PreflightPanel, lintFlow } from './components/PreflightPanel';
import { VersionControlPanel } from './components/VersionControlPanel';
import { ScriptView } from './components/ScriptView';
import type { VersionDiff } from './versioning/VersionControl';
import { historyManager } from './history/HistoryManager';
import { autoSave } from './autosave/AutoSave';
import type { RestoredSession } from './autosave/AutoSave';
import { FlowValidator } from './validation/FlowValidator';
import {
  domainTypeOf,
  normalizeCanvasNodes,
  normalizeFlow,
  CURRENT_RENDERER_TYPE
} from './canvas/domain';
import { canvasNodeTypes } from './canvas/nodeTypes';
import { applyNodePresentation } from './canvas/status';
import { subscribeTheme } from './design/themeRuntime';
import {
  setThemeMode,
  setDensity,
  theme,
  Button,
  Empty,
  Z
} from './components/ui';
import { FlowGraph, FlowNode, FlowEdge, NodeDefinition, NodeType, NodeConfig } from './types/node';
import { CHANNEL_CAPABILITIES, ChannelId, resolveCapabilities } from './channels/types';
import { SystemRecord } from './nodes/gateway/mcpTool';

// Registers built-in nodes for the palette and engine.
registerBuiltInNodes();

/** Canonical fingerprint of a flow — the single definition of "saved". */
function signatureOf(flow: FlowGraph): string {
  return JSON.stringify(normalizeFlow(flow));
}

export interface CanvasDesignerFeatures {
  /** Node palette drawer. */
  palette?: boolean;
  /** Preflight lint drawer. */
  preflight?: boolean;
  /** Script (human-readable walkthrough) drawer. */
  script?: boolean;
  /** Validation drawer. */
  validation?: boolean;
  /** JSON import/export + LangGraph export drawer. */
  flowIO?: boolean;
  /** Version snapshots + visual diff drawer. */
  versions?: boolean;
  /** Plain-English builder chat drawer. */
  builderChat?: boolean;
  /** Per-node analytics overlay (after runs). */
  analytics?: boolean;
}

export interface CanvasDesignerProps {
  /** Seed the canvas. Uncontrolled: later host edits go through the ref. */
  initialFlow?: FlowGraph;
  /** Emitted whenever the canonical flow changes (debounced ~250 ms). */
  onChange?: (flow: FlowGraph) => void;
  /**
   * Optional controlled echo: when the host replaces `flow` with an edit
   * that is neither the current canvas value nor our last emission, it is
   * adopted. Leave undefined to keep the canvas fully uncontrolled.
   */
  flow?: FlowGraph | null;
  /** Feature toggles (all default on). */
  features?: CanvasDesignerFeatures;
  /** Host-owned custom node definitions — synced into the registry. */
  customNodes?: CustomNodeRecord[];
  /** Host-owned MCP system bindings — regroup the MCP Tool picker. */
  mcpSystems?: Array<Pick<SystemRecord, 'name' | 'tools' | 'enabled'>>;
  /** Enable local autosave + boot restore (default true). */
  persistence?: boolean;
  /** Theme mode. Defaults to the persisted theme, or 'dark'. */
  theme?: 'dark' | 'light';
  /** Density. Defaults to the persisted density, or 'comfortable'. */
  density?: 'compact' | 'comfortable';
}

export interface CanvasDesignerHandle {
  /** The canonical flow as it stands now (normalized). */
  getFlow(): FlowGraph;
  /** Run the flow through the local engine simulation. */
  run(input?: string, sessionId?: string): Promise<void>;
  undo(): void;
  redo(): void;
  /** Persist via autosave immediately. */
  save(): void;
  /** Replace the canvas with a (normalized) flow. */
  importFlow(flow: FlowGraph): void;
  clear(): void;
  addNode(type: NodeType): void;
  /** Centre the viewport on a node and select it. */
  focusNode(nodeId: string): void;
}

type PanelId = 'preflight' | 'script' | 'validation' | 'flowio' | 'versions' | 'builder' | 'analytics';

/** Stable identities so `customNodes = EMPTY` defaults never re-trigger effects. */
const EMPTY_RECORDS: CustomNodeRecord[] = [];
const EMPTY_SYSTEMS: Array<Pick<SystemRecord, 'name' | 'tools' | 'enabled'>> = [];

const CATEGORY_ORDER = [
  'voice',
  'chat',
  'agentic',
  'deterministic',
  'control',
  'governance',
  'integration',
  'gateway'
] as const;

export const CanvasDesigner = forwardRef<CanvasDesignerHandle, CanvasDesignerProps>(
  function CanvasDesigner(props, ref) {
    const {
      initialFlow,
      flow: hostFlow,
      onChange,
      features: featureOverrides,
      customNodes = EMPTY_RECORDS,
      mcpSystems = EMPTY_SYSTEMS,
      persistence = true,
      theme: themeMode,
      density: densityMode
    } = props;

    const features: Required<CanvasDesignerFeatures> = useMemo(
      () => ({
        palette: true,
        preflight: true,
        script: true,
        validation: true,
        flowIO: true,
        versions: true,
        builderChat: true,
        analytics: true,
        ...featureOverrides
      }),
      [featureOverrides]
    );

    // ── Flow state (extracted from the app shell; engine callbacks intact) ─
    const [boot] = useState<RestoredSession | null>(() => {
      // An explicit flow always seeds. Autosave restore is the fallback when
      // the host doesn't hand us a document (dev-host convenience mode).
      if (initialFlow) return { flow: normalizeFlow(initialFlow), source: 'cache' as const };
      if (!persistence) return null;
      const cached = autoSave.restore();
      return cached ? { flow: cached, source: 'cache' as const } : null;
    });
    const bootNodes = useMemo(
      () => (boot ? (normalizeCanvasNodes(boot.flow.nodes) as unknown as Node[]) : []),
      [boot]
    );
    const bootEdges = useMemo(() => (boot ? (boot.flow.edges as unknown as Edge[]) : []), [boot]);

    const [nodes, setNodes, onNodesChange] = useNodesState(bootNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(bootEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [flowName, setFlowName] = useState(boot?.flow.name ?? initialFlow?.name ?? 'Untitled Agent');
    const [flowVersion, setFlowVersion] = useState(
      boot?.flow.version ?? initialFlow?.version ?? '1.0.0'
    );
    const flowId = useMemo(() => initialFlow?.id ?? 'flow_1', [initialFlow?.id]);

    const currentFlow: FlowGraph = useMemo(
      () =>
        normalizeFlow({
          id: flowId,
          name: flowName,
          version: flowVersion,
          nodes: nodes as FlowNode[],
          edges: edges as FlowEdge[]
        }),
      [flowId, flowName, flowVersion, nodes, edges]
    );

    // ── Structural-change history (structural ops record immediately;
    //    config edits and drags coalesce) ────────────────────────────────
    const pendingHistoryLabel = useRef<string | null>(null);
    const pendingCoalesceKey = useRef<string | null>(null);
    useEffect(() => {
      if (pendingHistoryLabel.current) {
        const label = pendingHistoryLabel.current;
        const key = pendingCoalesceKey.current;
        pendingHistoryLabel.current = null;
        pendingCoalesceKey.current = null;
        historyManager.record(
          currentFlow,
          label,
          key ? { coalesceKey: key, coalesceWindowMs: 1500 } : undefined
        );
      }
    }, [nodes, edges, flowName, flowVersion, currentFlow]);

    const currentFlowRef = useRef(currentFlow);
    useEffect(() => {
      currentFlowRef.current = currentFlow;
    }, [currentFlow]);

    const baselineSeeded = useRef(false);
    useEffect(() => {
      if (!baselineSeeded.current) {
        baselineSeeded.current = true;
        historyManager.reset(currentFlowRef.current, 'baseline');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyHistoryFlow = useCallback(
      (flow: FlowGraph | null) => {
        if (!flow) return;
        const canonical = normalizeFlow(flow);
        setNodes(normalizeCanvasNodes(canonical.nodes) as unknown as Node[]);
        setEdges(canonical.edges as never[]);
        setSelectedNode(null);
      },
      [setNodes, setEdges]
    );

    // ── Dirty tracking ───────────────────────────────────────────────────
    const signature = useMemo(() => signatureOf(currentFlow), [currentFlow]);
    const savedSignature = useRef<string | null>(null);
    if (savedSignature.current === null) {
      savedSignature.current = boot
        ? signatureOf({
            id: flowId,
            name: boot.flow.name,
            version: boot.flow.version,
            nodes: bootNodes as FlowNode[],
            edges: bootEdges as FlowEdge[]
          })
        : signatureOf({
            id: flowId,
            name: 'Untitled Agent',
            version: '1.0.0',
            nodes: [],
            edges: []
          });
    }
    const restoreSettled = useRef(!persistence);
    const [, bumpSaved] = useState(0);
    const dirty = signature !== savedSignature.current;

    useEffect(() => {
      if (!persistence) return;
      const warn = (e: BeforeUnloadEvent) => {
        if (dirty) {
          e.preventDefault();
          e.returnValue = '';
        }
      };
      window.addEventListener('beforeunload', warn);
      return () => window.removeEventListener('beforeunload', warn);
    }, [dirty, persistence]);

    // ── Notifications (tiny internal toast; hosts can also listen via
    //    `onNotify`. A full host renders its own banner. ─────────────────
    const [toasts, setToasts] = useState<Array<{ id: number; title: string; body?: string; tone: 'good' | 'bad' }>>(
      []
    );
    const notify = useCallback(
      (title: string, body?: string, tone: 'good' | 'bad' = 'good') => {
        const id = Date.now() + Math.floor(Math.random() * 1e6);
        setToasts(ts => [...ts, { id, title, body, tone }]);
        window.setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3600);
      },
      []
    );
    const dismissToast = useCallback(
      (id: number) => setToasts(ts => ts.filter(t => t.id !== id)),
      []
    );

    // ── Node mutations ───────────────────────────────────────────────────
    const deleteSelected = useCallback(() => {
      const ids = nodes.filter(n => n.selected).map(n => n.id);
      const targetIds = ids.length > 0 ? ids : selectedNode ? [selectedNode.id] : [];
      if (targetIds.length === 0) return;
      pendingHistoryLabel.current =
        targetIds.length === 1
          ? `Delete ${selectedNode?.data?.label || 'node'}`
          : `Delete ${targetIds.length} nodes`;
      const gone = new Set(targetIds);
      setEdges(eds => eds.filter(e => !gone.has(e.source) && !gone.has(e.target)));
      setNodes(nds => nds.filter(n => !gone.has(n.id)));
      setSelectedNode(null);
    }, [nodes, selectedNode, setEdges, setNodes]);

    const duplicateSelected = useCallback(() => {
      if (!selectedNode) return;
      pendingHistoryLabel.current = 'Duplicate node';
      const copy: Node = {
        ...selectedNode,
        id: `${domainTypeOf(selectedNode) || 'node'}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        position: {
          x: selectedNode.position.x + 40,
          y: selectedNode.position.y + 40
        },
        selected: false
      };
      setNodes(nds => nds.concat(copy));
      setSelectedNode(copy);
    }, [selectedNode, setNodes]);

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
        pendingCoalesceKey.current = `cfg:${nodeId}`;
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

    const saveFlow = useCallback(() => {
      if (!persistence) return;
      autoSave.update(currentFlow);
      autoSave.save();
      savedSignature.current = signatureOf(currentFlow);
      notify('Flow saved', flowName);
      bumpSaved(t => t + 1);
    }, [currentFlow, flowName, persistence, notify]);

    const selectAll = useCallback(() => {
      setNodes(nds => nds.map(n => ({ ...n, selected: true })));
    }, [setNodes]);

    const flowInstance = useRef<ReactFlowInstance | null>(null);

    // ── Keyboard shortcuts (canvas-level; suppressed while typing) ───────
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        const typing =
          (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) ||
          false;
        const meta = e.ctrlKey || e.metaKey;

        if (meta && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) applyHistoryFlow(historyManager.redo());
          else applyHistoryFlow(historyManager.undo());
          return;
        }
        if (meta && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          applyHistoryFlow(historyManager.redo());
          return;
        }
        if (meta && e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveFlow();
          return;
        }
        if (meta && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateSelected();
          return;
        }
        if (meta && e.key.toLowerCase() === 'a' && !typing) {
          e.preventDefault();
          selectAll();
          return;
        }
        if (meta && e.key === 'Enter') {
          e.preventDefault();
          void runFlow();
          return;
        }
        if (typing || meta) return;

        switch (e.key.toLowerCase()) {
          case 'delete':
          case 'backspace':
            deleteSelected();
            break;
          case 'p':
            if (features.palette) setPaletteOpen(o => !o);
            break;
          case 'l':
            if (features.preflight) setActivePanel(p => (p === 'preflight' ? null : 'preflight'));
            break;
          case 'i':
            if (features.flowIO) setActivePanel(p => (p === 'flowio' ? null : 'flowio'));
            break;
          case 'b':
            if (features.builderChat) setActivePanel(p => (p === 'builder' ? null : 'builder'));
            break;
          case 'escape':
            setSelectedNode(null);
            setActivePanel(null);
            break;
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });

    // ── Palette / registry sync (host plug points) ───────────────────────
    const [registryRev, bumpRegistry] = useState(0);
    useEffect(() => {
      syncCustomNodes(customNodes);
      bumpRegistry(r => r + 1);
    }, [customNodes]);

    useEffect(() => {
      refreshMcpToolOptions(mcpSystems);
    }, [mcpSystems]);

    // Keep the whole component on one theme source of truth.
    const [, forceThemeTick] = useState(0);
    useEffect(() => subscribeTheme(() => forceThemeTick(t => t + 1)), []);
    useEffect(() => {
      if (themeMode) setThemeMode(themeMode);
      if (densityMode) setDensity(densityMode);
    }, [themeMode, densityMode]);

    // ── Autosave wiring ─────────────────────────────────────────────────
    useEffect(() => {
      if (!persistence) return;
      void autoSave
        .restoreLatest()
        .then(session => {
          if (!session || session.source === 'cache') return;
          const canonical = normalizeFlow(session.flow);
          const displayNodes = normalizeCanvasNodes(canonical.nodes) as unknown as Node[];
          setNodes(displayNodes);
          setEdges(canonical.edges as never[]);
          setFlowName(canonical.name);
          setFlowVersion(canonical.version);
          savedSignature.current = signatureOf({
            id: flowId,
            name: canonical.name,
            version: canonical.version,
            nodes: displayNodes as FlowNode[],
            edges: canonical.edges as FlowEdge[]
          });
          notify(
            session.source === 'backup' ? 'Recovered your session from a recovery point' : 'Recovered your session',
            canonical.name
          );
        })
        .finally(() => {
          restoreSettled.current = true;
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
      () =>
        autoSave.onSaved(flow => {
          savedSignature.current = signatureOf(flow);
          bumpSaved(t => t + 1);
        }),
      []
    );

    // Track what we last emitted so host echoes of our own changes are
    // ignored, and only genuinely external flows are adopted.
    const lastEmittedRef = useRef<string | null>(null);
    useEffect(() => {
      if (!onChange) return;
      const t = window.setTimeout(() => {
        lastEmittedRef.current = signatureOf(currentFlow);
        onChange(currentFlow);
      }, 250);
      return () => window.clearTimeout(t);
    }, [signature, currentFlow, onChange]);

    useEffect(() => {
      if (!hostFlow) return;
      const incoming = signatureOf(normalizeFlow(hostFlow));
      if (incoming === signatureOf(currentFlowRef.current)) return;
      if (incoming === lastEmittedRef.current) return;
      applyHistoryFlow(hostFlow);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hostFlow]);

    useEffect(() => {
      if (!persistence) return;
      if (!restoreSettled.current) return;
      if (!dirty) return;
      if (nodes.length === 0 && edges.length === 0) return;
      autoSave.update(currentFlow);
    }, [signature, dirty, persistence, currentFlow, nodes.length, edges.length]);

    // ── Live trace state: active node pulse + per-node stats ────────────
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [nodeStats, setNodeStats] = useState(
      new Map<string, { avgLatencyMs: number; avgCost: number; errorRate: number; executionCount: number }>()
    );

    const handleTraceEvent = useCallback(
      (nodeId: string, event: 'start' | 'complete' | 'error', stats: { latencyMs: number; cost?: number }) => {
        setActiveNodeId(nodeId);
        if (event === 'complete' || event === 'error') {
          setNodeStats(prev => {
            const next = new Map(prev);
            const cur = next.get(nodeId) || { avgLatencyMs: 0, avgCost: 0, errorRate: 0, executionCount: 0 };
            const runs = cur.executionCount + 1;
            next.set(nodeId, {
              avgLatencyMs: (cur.avgLatencyMs * cur.executionCount + stats.latencyMs) / runs,
              avgCost: (cur.avgCost * cur.executionCount + (stats.cost || 0)) / runs,
              errorRate: (cur.errorRate * cur.executionCount + (event === 'error' ? 1 : 0)) / runs,
              executionCount: runs
            });
            return next;
          });
        }
      },
      []
    );

    const handleClearTrace = useCallback(() => setActiveNodeId(null), []);
    void handleClearTrace;

    const handleTraceSelectNode = useCallback(
      (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) setSelectedNode(node);
      },
      [nodes]
    );

    // Canvas nodes with live-trace highlight + version-diff tints + preflight
    // severity, projected to the card's status ring and accessible label.
    const [visualDiff, setVisualDiff] = useState<VersionDiff | null>(null);
    const preflightIssues = useMemo(() => lintFlow(nodes, edges), [nodes, edges]);
    const displayNodes = useMemo(() => {
      const severity = new Map<string, 'error' | 'warning'>();
      for (const issue of preflightIssues) {
        if (!issue.nodeId) continue;
        if (issue.type === 'error' || !severity.has(issue.nodeId)) {
          severity.set(issue.nodeId, issue.type === 'error' ? 'error' : 'warning');
        }
      }
      return applyNodePresentation(nodes, { activeNodeId, diff: visualDiff, severity }, type =>
        nodeRegistry.get(type)
      );
    }, [nodes, activeNodeId, visualDiff, preflightIssues]);

    const preflightCount = preflightIssues.length;
    void preflightCount;

    const onConnect = useCallback(
      (params: Connection) => {
        pendingHistoryLabel.current = 'Connect nodes';
        setEdges(eds => addEdge({ ...params, animated: true }, eds));
      },
      [setEdges]
    );

    // ── Add node: drag-and-drop at exact point, or smart click placement ─
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const placeCascade = useRef(0);

    const createNode = useCallback(
      (type: NodeType, position: { x: number; y: number }) => {
        const nodeDef = nodeRegistry.get(type);
        if (!nodeDef) {
          notify('Unknown node type', `“${type}” is not registered`, 'bad');
          return;
        }
        const newNode: Node = {
          id: `${type}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
          type: CURRENT_RENDERER_TYPE,
          position,
          data: {
            label: nodeDef.label,
            config: { ...(nodeDef.config ?? {}) },
            nodeType: type
          }
        };
        setNodes(nds => nds.concat(newNode));
        setSelectedNode(newNode);
        pendingHistoryLabel.current = `Add ${nodeDef.label}`;
      },
      [setNodes, notify]
    );

    const addNode = useCallback(
      (type: NodeType) => {
        const cascadeStep = (placeCascade.current % 6) * 36;
        const rect = canvasRef.current?.getBoundingClientRect();
        let position = { x: 400 + cascadeStep, y: 300 + cascadeStep };
        if (rect && flowInstance.current) {
          const center = flowInstance.current.screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          });
          const step = (placeCascade.current % 6) * 36;
          placeCascade.current += 1;
          position = { x: center.x - 75 + step, y: center.y - 20 + step };
        } else {
          placeCascade.current += 1;
        }
        createNode(type, position);
      },
      [createNode]
    );

    const onDropNode = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/cx-node') as NodeType;
        if (!type || !flowInstance.current) {
          if (e.dataTransfer.types.length > 0 && !type) {
            notify('Drop rejected', 'Drag a node from the palette — use Import/Export for JSON.', 'bad');
          }
          return;
        }
        if (!nodeRegistry.get(type)) {
          notify('Unknown node type', `“${type}” is not registered`, 'bad');
          return;
        }
        createNode(type, flowInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
      },
      [createNode, notify]
    );

    const onNodeDragStop = useCallback(() => {
      historyManager.record(currentFlowRef.current, 'Move nodes', {
        coalesceKey: 'drag',
        coalesceWindowMs: 1500
      });
    }, []);

    const updateNodeConfig = useCallback(
      (nodeId: string, config: NodeConfig) => {
        pendingHistoryLabel.current = 'Edit config';
        pendingCoalesceKey.current = `cfg:${nodeId}`;
        setNodes(nds => nds.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, config } } : n)));
      },
      [setNodes]
    );

    // ── Run ──────────────────────────────────────────────────────────────
    const [lastRun, setLastRun] = useState<{
      ok: boolean;
      latencyMs: number;
      cost: number;
      output: string;
    } | null>(null);

    const runFlow = useCallback(async () => {
      const engine = new FlowEngine(currentFlow);
      engine.setTraceCallback((nodeId, event, data) => handleTraceEvent(nodeId, event, data));
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
        notify('Flow executed', `${latencyMs} ms · $${cost.toFixed(4)}`);
      } catch (err) {
        setLastRun({ ok: false, latencyMs: Date.now() - startedAt, cost: 0, output: String(err) });
        notify('Flow execution failed', String(err), 'bad');
      }
    }, [currentFlow, handleTraceEvent, notify]);

    // ── Import flow — the single ingress for JSON import, version restore,
    //    builder "replace flow", and host-driven updates. Normalize so every
    //    path produces resolvable node types. ─────────────────────────────
    const importFlow = useCallback(
      (flow: FlowGraph) => {
        pendingHistoryLabel.current = `Import ${flow.name}`;
        const canonical = normalizeFlow(flow);
        const displayNodes = normalizeCanvasNodes(canonical.nodes) as unknown as Node[];
        setNodes(displayNodes);
        setEdges(canonical.edges as never[]);
        setFlowName(canonical.name);
        setFlowVersion(canonical.version);
        setSelectedNode(null);
        setVisualDiff(null);
        const imported = {
          id: flowId,
          name: canonical.name,
          version: canonical.version,
          nodes: displayNodes as FlowNode[],
          edges: canonical.edges as FlowEdge[]
        };
        savedSignature.current = signatureOf(imported);
        lastEmittedRef.current = null;
        historyManager.reset(imported, `Import ${canonical.name}`);
        requestAnimationFrame(() => flowInstance.current?.fitView());
        notify('Flow imported', canonical.name);
      },
      [flowId, notify]
    );

    const validateFlow = useCallback(() => FlowValidator.validate(currentFlow), [currentFlow]);

    // ── Feature drawers + palette UI state ───────────────────────────────
    const [paletteOpen, setPaletteOpen] = useState(true);
    const [paletteQuery, setPaletteQuery] = useState('');
    const [activePanel, setActivePanel] = useState<PanelId | null>(null);

    const channel = 'webchat' as ChannelId;
    const channelFx = useMemo(() => ({ capabilities: resolveCapabilities(channel) }), [channel]);

    const paletteItems = useMemo(
      () =>
        nodeRegistry.getAll().map(node => ({
          type: node.type,
          label: node.label,
          icon: node.icon,
          color: node.color,
          category: node.category,
          description: node.description
        })),
      [registryRev]
    );
    const query = paletteQuery.trim().toLowerCase();
    const visiblePaletteItems = query
      ? paletteItems.filter(
          item =>
            item.label.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.category.includes(query)
        )
      : paletteItems;

    const selectedType = domainTypeOf(selectedNode);
    const selectedNodeDef: NodeDefinition | null = (selectedType ? nodeRegistry.get(selectedType) : null) ?? null;
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

    // ── Imperative handle ────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      getFlow: () => currentFlowRef.current,
      run: runFlow,
      undo: () => applyHistoryFlow(historyManager.undo()),
      redo: () => applyHistoryFlow(historyManager.redo()),
      save: saveFlow,
      importFlow,
      clear: clearCanvas,
      addNode,
      focusNode: (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        setSelectedNode(node);
        const position = (node as { position?: { x: number; y: number } }).position;
        if (position && flowInstance.current) {
          flowInstance.current.setCenter(position.x + 110, position.y + 60, { zoom: 1, duration: 300 });
        }
      }
    }));

    const panelDef: Record<PanelId, { label: string; icon: string; enabled: boolean }> = {
      preflight: { label: 'Preflight', icon: '✈️', enabled: features.preflight },
      script: { label: 'Script', icon: '📜', enabled: features.script },
      validation: { label: 'Validation', icon: '✅', enabled: features.validation },
      flowio: { label: 'I/O', icon: '💾', enabled: features.flowIO },
      versions: { label: 'Versions', icon: '🕘', enabled: features.versions },
      builder: { label: 'Builder', icon: '🤖', enabled: features.builderChat },
      analytics: { label: 'Analytics', icon: '📊', enabled: features.analytics }
    };

    return (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          background: theme.bg
        }}
      >
        {toasts.length > 0 && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: Z.toast, display: 'grid', gap: 8, maxWidth: 420 }}>
            {toasts.map(t => (
              <button
                key={t.id}
                onClick={() => dismissToast(t.id)}
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: theme.panel,
                  border: `1px solid ${t.tone === 'bad' ? theme.danger : theme.success}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: theme.text,
                  fontSize: 12
                }}
              >
                <strong>{t.tone === 'bad' ? '🛑' : '✅'} {t.title}</strong>
                {t.body ? <div style={{ color: theme.muted, marginTop: 2 }}>{t.body}</div> : null}
              </button>
            ))}
          </div>
        )}

        {/* Node palette drawer */}
        {features.palette && paletteOpen && (
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
              <button
                onClick={() => setPaletteOpen(false)}
                style={ghostButtonStyle()}
                title="Hide palette (P)"
                aria-label="Hide palette"
              >
                «
              </button>
            </div>
            <input
              value={paletteQuery}
              onChange={e => setPaletteQuery(e.target.value)}
              placeholder="Search nodes…"
              aria-label="Search nodes"
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

            {CATEGORY_ORDER.map(category => {
              const items = visiblePaletteItems.filter(item => item.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: theme.muted }}>{category}</h3>
                  {items.map(item => (
                    <div
                      key={item.type}
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label={`Add ${item.label} node`}
                      onDragStart={e => {
                        e.dataTransfer.setData('application/cx-node', item.type);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => addNode(item.type)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          addNode(item.type);
                        }
                      }}
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
            })}
            {visiblePaletteItems.length === 0 && (
              <Empty>
                No nodes match “{paletteQuery}”.
                <div style={{ marginTop: 8 }}>
                  <Button size="sm" tone="ghost" onClick={() => setPaletteQuery('')}>
                    Clear search
                  </Button>
                </div>
              </Empty>
            )}
          </div>
        )}

        {/* Canvas */}
        <div
          ref={canvasRef}
          onDrop={onDropNode}
          onDragOver={e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0 }}
        >
          {/* Toolbar */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: 12,
              zIndex: Z.canvasToolbar,
              display: 'flex',
              gap: 8,
              rowGap: 8,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            {features.palette && !paletteOpen && (
              <button
                onClick={() => setPaletteOpen(true)}
                style={{ ...ghostButtonStyle(), background: theme.panel2 }}
                title="Show palette (P)"
                aria-label="Show node palette (P)"
              >
                🎨
              </button>
            )}
            <input
              value={flowName}
              onChange={e => {
                pendingHistoryLabel.current = 'Rename flow';
                setFlowName(e.target.value);
              }}
              aria-label="Flow name"
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
              {persistence ? (dirty ? '● unsaved' : '✓ saved') : `${nodes.length} editing`}
            </span>
            <span style={{ fontSize: 11, color: theme.muted }}>
              {nodes.length} node{nodes.length === 1 ? '' : 's'}
            </span>

            <select
              value={channel}
              onChange={() => undefined}
              title="Design target channel — the canvas stays channel-agnostic; nodes fall back gracefully"
              style={{
                background: theme.panel2,
                color: theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                padding: '7px 8px',
                fontSize: 12,
                cursor: 'pointer'
              }}
              aria-label="Design channel"
            >
              {Object.keys(CHANNEL_CAPABILITIES).map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div style={{ flex: 1 }} />

            {(Object.entries(panelDef) as Array<[PanelId, { label: string; icon: string; enabled: boolean }]>)
              .filter(([, p]) => p.enabled)
              .map(([id, p]) => (
                <button
                  key={id}
                  onClick={() => setActivePanel(cur => (cur === id ? null : id))}
                  style={{
                    ...ghostButtonStyle(),
                    background: activePanel === id ? theme.accent : theme.panel2,
                    color: activePanel === id ? '#052e1f' : theme.text
                  }}
                  title={`Toggle ${p.label} drawer`}
                >
                  {p.icon} {p.label}
                </button>
              ))}

            {persistence && (
              <button onClick={saveFlow} style={{ ...ghostButtonStyle(), background: theme.panel2 }} title="Save (Ctrl+S)">
                💾
              </button>
            )}
            <button
              onClick={() => void runFlow()}
              style={{ ...ghostButtonStyle(), background: theme.success, color: '#052e1f', fontWeight: 600 }}
              title="Run flow (Ctrl+↵)"
            >
              ▶ Run
            </button>
          </div>

          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            nodeTypes={canvasNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setActivePanel(null);
              setSelectedNode(node);
            }}
            onNodeDragStop={onNodeDragStop}
            onPaneClick={() => setSelectedNode(null)}
            onInit={instance => {
              flowInstance.current = instance;
            }}
            fitView
            style={{ paddingTop: 56 }}
          >
            <Background color="var(--cx-border)" gap={16} />
            <Controls />
            {nodes.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: theme.muted,
                  pointerEvents: 'none',
                  zIndex: Z.minimap
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎛️</div>
                <div style={{ fontSize: 14, marginBottom: 6 }}>Start here</div>
                <div style={{ fontSize: 13, marginBottom: 14, maxWidth: 320, lineHeight: 1.6 }}>
                  Drag nodes in from the palette, or open the Builder drawer and describe the agent you want.
                </div>
              </div>
            )}
            <MiniMap
              nodeColor={n => {
                const type = domainTypeOf(n);
                const def = type ? nodeRegistry.get(type) : undefined;
                return def?.color || '#666';
              }}
            />
          </ReactFlow>

          {/* Last run summary */}
          {lastRun && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                zIndex: Z.lastRun,
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
                <button
                  onClick={() => {
                    setLastRun(null);
                    setActivePanel(null);
                  }}
                  style={{ ...ghostButtonStyle(), padding: '2px 8px', fontSize: 11 }}
                >
                  ×
                </button>
              </div>
              {lastRun.output && (
                <div style={{ marginTop: 6, color: theme.muted, maxHeight: 48, overflow: 'hidden' }}>
                  {lastRun.output}
                </div>
              )}
            </div>
          )}

          {/* Feature drawer (right overlay inside the canvas area) */}
          {activePanel && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                bottom: 12,
                width: 420,
                zIndex: Z.lastRun + 5,
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                color: theme.text,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderBottom: `1px solid ${theme.border}`
                }}
              >
                <strong style={{ fontSize: 13 }}>
                  {panelDef[activePanel].icon} {panelDef[activePanel].label}
                </strong>
                <button
                  onClick={() => setActivePanel(null)}
                  style={{ ...ghostButtonStyle(), border: 'none', fontSize: 14 }}
                  title="Close drawer (Esc)"
                  aria-label="Close drawer"
                >
                  ×
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {activePanel === 'preflight' && (
                  <PreflightPanel
                    nodes={nodes}
                    edges={edges}
                    flowName={flowName}
                    flowVersion={flowVersion}
                    onSelectNode={handleTraceSelectNode}
                  />
                )}
                {activePanel === 'script' && (
                  <ScriptView
                    nodes={nodes}
                    edges={edges}
                    onSelectNode={handleTraceSelectNode}
                    onRemoveNode={removeNodeById}
                  />
                )}
                {activePanel === 'validation' && (
                  <ValidationPanel result={validateFlow()} onSelectNode={handleTraceSelectNode} />
                )}
                {activePanel === 'flowio' && <FlowIO flow={currentFlow} onImport={importFlow} />}
                {activePanel === 'versions' && (
                  <VersionControlPanel
                    flowId={flowId}
                    currentFlow={currentFlow}
                    onRestore={importFlow}
                    onVisualDiff={setVisualDiff}
                  />
                )}
                {activePanel === 'builder' && (
                  <BuilderChat
                    nodes={nodes}
                    edges={edges}
                    selectedNodeId={selectedNode?.id || null}
                    channel={channel}
                    onReplaceFlow={importFlow}
                    onAddNode={addNode}
                    onConnectNodes={connectNodes}
                    onConfigureNode={configureNode}
                    onRemoveNode={removeNodeById}
                    onClearCanvas={clearCanvas}
                  />
                )}
                {activePanel === 'analytics' && <AnalyticsOverlay nodes={nodes} edges={edges} metrics={nodeStats} />}
              </div>
            </div>
          )}
        </div>

        {/* Config panel — node selected */}
        {selectedNode && selectedNodeDef && (
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
              <button
                onClick={() => setSelectedNode(null)}
                style={{ ...ghostButtonStyle(), border: 'none', fontSize: 16 }}
                title="Close config panel"
                aria-label="Close config panel"
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>{selectedNodeDef.description}</p>

            {!nodeValidation.valid && (
              <div
                role="alert"
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
                onChange={config => updateNodeConfig(selectedNode.id, config)}
              />
            </div>

            {/* Channel behaviour for the designed node */}
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 6,
                background: 'rgba(16,185,129,0.06)',
                border: `1px solid ${theme.success}`,
                fontSize: 12,
                color: theme.text
              }}
            >
              <strong style={{ fontSize: 11, textTransform: 'uppercase', color: theme.muted }}>
                On {channel} channel
              </strong>
              <div style={{ marginTop: 4, color: theme.success, lineHeight: 1.45 }}>
                ✓ Native. Available:{' '}
                {(Object.entries(channelFx.capabilities) as Array<[string, boolean]>)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(', ') || 'text only'}
                .
              </div>
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
              {selectedNodeDef.inputs.map(input => (
                <div key={input.id} style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                  • {input.label} ({input.type})
                  {input.required && <span style={{ color: theme.danger }}> *</span>}
                </div>
              ))}
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: theme.muted, marginTop: 12 }}>Outputs</h3>
              {selectedNodeDef.outputs.map(output => (
                <div key={output.id} style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                  • {output.label} ({output.type})
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Repair panel — a selected node whose type no longer resolves */}
        {selectedNode && !selectedNodeDef && (
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
              <h2 style={{ margin: 0, fontSize: 15 }}>❓ Unrecognised node</h2>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ ...ghostButtonStyle(), border: 'none', fontSize: 16 }}
                title="Close panel"
                aria-label="Close panel"
              >
                ×
              </button>
            </div>
            <div role="alert" style={{ marginTop: 12, fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
              “{String(selectedNode.data?.label || selectedNode.id)}” has type
              “{String((selectedNode.data as { nodeType?: unknown })?.nodeType || selectedNode.type)}”, which is not
              registered. It may come from a stale import or an unregistered custom type.
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                size="sm"
                tone="danger"
                onClick={() => {
                  removeNodeById(selectedNode.id);
                  notify('Node deleted');
                }}
              >
                🗑️ Delete node
              </Button>
            </div>
          </aside>
        )}
      </div>
    );
  }
);

export function ghostButtonStyle(): React.CSSProperties {
  return {
    padding: '7px 12px',
    borderRadius: 6,
    border: `1px solid ${theme.border}`,
    background: theme.panel2,
    color: theme.text,
    cursor: 'pointer',
    fontSize: 12
  };
}
