/**
 * Node Registry — central registry for all node types.
 * 
 * Custom nodes can be registered at runtime:
 *   registerNode(new MyCustomNode());
 */

import { NodeDefinition, NodeType } from '../types/node';

class NodeRegistry {
  nodes = new Map<NodeType, NodeDefinition>();

  register(node: NodeDefinition): void {
    this.nodes.set(node.type, node);
  }

  /**
   * Remove a node type. Used by the custom-node layer to keep the registry in
   * step with the workspace when a user-authored node is disabled or deleted.
   * Built-in types are registered at boot and are never removed by callers.
   */
  unregister(type: NodeType): void {
    this.nodes.delete(type);
  }

  get(type: NodeType): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }

  getByCategory(category: string): NodeDefinition[] {
    return this.getAll().filter(n => n.category === category);
  }

  has(type: NodeType): boolean {
    return this.nodes.has(type);
  }
}

export const nodeRegistry = new NodeRegistry();
