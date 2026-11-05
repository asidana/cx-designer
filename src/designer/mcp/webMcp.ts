/**
 * Web MCP — expose agents (and agent sub-tools) as MCP tools — T7.
 *
 * Implements the transport-agnostic core of the MCP "web" channel over
 * JSON-RPC 2.0: `initialize`, `tools/list`, `tools/call`, and the
 * `notifications/initialized` notification. Tools are deterministic mock
 * implementations so everything works offline and in tests; a production
 * deployment swaps the `run` closures for live integrate calls while the
 * wire shape stays identical.
 *
 * Pure TypeScript, no React — the hub for both the channel runtime and the
 * Protocol Console "MCP" tab.
 */

// ── JSON-RPC 2.0 wire types ──────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ── Tool model ───────────────────────────────────────────────────────────

export interface McpToolInputField {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
  run: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

const mockAccount = {
  accountId: 'ACC-88412',
  plan: 'Enterprise',
  balance: 'US$ 1,284.50',
  riskFlag: false
};

const mockOrders = [
  { orderId: 'ORD-9091', status: 'shipped', eta: '2026-10-14' },
  { orderId: 'ORD-9044', status: 'delivered', eta: '2026-10-02' },
  { orderId: 'ORD-9018', status: 'processing', eta: '2026-10-18' }
];

const mockArticles = [
  { articleId: 'A-101', title: 'Refund policy', url: '/help/refund-policy' },
  { articleId: 'A-102', title: 'Order tracking', url: '/help/order-tracking' },
  { articleId: 'A-103', title: 'Cancel an order', url: '/help/cancel-order' }
];

/**
 * Deterministic in-product tool library. Grouped like a real agent's
 * function catalogue: account, orders, fulfilment, knowledge.
 */
export const MOCK_TOOLS: McpTool[] = [
  {
    name: 'get_account_summary',
    description: 'Return the caller account balance, plan and risk flag.',
    inputSchema: {
      type: 'object',
      properties: { accountId: { type: 'string', description: 'Account id (mock ACC-88412)' } },
      required: ['accountId']
    },
    run: (args) => ({
      ok: true,
      ...mockAccount,
      requested: args.accountId ?? null
    })
  },
  {
    name: 'list_orders',
    description: 'List recent orders with fulfilment status and ETA.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max rows (default 3)' } },
      required: []
    },
    run: (args) => ({
      ok: true,
      orders: mockOrders.slice(0, Number(args.limit) || 3)
    })
  },
  {
    name: 'issue_refund',
    description: 'Issue a refund for an order. Approved in-channel on copilot/webmcp.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order to refund' },
        amount: { type: 'number', description: 'Refund amount in USD' }
      },
      required: ['orderId', 'amount']
    },
    run: (args) => ({
      ok: true,
      refundId: `RFD-${String(Date.now()).slice(-5)}`,
      orderId: String(args.orderId ?? ''),
      amount: Number(args.amount) || 0,
      status: 'initiated',
      approval: 'in_channel'
    })
  },
  {
    name: 'find_articles',
    description: 'Search the self-help knowledge base for matching articles.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Free-text query' } },
      required: ['query']
    },
    run: (args) => {
      const q = String(args.query ?? '').toLowerCase();
      const hits = mockArticles.filter(a =>
        q.length === 0 || a.title.toLowerCase().includes(q) || a.url.includes(q)
      );
      return { ok: true, hits };
    }
  }
];

// ── Errors ───────────────────────────────────────────────────────────────

export const MCP_ERRORS = {
  methodNotFound: { code: -32601, message: 'Method not found' },
  invalidParams: { code: -32602, message: 'Invalid params' },
  toolNotFound: { code: -32002, message: 'Unknown tool' },
  toolError: { code: -32003, message: 'Tool execution failed' }
} as const;

// ── Dispatch ─────────────────────────────────────────────────────────────

type ServerState = { initialized: boolean; clientName?: string; protocolVersion?: string };

export class WebMcpServer {
  readonly tools: McpTool[];
  private state: ServerState = { initialized: false };

  constructor(tools: McpTool[] = MOCK_TOOLS) {
    this.tools = tools;
  }

  /** The MCP protocol version we speak. */
  readonly protocolVersion = '2025-03-26';

  /** Handle one JSON-RPC message. Notifications return undefined. */
  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse | undefined> {
    const send = (result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id: request.id, result });
    const sendError = (error: { code: number; message: string }): JsonRpcResponse => ({
      jsonrpc: '2.0',
      id: request.id,
      error
    });

    switch (request.method) {
      case 'initialize': {
        const p = (request.params ?? {}) as Record<string, unknown>;
        const client = (p.clientInfo ?? {}) as { name?: string };
        this.state = {
          initialized: true,
          clientName: String(client.name ?? 'unknown'),
          protocolVersion: String(p.protocolVersion ?? '')
        };
        return send({
          protocolVersion: this.protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'agentic-cx-designer-mcp', version: '1.0.0' }
        });
      }
      case 'notifications/initialized':
        return undefined; // notification — no reply
      case 'ping':
        return send('pong');
      case 'tools/list':
        if (!this.state.initialized) return sendError(MCP_ERRORS.methodNotFound);
        return send({
          tools: this.tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        });
      case 'tools/call': {
        if (!this.state.initialized) return sendError(MCP_ERRORS.methodNotFound);
        const p = (request.params ?? {}) as { name?: unknown; arguments?: unknown };
        const tool = this.tools.find(t => t.name === p.name);
        if (!tool) return sendError(MCP_ERRORS.toolNotFound);
        const args = (p.arguments ?? {}) as Record<string, unknown>;
        try {
          const result = await tool.run(args);
          return send({
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: false
          });
        } catch (err) {
          return send({
            content: [
              { type: 'text', text: err instanceof Error ? err.message : String(err) }
            ],
            isError: true
          });
        }
      }
      default:
        return sendError(MCP_ERRORS.methodNotFound);
    }
  }
}