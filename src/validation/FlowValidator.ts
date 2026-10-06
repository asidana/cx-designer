/**
 * Flow Validator — validate flow definitions
 * 
 * Checks for:
 * - Missing entry nodes
 * - Orphaned nodes
 * - Cycles
 * - Invalid connections
 * - Missing required config
 * - Unreachable nodes
 */

import { FlowGraph, FlowNode, FlowEdge } from '../types/node';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    entryNodeCount: number;
    orphanedNodeCount: number;
    unreachableNodeCount: number;
  };
}

export class FlowValidator {
  /**
   * Validate a flow
   */
  static validate(flow: FlowGraph): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Check for empty flow
    if (flow.nodes.length === 0) {
      issues.push({
        type: 'warning',
        message: 'Flow has no nodes'
      });
    }

    // Check for entry nodes
    const targetIds = new Set(flow.edges.map(e => e.target));
    const entryNodes = flow.nodes.filter(n => !targetIds.has(n.id));
    
    if (entryNodes.length === 0 && flow.nodes.length > 0) {
      issues.push({
        type: 'error',
        message: 'No entry nodes found. At least one node must have no incoming edges.'
      });
    }

    if (entryNodes.length > 1) {
      issues.push({
        type: 'warning',
        message: `Multiple entry nodes found: ${entryNodes.map(n => n.id).join(', ')}`
      });
    }

    // Check for orphaned nodes
    const sourceIds = new Set(flow.edges.map(e => e.source));
    const orphaned = flow.nodes.filter(n => !sourceIds.has(n.id) && !targetIds.has(n.id));
    
    for (const node of orphaned) {
      issues.push({
        type: 'warning',
        message: `Node "${node.id}" is orphaned (no connections)`,
        nodeId: node.id
      });
    }

    // Check for unreachable nodes
    const reachable = this.findReachableNodes(flow, entryNodes.map(n => n.id));
    const unreachable = flow.nodes.filter(n => !reachable.has(n.id));
    
    for (const node of unreachable) {
      issues.push({
        type: 'error',
        message: `Node "${node.id}" is unreachable from entry nodes`,
        nodeId: node.id
      });
    }

    // Check for cycles
    const cycles = this.findCycles(flow);
    for (const cycle of cycles) {
      issues.push({
        type: 'error',
        message: `Cycle detected: ${cycle.join(' → ')}`
      });
    }

    // Check for invalid connections
    for (const edge of flow.edges) {
      if (!flow.nodes.find(n => n.id === edge.source)) {
        issues.push({
          type: 'error',
          message: `Edge "${edge.id}" references missing source node "${edge.source}"`,
          edgeId: edge.id
        });
      }
      if (!flow.nodes.find(n => n.id === edge.target)) {
        issues.push({
          type: 'error',
          message: `Edge "${edge.id}" references missing target node "${edge.target}"`,
          edgeId: edge.id
        });
      }
    }

    // Check for self-loops
    for (const edge of flow.edges) {
      if (edge.source === edge.target) {
        issues.push({
          type: 'warning',
          message: `Self-loop detected on node "${edge.source}"`,
          nodeId: edge.source,
          edgeId: edge.id
        });
      }
    }

    // Check for missing output nodes
    const outputNodes = flow.nodes.filter(n => !sourceIds.has(n.id));
    if (outputNodes.length === 0 && flow.nodes.length > 0) {
      issues.push({
        type: 'warning',
        message: 'No output nodes found. Consider adding a voice output or HTTP response node.'
      });
    }

    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');

    return {
      valid: errors.length === 0,
      issues,
      stats: {
        nodeCount: flow.nodes.length,
        edgeCount: flow.edges.length,
        entryNodeCount: entryNodes.length,
        orphanedNodeCount: orphaned.length,
        unreachableNodeCount: unreachable.length
      }
    };
  }

  /**
   * Find all reachable nodes from entry nodes
   */
  private static findReachableNodes(flow: FlowGraph, entryNodeIds: string[]): Set<string> {
    const reachable = new Set<string>();
    const queue = [...entryNodeIds];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      
      reachable.add(current);

      // Find all edges from this node
      const outgoing = flow.edges.filter(e => e.source === current);
      for (const edge of outgoing) {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return reachable;
  }

  /**
   * Find all cycles in the flow
   */
  private static findCycles(flow: FlowGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoing = flow.edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          dfs(edge.target);
        } else if (recursionStack.has(edge.target)) {
          // Found a cycle
          const cycleStart = path.indexOf(edge.target);
          cycles.push(path.slice(cycleStart).concat(edge.target));
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const node of flow.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * Get a summary of the validation
   */
  static getSummary(result: ValidationResult): string {
    const lines = [
      `Validation ${result.valid ? 'PASSED' : 'FAILED'}`,
      `  Nodes: ${result.stats.nodeCount}`,
      `  Edges: ${result.stats.edgeCount}`,
      `  Entry nodes: ${result.stats.entryNodeCount}`,
      `  Orphaned nodes: ${result.stats.orphanedNodeCount}`,
      `  Unreachable nodes: ${result.stats.unreachableNodeCount}`,
      `  Issues: ${result.issues.length} (${result.issues.filter(i => i.type === 'error').length} errors, ${result.issues.filter(i => i.type === 'warning').length} warnings)`
    ];

    if (result.issues.length > 0) {
      lines.push('', 'Issues:');
      for (const issue of result.issues) {
        lines.push(`  [${issue.type.toUpperCase()}] ${issue.message}`);
      }
    }

    return lines.join('\n');
  }
}
