/**
 * Real-Time Test Console
 * 
 * Talk to the agent while building it.
 * Features:
 * - Microphone input (Web Audio API)
 * - Live trace view (node-by-node execution)
 * - Metrics dashboard (latency, cost, tokens)
 * - Node inspector (click node to see details)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { FlowEngine, TraceEventType } from '../engine/flowEngine';
import { FlowGraph, FlowNode, FlowEdge, AuditEvent } from '../types/node';
import {
  listTestCases,
  saveTestCase,
  deleteTestCase,
  SavedTestCase
} from '../evals/TestCaseStore';
import { WaterfallPanel, WaterfallSegment, LATENCY_BUDGET_MS } from './WaterfallPanel';

interface TestConsoleProps {
  nodes: Node[];
  edges: Edge[];
  flowName: string;
  onTraceEvent: (nodeId: string, event: TraceEventType, stats: { latencyMs: number; cost?: number }) => void;
  onSelectNode: (nodeId: string) => void;
  onClearTrace: () => void;
}

interface TraceEvent {
  id: string;
  timestamp: number;
  nodeId: string;
  eventType: 'start' | 'complete' | 'error' | 'guardrail' | 'tool_call';
  data: Record<string, unknown>;
  latencyMs: number;
}

interface Metrics {
  totalLatencyMs: number;
  tokenCount: number;
  cost: number;
  guardrailViolations: number;
}

export const TestConsole: React.FC<TestConsoleProps> = ({
  nodes,
  edges,
  flowName,
  onTraceEvent,
  onSelectNode,
  onClearTrace
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ totalLatencyMs: 0, tokenCount: 0, cost: 0, guardrailViolations: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [startNodeId, setStartNodeId] = useState<string>('');
  const [injectedState, setInjectedState] = useState<string>(
    '{\n  "identity_verified": true,\n  "balance": 40\n}'
  );
  const [stateError, setStateError] = useState<string | null>(null);
  const [savedCases, setSavedCases] = useState<SavedTestCase[]>(() => listTestCases());
  const [activeTab, setActiveTab] = useState<'trace' | 'waterfall' | 'cases'>('trace');
  const [runSegments, setRunSegments] = useState<WaterfallSegment[]>([]);
  const [lastRun, setLastRun] = useState<{
    input: string;
    startNodeId: string | null;
    injectedState: Record<string, unknown>;
    output: string;
    cost: number;
  } | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const engineRef = useRef<FlowEngine | null>(null);

  // Initialize engine (rebuilds on canvas change; re-attaches trace forwarding)
  useEffect(() => {
    const graph: FlowGraph = {
      id: 'test_flow',
      name: flowName,
      version: '1.0.0',
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[]
    };
    const engine = new FlowEngine(graph);
    engine.setTraceCallback((nodeId, event, stats) => {
      setTraceEvents(prev => [
        ...prev,
        {
          id: `trace_${Date.now()}_${prev.length}`,
          timestamp: Date.now(),
          nodeId,
          eventType: event,
          data: {},
          latencyMs: stats.latencyMs
        }
      ]);
      if (event === 'complete' || event === 'error') {
        const label = String(
          nodes.find(n => n.id === nodeId)?.data?.label || nodeId
        );
        setRunSegments(prev => [
          ...prev,
          {
            nodeId,
            label,
            latencyMs: stats.latencyMs,
            cost: stats.cost || 0,
            errored: event === 'error'
          }
        ]);
      }
      onTraceEvent(nodeId, event, stats);
    });
    engineRef.current = engine;
  }, [nodes, edges, flowName, onTraceEvent]);

  // Add log entry
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Start/stop recording
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      addLog('Recording stopped');
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          // In real implementation: send to STT service
          addLog(`Audio recorded: ${(audioBlob.size / 1024).toFixed(1)}KB`);
          
          // Mock transcript for now
          const mockTranscript = 'Hello, I need help with my account';
          setTranscript(mockTranscript);
          addLog(`Transcript: "${mockTranscript}"`);
          
          // Execute flow
          if (engineRef.current) {
            addLog('Executing flow...');
            try {
              const result = await engineRef.current.execute(mockTranscript, 'test_session');
              addLog(`Flow completed. Cost: $${result.outputs.cost || 0}`);
              setMetrics(prev => ({
                ...prev,
                totalLatencyMs: prev.totalLatencyMs + 1200,
                tokenCount: prev.tokenCount + 150,
                cost: prev.cost + (result.outputs.cost as number) || 0
              }));
            } catch (error) {
              addLog(`Flow error: ${error}`);
            }
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        addLog('Recording started...');
      } catch (error) {
        addLog(`Microphone error: ${error}`);
      }
    }
  }, [isRecording, addLog]);

  // Parse injected session state (empty = start clean)
  const parseInjectedState = useCallback((): Record<string, unknown> | null => {
    if (!injectedState.trim()) {
      setStateError(null);
      return {};
    }
    try {
      const parsed = JSON.parse(injectedState) as Record<string, unknown>;
      setStateError(null);
      return parsed;
    } catch {
      setStateError('State is not valid JSON — running without injection.');
      return null;
    }
  }, [injectedState]);

  // Text input for testing (supports "start from here" + state injection)
  const handleTextSubmit = useCallback(async (text: string) => {
    if (!text.trim() || !engineRef.current) return;

    const state = parseInjectedState();
    if (state === null) return;

    addLog(`User: "${text}"`);
    setTranscript(text);
    setRunSegments([]);
    onClearTrace();

    try {
      const result = startNodeId
        ? await engineRef.current.executeFrom(startNodeId, text, 'test_session', state)
        : await engineRef.current.execute(text, 'test_session');
      const output = String(result.outputs.response || 'No response');
      const cost = (result.outputs.cost as number) || 0;
      addLog(`Agent: "${output}"`);
      setMetrics(prev => ({
        ...prev,
        totalLatencyMs: prev.totalLatencyMs + 800,
        tokenCount: prev.tokenCount + 120,
        cost: prev.cost + cost
      }));
      setLastRun({
        input: text,
        startNodeId: startNodeId || null,
        injectedState: state,
        output,
        cost
      });
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  }, [addLog, parseInjectedState, startNodeId, onClearTrace]);

  // Pin the last run as an eval case
  const handleSaveCase = useCallback(() => {
    if (!lastRun) return;
    const saved = saveTestCase({
      name: `${lastRun.input.slice(0, 40)}${lastRun.input.length > 40 ? '…' : ''}`,
      input: lastRun.input,
      startNodeId: lastRun.startNodeId,
      injectedState: lastRun.injectedState,
      actualOutput: lastRun.output,
      expectedOutput: lastRun.output,
      cost: lastRun.cost
    });
    setSavedCases(listTestCases());
    addLog(`Saved as test case: "${saved.name}" (edit expected output later)`);
  }, [lastRun, addLog]);

  // Load a saved case back into the test fields
  const handleLoadCase = useCallback((c: SavedTestCase) => {
    setTranscript(c.input);
    setStartNodeId(c.startNodeId || '');
    setInjectedState(JSON.stringify(c.injectedState, null, 2));
    addLog(`Loaded test case: "${c.name}"`);
  }, [addLog]);

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 300,
      background: '#0f0f1a',
      borderTop: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>🧪 Test Console</span>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 4,
            background: isConnected ? '#10b981' : '#ef4444',
            color: 'white'
          }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={toggleRecording}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              background: isRecording ? '#ef4444' : '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            {isRecording ? '⏹ Stop' : '🎤 Record'}
          </button>
          <button
            onClick={handleSaveCase}
            disabled={!lastRun}
            title="Pin the last run as an eval case"
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              background: lastRun ? '#8b5cf6' : '#333',
              color: 'white',
              cursor: lastRun ? 'pointer' : 'not-allowed',
              fontSize: 12
            }}
          >
            📌 Save case
          </button>
          <button
            onClick={() => { setTraceEvents([]); setLogs([]); setLastRun(null); setRunSegments([]); onClearTrace(); setMetrics({ totalLatencyMs: 0, tokenCount: 0, cost: 0, guardrailViolations: 0 }); }}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid #333',
              background: 'transparent',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Trace / Waterfall / Cases tabs */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {(
              [
                ['trace', 'Trace'],
                ['waterfall', 'Waterfall'],
                ['cases', `Cases (${savedCases.length})`]
              ] as Array<[typeof activeTab, string]>
            ).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: activeTab === tab ? '#8b5cf6' : '#1a1a2e',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'waterfall' ? (
            <WaterfallPanel segments={runSegments} budgetMs={LATENCY_BUDGET_MS} />
          ) : activeTab === 'cases' ? (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                PINNED EVAL CASES — click to reload into test fields
              </div>
              {savedCases.length === 0 ? (
                <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 24 }}>
                  No saved cases yet. Run a test, then hit "📌 Save case".
                </div>
              ) : (
                savedCases.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11,
                      color: '#aaa',
                      marginBottom: 4,
                      padding: 6,
                      background: '#1a1a2e',
                      borderRadius: 4
                    }}
                  >
                    <span
                      onClick={() => handleLoadCase(c)}
                      style={{ cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={c.input}
                    >
                      📌 {c.name}
                    </span>
                    <button
                      onClick={() => {
                        deleteTestCase(c.id);
                        setSavedCases(listTestCases());
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                      title="Delete case"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                TRACE VIEW — click a row to jump to the node
              </div>
              {traceEvents.length === 0 && logs.length === 0 ? (
                <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 40 }}>
                  Click "Record" or type a message to start testing
                </div>
              ) : (
                <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {traceEvents.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectNode(t.nodeId)}
                      title="Jump to node on canvas"
                      style={{
                        color: t.eventType === 'error' ? '#ef4444' : '#7dd3fc',
                        marginBottom: 2,
                        cursor: 'pointer'
                      }}
                    >
                      [{t.eventType}] {t.nodeId} ({t.latencyMs}ms)
                    </div>
                  ))}
                  {logs.map((log, i) => (
                    <div key={`log_${i}`} style={{
                      color: log.includes('Error') ? '#ef4444' : log.includes('Agent') ? '#10b981' : '#aaa',
                      marginBottom: 2
                    }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Metrics */}
        <div style={{ width: 200, borderLeft: '1px solid #333', padding: 8 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>METRICS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MetricItem label="Latency" value={`${metrics.totalLatencyMs}ms`} />
            <MetricItem label="Tokens" value={metrics.tokenCount.toString()} />
            <MetricItem label="Cost" value={`$${metrics.cost.toFixed(4)}`} />
            <MetricItem label="Violations" value={metrics.guardrailViolations.toString()} />
          </div>
        </div>

        {/* Node Inspector */}
        <div style={{ width: 250, borderLeft: '1px solid #333', padding: 8, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>NODE INSPECTOR</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            <div style={{ marginBottom: 4 }}>• Click a node on the canvas</div>
            <div style={{ marginBottom: 4 }}>• View inputs/outputs</div>
            <div style={{ marginBottom: 4 }}>• See execution time</div>
            <div>• Debug issues</div>
          </div>
        </div>
      </div>

      {/* Start-from-here + state injection */}
      <div style={{ padding: '8px 8px 0', display: 'flex', gap: 8 }}>
        <select
          value={startNodeId}
          onChange={(e) => setStartNodeId(e.target.value)}
          title="Start execution from a specific node instead of the flow entry"
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
          <option value="">Start: flow entry</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              Start from: {String(n.data?.label || n.id)}
            </option>
          ))}
        </select>
        <input
          value={injectedState}
          onChange={(e) => setInjectedState(e.target.value)}
          title='Session state JSON injected at start (e.g. {"identity_verified": true})'
          placeholder='{"identity_verified": true}'
          spellCheck={false}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 4,
            border: stateError ? '1px solid #ef4444' : '1px solid #333',
            background: '#1a1a2e',
            color: 'white',
            fontSize: 12,
            fontFamily: 'monospace'
          }}
        />
      </div>
      {stateError && (
        <div style={{ padding: '4px 8px 0', fontSize: 11, color: '#ef4444' }}>{stateError}</div>
      )}

      {/* Text Input */}
      <div style={{ padding: 8, borderTop: '1px solid #333' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('testInput') as HTMLInputElement;
            if (input.value.trim()) {
              handleTextSubmit(input.value);
              input.value = '';
            }
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            name="testInput"
            type="text"
            placeholder="Type a message to test the agent..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #333',
              background: '#1a1a2e',
              color: 'white',
              fontSize: 13
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: 'none',
              background: '#10b981',
              color: 'white',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

const MetricItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
    <span style={{ color: '#888' }}>{label}</span>
    <span style={{ color: 'white', fontFamily: 'monospace' }}>{value}</span>
  </div>
);
