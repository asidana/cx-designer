/**
 * WebSocket Client — real-time testing
 * 
 * Connects to the backend WebSocket for live agent testing.
 * Handles audio streaming, trace events, and metrics.
 */

import type { TraceEventType } from '../engine/flowEngine';

export interface TraceEvent {
  id: string;
  timestamp: number;
  nodeId: string;
  eventType: TraceEventType | 'guardrail' | 'tool_call';
  data: Record<string, unknown>;
  latencyMs: number;
}

export interface Metrics {
  totalLatencyMs: number;
  tokenCount: number;
  cost: number;
  guardrailViolations: number;
}

export interface WebSocketConfig {
  url: string;
  flowId: string;
  onTrace: (event: TraceEvent) => void;
  onMetrics: (metrics: Metrics) => void;
  onAudio: (audio: ArrayBuffer) => void;
  onError: (error: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export class TestWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    try {
      this.ws = new WebSocket(`${this.config.url}/ws/test/${this.config.flowId}`);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.config.onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        this.config.onError('WebSocket error');
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.config.onDisconnect();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.config.onError(String(error));
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send text input for testing
   */
  sendText(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'test.text',
        text,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Send audio chunk for testing
   */
  sendAudio(audio: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'test.audio',
        chunk: Array.from(new Uint8Array(audio)),
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Start a test session
   */
  startSession(config: {
    voiceEnabled: boolean;
    mockTools: boolean;
    recordSession: boolean;
  }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'test.start',
        config,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'test.trace':
        this.config.onTrace({
          id: message.id || `trace_${Date.now()}`,
          timestamp: message.timestamp,
          nodeId: message.nodeId,
          eventType: message.eventType,
          data: message.data,
          latencyMs: message.latencyMs
        });
        break;

      case 'test.metrics':
        this.config.onMetrics({
          totalLatencyMs: message.totalLatencyMs,
          tokenCount: message.tokenCount,
          cost: message.cost,
          guardrailViolations: message.guardrailViolations
        });
        break;

      case 'test.audio':
        const audioData = new Uint8Array(message.chunk).buffer;
        this.config.onAudio(audioData);
        break;

      default:
        console.log('[WebSocket] Unknown message type:', message.type);
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
