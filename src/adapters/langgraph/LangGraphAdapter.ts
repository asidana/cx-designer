/**
 * LangGraph Adapter — integrates LangGraph agents as canvas nodes.
 * 
 * LangGraph's StateGraph maps directly to the canvas DAG.
 * This adapter:
 * 1. Imports LangGraph definitions → Flow JSON
 * 2. Exports Flow JSON → LangGraph Python code
 * 3. Executes LangGraph graphs inside the voice loop
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig, FlowGraph, FlowNode, FlowEdge } from '../../types/node';

// LangGraph definition format (simplified)
interface LangGraphNode {
  id: string;
  type: 'llm' | 'tool' | 'retriever' | 'memory' | 'conditional';
  model?: string;
  tools?: string[];
  config?: Record<string, unknown>;
}

interface LangGraphEdge {
  from: string;
  to: string;
  condition?: string;
}

interface LangGraphDefinition {
  name: string;
  nodes: LangGraphNode[];
  edges: LangGraphEdge[];
  recursionLimit?: number;
  checkpoint?: boolean;
  interruptNodes?: string[];
}

export class LangGraphAdapter {
  /**
   * Import a LangGraph definition → Flow JSON
   */
  static importFromLangGraph(def: LangGraphDefinition): Partial<FlowGraph> {
    const flowNodes: FlowNode[] = def.nodes.map((node, index) => ({
      id: node.id,
      type: this.mapNodeType(node.type),
      position: { x: 100 + index * 250, y: 200 },
      data: {
        config: {
          model: node.model,
          tools: node.tools,
          ...node.config
        },
        label: node.id,
        description: `LangGraph ${node.type} node`
      }
    }));

    const flowEdges: FlowEdge[] = def.edges.map((edge, index) => ({
      id: `e${index}`,
      source: edge.from,
      target: edge.to,
      label: edge.condition
    }));

    return {
      name: def.name,
      version: '1.0.0',
      nodes: flowNodes,
      edges: flowEdges,
      metadata: {
        langgraph: {
          recursionLimit: def.recursionLimit || 25,
          checkpoint: def.checkpoint || false,
          interruptNodes: def.interruptNodes || []
        }
      }
    };
  }

  /**
   * Export Flow JSON → LangGraph Python code
   */
  static exportToLangGraph(flow: FlowGraph): string {
    const nodes = flow.nodes
      .map((node) => {
        const config = node.data.config;
        switch (node.type) {
          case 'agentic.langgraph.llm':
            return `    # ${node.id} - LLM Node
    def ${node.id}(state: AgentState) -> AgentState:
        response = llm.invoke(state["messages"])
        return {"messages": [response]}`;
          case 'agentic.langgraph.tool':
            return `    # ${node.id} - Tool Node
    def ${node.id}(state: AgentState) -> AgentState:
        result = ${config.tool_name || 'tool'}(state)
        return {"messages": [result]}`;
          default:
            return `    # ${node.id} - ${node.type}`;
        }
      })
      .join('\n\n');

    const edges = flow.edges
      .map((edge) => {
        const condition = edge.label ? `, condition="${edge.label}"` : '';
        return `    graph.add_edge("${edge.source}", "${edge.target}"${condition});`;
      })
      .join('\n');

    return `"""
Auto-generated LangGraph definition from Agentic CX Designer
Flow: ${flow.name} v${flow.version}
"""

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from typing import TypedDict, Annotated
from operator import add

class AgentState(TypedDict):
    messages: Annotated[list, add]
    # Add custom state fields here

def create_graph():
    """Create the LangGraph state machine."""
    graph = StateGraph(AgentState)
    
    # Add nodes
${nodes}
    
    # Add edges
${edges}
    
    # Compile
    app = graph.compile(
        checkpointer=PostgresSaver.from_conn_string("postgresql://...")
    )
    
    return app

if __name__ == "__main__":
    app = create_graph()
    # Run the graph
    result = app.invoke({"messages": []})
    print(result)
`;
  }

  /**
   * Map LangGraph node types to canvas node types
   */
  static mapNodeType(type: LangGraphNode['type']): FlowNode['type'] {
    const mapping: Record<LangGraphNode['type'], FlowNode['type']> = {
      llm: 'agentic.langgraph.llm',
      tool: 'agentic.langgraph.tool',
      retriever: 'agentic.langgraph.retriever',
      memory: 'agentic.langgraph.memory',
      conditional: 'agentic.langgraph.conditional'
    };
    return mapping[type] || 'agentic.langgraph';
  }

  /**
   * Execute a LangGraph graph (runtime).
   * Resume uses the checkpointed thread_id with a resume command —
   * never restarts the graph from scratch (avoids duplicate side effects).
   */
  static async execute(
    definition: LangGraphDefinition,
    _context: ExecutionContext,
    resumeCommand?: { type: 'approve' | 'reject'; payload?: unknown }
  ): Promise<NodeResult> {
    void definition;
    void resumeCommand;
    // In real implementation:
    // 1. Load checkpoint from Postgres by thread_id = context.sessionId
    // 2. If resumeCommand: app.invoke(Command(resume=...), { configurable: { thread_id } })
    // 3. Else: app.invoke(input, { configurable: { thread_id } })
    // 4. On interrupt: persist checkpoint, return pending-approval (do NOT recurse)

    // Mock implementation
    return {
      outputs: {
        response: 'LangGraph execution result',
        messages: []
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  }
}

/**
 * LangGraph Node Definition — for use in the canvas
 */
export const langGraphNode: NodeDefinition = {
  type: 'agentic.langgraph',
  category: 'agentic',
  label: 'LangGraph Agent',
  description: 'Execute a LangGraph state machine with checkpointing and interrupts',
  icon: '🔗',
  color: '#8b5cf6',
  inputs: [
    { id: 'input', type: 'text', label: 'User Input', required: true }
  ],
  outputs: [
    { id: 'response', type: 'text', label: 'Agent Response' },
    { id: 'messages', type: 'json', label: 'Message History' }
  ],
  configSchema: [
    {
      name: 'graphDefinition',
      label: 'Graph Definition (JSON)',
      type: 'json',
      description: 'LangGraph state machine definition'
    },
    {
      name: 'recursionLimit',
      label: 'Recursion Limit',
      type: 'number',
      default: 25,
      description: 'Maximum number of graph iterations'
    },
    {
      name: 'checkpoint',
      label: 'Enable Checkpointing',
      type: 'boolean',
      default: true,
      description: 'Persist graph state to Postgres'
    },
    {
      name: 'interruptNodes',
      label: 'Interrupt Nodes',
      type: 'json',
      default: [],
      description: 'Nodes that require human approval'
    }
  ],

  async execute(_context: ExecutionContext, _instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    
    // In real implementation:
    // 1. Parse graph definition
    // 2. Execute LangGraph
    // 3. Handle interrupts
    // 4. Return result

    return {
      outputs: {
        response: 'LangGraph agent response',
        messages: []
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['graphDefinition']) {
      errors.push({ field: 'graphDefinition', message: 'Graph definition is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  config: {
    graphDefinition: null,
    recursionLimit: 25,
    checkpoint: true,
    interruptNodes: []
  },
};
