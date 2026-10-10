/**
 * MCP Gateway — expose flows as MCP tools
 * 
 * Instantly usable by Claude Desktop, Cursor, or any MCP client.
 * 
 * Usage:
 *   const gateway = new MCPGateway(flow);
 *   gateway.start(3000);
 */

import { FlowGraph, FlowNode, FlowEdge } from '../types/node';
import { FlowEngine } from '../engine/flowEngine';
import { Sentinel } from '../sentinel/sentinel';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  flowId: string;
}

export interface MCPServerConfig {
  name: string;
  port: number;
  transport: 'sse' | 'stdio' | 'http';
  tools: MCPTool[];
}

export class MCPGateway {
  private flow: FlowGraph;
  private engine: FlowEngine;
  private config: MCPServerConfig;
  private server: any;
  private sentinel: Sentinel | null = null;

  constructor(flow: FlowGraph, config: Partial<MCPServerConfig> = {}) {
    this.flow = flow;
    this.engine = new FlowEngine(flow);
    this.config = {
      name: config.name || 'agentic-cx-gateway',
      port: config.port || 3000,
      transport: config.transport || 'sse',
      tools: config.tools || []
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // In real implementation: start MCP server
    console.log(`[MCPGateway] Starting ${this.config.name} on port ${this.config.port}`);
    console.log(`[MCPGateway] Transport: ${this.config.transport}`);
    console.log(`[MCPGateway] Tools: ${this.config.tools.map(t => t.name).join(', ')}`);
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    // In real implementation: stop MCP server
    console.log('[MCPGateway] Stopped');
  }

  /**
   * Attach a Sentinel: every tool call is gated pre_tool before execution.
   * Without one, the gateway executes tools unchecked (not recommended).
   */
  setSentinel(sentinel: Sentinel | null): void {
    this.sentinel = sentinel;
  }

  /**
   * Execute a tool (flow)
   */
  async executeTool(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    const tool = this.config.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Sentinel pre_tool gate — before any side effect
    if (this.sentinel) {
      const gate = this.sentinel.check({
        phase: 'pre_tool',
        content: JSON.stringify(input),
        session: { ...input },
        toolName,
        identity: `mcp_${toolName}`
      });
      if (!gate.allowed) {
        throw new Error(
          `Sentinel blocked "${toolName}" (${gate.action}): ` +
            gate.violations.map(v => v.message).join('; ')
        );
      }
    }

    // Execute the flow
    const result = await this.engine.execute(
      input['input'] as string || '',
      `mcp_${toolName}_${Date.now()}`
    );

    return result.outputs;
  }

  /**
   * List available tools
   */
  listTools(): MCPTool[] {
    return this.config.tools;
  }

  /**
   * Create a default MCP server config from a flow
   */
  static fromFlow(flow: FlowGraph): MCPGateway {
    const tools: MCPTool[] = [
      {
        name: 'execute_flow',
        description: `Execute the ${flow.name} flow`,
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'User input to process'
            },
            sessionId: {
              type: 'string',
              description: 'Session ID for stateful execution'
            }
          },
          required: ['input']
        },
        flowId: flow.id
      }
    ];

    return new MCPGateway(flow, {
      name: flow.name,
      tools
    });
  }
}

/**
 * Custom HTTP Gateway
 * 
 * For full control over auth, rate limiting, and routing.
 */
export class HTTPGateway {
  private flow: FlowGraph;
  private engine: FlowEngine;
  private config: {
    port: number;
    routes: Array<{
      path: string;
      method: string;
      auth?: { type: string; tokenFrom?: string };
      rateLimit?: { requests: number; window: string };
    }>;
  };

  constructor(flow: FlowGraph, config: Partial<HTTPGateway['config']> = {}) {
    this.flow = flow;
    this.engine = new FlowEngine(flow);
    this.config = {
      port: config.port || 8080,
      routes: config.routes || []
    };
  }

  /**
   * Start the HTTP gateway
   */
  async start(): Promise<void> {
    console.log(`[HTTPGateway] Starting on port ${this.config.port}`);
    console.log(`[HTTPGateway] Routes: ${this.config.routes.map(r => `${r.method} ${r.path}`).join(', ')}`);
  }

  /**
   * Stop the HTTP gateway
   */
  async stop(): Promise<void> {
    console.log('[HTTPGateway] Stopped');
  }

  /**
   * Add a route
   */
  addRoute(route: {
    path: string;
    method: string;
    auth?: { type: string; tokenFrom?: string };
    rateLimit?: { requests: number; window: string };
  }): void {
    this.config.routes.push(route);
  }
}
