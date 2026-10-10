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
