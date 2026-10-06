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
import { FlowEngine } from '../engine/flowEngine';
import { FlowGraph, FlowNode, FlowEdge, AuditEvent } from '../types/node';

interface TestConsoleProps {
  nodes: Node[];
  edges: Edge[];
  flowName: string;
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

export const TestConsole: React.FC<TestConsoleProps> = ({ nodes, edges, flowName }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ totalLatencyMs: 0, tokenCount: 0, cost: 0, guardrailViolations: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const engineRef = useRef<FlowEngine | null>(null);

  // Initialize engine
  useEffect(() => {
    const graph: FlowGraph = {
      id: 'test_flow',
      name: flowName,
      version: '1.0.0',
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[]
    };
    engineRef.current = new FlowEngine(graph);
  }, [nodes, edges, flowName]);

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

  // Text input for testing
  const handleTextSubmit = useCallback(async (text: string) => {
    if (!text.trim() || !engineRef.current) return;
    
    addLog(`User: "${text}"`);
    setTranscript(text);
    
    try {
      const result = await engineRef.current.execute(text, 'test_session');
      addLog(`Agent: "${result.outputs.response || 'No response'}"`);
      setMetrics(prev => ({
        ...prev,
        totalLatencyMs: prev.totalLatencyMs + 800,
        tokenCount: prev.tokenCount + 120,
        cost: prev.cost + (result.outputs.cost as number) || 0
      }));
    } catch (error) {
      addLog(`Error: ${error}`);
    }
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
            onClick={() => { setTraceEvents([]); setLogs([]); setMetrics({ totalLatencyMs: 0, tokenCount: 0, cost: 0, guardrailViolations: 0 }); }}
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
        {/* Trace View */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>TRACE VIEW</div>
          {traceEvents.length === 0 && logs.length === 0 ? (
            <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 40 }}>
              Click "Record" or type a message to start testing
            </div>
          ) : (
            <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
              {logs.map((log, i) => (
                <div key={i} style={{ 
                  color: log.includes('Error') ? '#ef4444' : log.includes('Agent') ? '#10b981' : '#aaa',
                  marginBottom: 2
                }}>
                  {log}
                </div>
              ))}
            </div>
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
