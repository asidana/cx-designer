/**
 * Flow Engine — DAG execution with voice-aware continuous loop.
 * 
 * Inspired by Flowise's pattern but extended for real-time voice:
 * - Continuous audio stream processing
 * - Barge-in handling
 * - Stateful session management
 */

import { FlowGraph, FlowNode, ExecutionContext, NodeResult, AudioChunk } from '../types/node';
import { nodeRegistry } from '../nodes/registry';
import { monitoringService } from '../monitoring/Monitoring';
// Side-effect import: registers all built-in nodes + framework adapters,
// so the engine works standalone (tests, scripts) without the App shell.
import '../nodes/index';

export type TraceEventType = 'start' | 'complete' | 'error';
export type TraceCallback = (
  nodeId: string,
  event: TraceEventType,
  data: { latencyMs: number; cost?: number; error?: string }
) => void;

export class FlowEngine {
  private graph: FlowGraph;
  private sessionVariables: Record<string, unknown> = {};
  private audioPipeline: AudioPipeline | null = null;
  private isRunning = false;
  private inFlight: AbortController | null = null;
  private heardTranscript: string[] = [];
  private traceCallback: TraceCallback | null = null;

  constructor(graph: FlowGraph) {
    this.graph = graph;
  }

  /** Subscribe to per-node execution events (drives canvas trace animation). */
  setTraceCallback(cb: TraceCallback | null): void {
    this.traceCallback = cb;
  }

  /**
   * Execute the flow for a single turn (text input).
   * initialState is merged first — carriers (chat runtime, page widget)
   * use it for envelope context such as pageContext.
   */
  async execute(
    input: string,
    sessionId: string,
    initialState: Record<string, unknown> = {}
  ): Promise<NodeResult> {
    // Find entry nodes (no incoming edges)
    const entryNodes = this.getEntryNodes();
    if (entryNodes.length === 0) {
      throw new Error('No entry nodes found in flow');
    }

    // Execute starting from first entry node
    return this.executeFrom(entryNodes[0].id, input, sessionId, initialState);
  }

  /**
   * Execute starting from a specific node ("start from here").
   * initialState is injected into session variables first, so testers can
   * skip preamble (e.g. { identity_verified: true, balance: 40 }).
   */
  async executeFrom(
    nodeId: string,
    input: string,
    sessionId: string,
    initialState: Record<string, unknown> = {}
  ): Promise<NodeResult> {
    const context = this.createContext(sessionId);
    context.variables.set('input', input);
    for (const [key, value] of Object.entries(initialState)) {
      context.variables.set(key, value);
    }

    if (!this.graph.nodes.find(n => n.id === nodeId)) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const startedAt = Date.now();
    try {
      const result = await this.executeNode(nodeId, context);
      monitoringService.recordFlowExecution(this.graph.id, {
        latencyMs: Date.now() - startedAt,
        cost: context.costAccumulator,
        tokenCount: (result.outputs.tokens as number) || 0,
        success: true
      });
      return result;
    } catch (error) {
      monitoringService.recordFlowExecution(this.graph.id, {
        latencyMs: Date.now() - startedAt,
        cost: context.costAccumulator,
        tokenCount: 0,
        success: false,
        errorType: error instanceof Error ? error.name : 'error'
      });
      throw error;
    }
  }

  /**
   * Start a continuous voice session
   */
  async startVoiceSession(
    sessionId: string,
    audioStream: AsyncIterable<AudioChunk>
  ): Promise<void> {
    this.isRunning = true;
    const context = this.createContext(sessionId);
    context.audioStream = audioStream;

    // Initialize audio pipeline (streaming, frame-based; STT emits partial + final)
    this.audioPipeline = new AudioPipeline({
      onTranscript: (text: string, isFinal: boolean) => {
        if (!isFinal) return;
        // Cancel in-flight LLM/tool work on barge-in, then start new turn
        this.inFlight?.abort();
        this.inFlight = new AbortController();
        this.heardTranscript.push(text);
        void this.handleTranscript(text, context, this.inFlight.signal);
      },
      onBargeIn: () => {
        // Stop TTS AND cancel in-flight LLM/tool calls; truncate to what caller heard
        this.inFlight?.abort();
        this.inFlight = new AbortController();
        context.voiceState.isSpeaking = false;
        context.variables.set('bargeIn', true);
        this.truncateToHeard(context);
      }
    });

    // Process audio stream
    for await (const chunk of audioStream) {
      if (!this.isRunning) break;
      await this.audioPipeline.processChunk(chunk);
    }
  }

  /**
   * Stop the voice session
   */
  stopVoiceSession(): void {
    this.isRunning = false;
    this.audioPipeline?.stop();
  }

  /**
   * Handle a final transcript from STT (non-blocking: never awaited by audio loop)
   */
  private async handleTranscript(text: string, context: ExecutionContext, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    context.variables.set('input', text);
    context.variables.set('timestamp', Date.now());

    // Find entry nodes
    const entryNodes = this.getEntryNodes();
    if (entryNodes.length === 0) return;

    // Execute flow
    const result = await this.executeNode(entryNodes[0].id, context);

    // Handle audio output
    if (result.audioOutput && result.shouldSpeak) {
      // In real implementation, this would stream to TTS
      console.log('[FlowEngine] Audio output:', result.outputs);
    }
  }

  /**
   * Execute a single node and follow its edges
   */
  private async executeNode(nodeId: string, context: ExecutionContext): Promise<NodeResult> {
    const node = this.graph.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const nodeDef = nodeRegistry.get(node.type);
    if (!nodeDef) {
      throw new Error(`Unknown node type: ${node.type}`);
    }

    // Execute the node
    const startTime = Date.now();
    this.traceCallback?.(nodeId, 'start', { latencyMs: 0 });
    context.auditLog.push({
      id: `audit_${Date.now()}`,
      timestamp: startTime,
      nodeId,
      eventType: 'start',
      data: { input: context.variables.get('input') },
      latencyMs: 0
    });

    try {
      // Effective config: type defaults merged with this instance's config.
      const effectiveConfig = { ...(nodeDef.config || {}), ...(node.data.config || {}) };
      const result = await nodeDef.execute(context, effectiveConfig);
      const latency = Date.now() - startTime;

      // Update context with results
      Object.entries(result.variableUpdates).forEach(([key, value]) => {
        context.variables.set(key, value);
      });
      const nodeCost = (result.outputs.cost as number) || 0;
      context.costAccumulator += nodeCost;
      // Real metrics — what the Observability and Insights pages read.
      monitoringService.recordNodeExecution(this.graph.id, nodeId, {
        latencyMs: latency,
        success: true,
        guardrailViolations: result.guardrailViolations?.length || 0
      });
      this.traceCallback?.(nodeId, 'complete', {
        latencyMs: latency,
        cost: nodeCost
      });

      // Log completion
      context.auditLog.push({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        nodeId,
        eventType: 'complete',
        data: { output: result.outputs, cost: result.outputs.cost },
        latencyMs: latency
      });

      // Follow edges to next nodes: explicit node routing wins,
      // otherwise follow the canvas edges (per-turn DAG).
      const nextIds =
        result.nextNodes.length > 0
          ? result.nextNodes
          : this.graph.edges.filter(e => e.source === nodeId).map(e => e.target);
      if (nextIds.length > 0) {
        const nextResults = await Promise.all(
          nextIds.map(nextId => this.executeNode(nextId, context))
        );
        // Return the last result (or merge if parallel)
        return nextResults[nextResults.length - 1] || result;
      }

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.traceCallback?.(nodeId, 'error', { latencyMs: latency, error: String(error) });
      monitoringService.recordNodeExecution(this.graph.id, nodeId, {
        latencyMs: latency,
        success: false,
        guardrailViolations: 0
      });
      context.auditLog.push({
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        nodeId,
        eventType: 'error',
        data: { error: String(error) },
        latencyMs: latency
      });
      throw error;
    }
  }

  /**
   * Get entry nodes (no incoming edges)
   */
  private getEntryNodes(): FlowNode[] {
    const targetIds = new Set(this.graph.edges.map(e => e.target));
    return this.graph.nodes.filter(n => !targetIds.has(n.id));
  }

  /**
   * Create execution context.
   * In-memory variables stay a Map for ergonomics, but the persisted
   * session is always the plain-record snapshot from snapshotSession().
   */
  private createContext(sessionId: string): ExecutionContext {
    return {
      sessionId,
      userId: 'anonymous',
      channel: 'voice',
      variables: new Map(Object.entries(this.sessionVariables)),
      voiceState: {
        isListening: true,
        isSpeaking: false,
        bargeInEnabled: true
      },
      guardrails: [],
      auditLog: [],
      costAccumulator: 0,
      toolRegistry: { tools: [], getTool: () => undefined },
      mcpClients: new Map()
    };
  }

  /** Serializable snapshot for checkpointing / resume / multi-server. */
  snapshotSession(context: ExecutionContext): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    context.variables.forEach((value, key) => {
      snapshot[key] = value as unknown;
    });
    this.sessionVariables = snapshot;
    return { ...snapshot };
  }

  /** Restore from a plain-record snapshot (never Map, never AudioContext). */
  restoreSession(snapshot: Record<string, unknown>): void {
    this.sessionVariables = { ...snapshot };
  }

  /**
   * Truncate conversation history to what the caller actually heard.
   * Prevents the agent referencing speech that was interrupted mid-sentence.
   */
  private truncateToHeard(context: ExecutionContext): void {
    const history = context.variables.get('conversationHistory') as Array<{ role: string; content: string }> | undefined;
    if (!history || history.length === 0) return;
    const heardCount = this.heardTranscript.length;
    context.variables.set('conversationHistory', history.slice(0, Math.max(1, heardCount)));
    context.variables.set('interrupted', true);
  }
}

/**
 * Audio Pipeline — handles STT, VAD, and TTS
 */
class AudioPipeline {
  constructor(
    _config: {
      onTranscript: (text: string, isFinal: boolean) => void;
      onBargeIn: () => void;
    }
  ) {}

  async processChunk(_chunk: AudioChunk): Promise<void> {
    // In real implementation:
    // 1. Run VAD on chunk
    // 2. If speech detected, run STT
    // 3. If user speaking while TTS active, trigger barge-in
    // 4. Call onTranscript with result
  }

  stop(): void {
    // Cleanup
  }
}
