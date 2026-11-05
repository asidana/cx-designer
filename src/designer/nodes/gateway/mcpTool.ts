/**
 * MCP Tool node — T7/T10. Declares one tool in this agent's catalogue for
 * MCP (and, via the shared library, ACP) clients. Executing it validates
 * the declaration against the tool library and resolves it against the
 * deterministic mock — so a flow "calls" the same tool an external host
 * would, with the same payload shape.
 */

import { NodeDefinition, NodeConfig, ExecutionContext, NodeResult } from '../../types/node';
import { MOCK_TOOLS } from '../../mcp/webMcp';

/**
 * Host-provided system bindings. In the platform this came from the
 * workspace store; a canvas embedder supplies their own list. Only the
 * grouping needs this slice.
 */
export interface SystemRecord {
  name: string;
  tools: string[];
  enabled: boolean;
}

interface McpToolConfig {
  toolName: string;
  arguments: string; // raw JSON arguments
}

export const mcpToolNode: NodeDefinition = {
  type: 'gateway.mcp_tool',
  category: 'gateway',
  label: 'MCP Tool',
  description: 'Call the shared tool catalogue (MCP + ACP interop)',
  icon: '🔌',
  color: '#f59e0b',
  inputs: [{ id: 'args', type: 'json', label: 'Arguments (JSON)' }],
  outputs: [
    { id: 'toolResult', type: 'json', label: 'Tool Result' },
    { id: 'declaration', type: 'json', label: 'MCP Tool Declaration' }
  ],
  configSchema: [
    {
      name: 'toolName',
      label: 'Tool',
      type: 'select',
      options: MOCK_TOOLS.map(t => ({ label: `${t.name} — ${t.description}`, value: t.name })),
      default: 'get_account_summary'
    },
    {
      name: 'arguments',
      label: 'Arguments (JSON)',
      type: 'json',
      default: '{}',
      description: 'JSON arguments forwarded to the tool'
    }
  ],
  config: { toolName: 'get_account_summary', arguments: '{}' },

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as McpToolConfig;
    const tool = MOCK_TOOLS.find(t => t.name === config.toolName);

    let args: Record<string, unknown> = {};
    try {
      args = (config.arguments?.trim() ? JSON.parse(config.arguments) : {}) as Record<string, unknown>;
    } catch {
      args = { _parseError: config.arguments };
    }

    const toolCalls = (context.variables.get('toolCalls') as Array<{ name: string; args: Record<string, unknown> }>) || [];

    if (!tool) {
      return {
        outputs: { toolResult: { ok: false, error: `Unknown tool "${config.toolName}"` }, declaration: null },
        nextNodes: [],
        variableUpdates: { toolCalls: [...toolCalls, { name: config.toolName, args }] },
        guardrailViolations: [],
        auditEvents: []
      };
    }

    const result = await tool.run(args);
    return {
      outputs: {
        toolResult: result,
        declaration: {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }
      },
      nextNodes: [],
      variableUpdates: { toolCalls: [...toolCalls, { name: tool.name, args }], lastToolResult: result },
      guardrailViolations: [],
      auditEvents: [{ id: `mcp_${Date.now()}`, timestamp: Date.now(), nodeId: 'mcp_tool', eventType: 'tool_call', data: { name: tool.name }, latencyMs: 0 }]
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (!MOCK_TOOLS.some(t => t.name === config['toolName'])) {
      errors.push({ field: 'toolName', message: 'Unknown tool' });
    }
    if (typeof config['arguments'] === 'string' && config['arguments'].trim()) {
      try {
        JSON.parse(config['arguments']);
      } catch {
        errors.push({ field: 'arguments', message: 'Arguments are not valid JSON' });
      }
    }
    return { valid: errors.length === 0, errors };
  }
};

/**
 * Regroup the tool picker under the owning systems. Enabled systems list
 * their bound tools first (`System → tool`); tools bound nowhere stay
 * selectable under "Unbound". Values never change, so saved flows keep
 * working — only the labels gain their system context.
 */
export function refreshMcpToolOptions(systems: Pick<SystemRecord, 'name' | 'tools' | 'enabled'>[]): void {
  const owner = new Map<string, string>();
  for (const system of systems) {
    if (!system.enabled) continue;
    for (const tool of system.tools) {
      if (!owner.has(tool)) owner.set(tool, system.name);
    }
  }
  const byName = new Map(MOCK_TOOLS.map(t => [t.name, t]));
  const bound: string[] = [];
  const unbound: string[] = [];
  for (const tool of MOCK_TOOLS) {
    (owner.has(tool.name) ? bound : unbound).push(tool.name);
  }
  const options = [
    ...bound.map(name => ({
      label: `${owner.get(name)} → ${name} — ${byName.get(name)?.description ?? ''}`.trim(),
      value: name
    })),
    ...unbound.map(name => ({
      label: `${name} — ${byName.get(name)?.description ?? ''} (unbound)`.trim(),
      value: name
    }))
  ];
  const field = mcpToolNode.configSchema.find(f => f.name === 'toolName');
  if (field) field.options = options;
}