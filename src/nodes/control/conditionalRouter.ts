/**
 * Conditional Router Node — route based on conditions
 * 
 * Routes to different branches based on:
 * - Intent values
 * - Slot values
 * - Custom expressions
 * - Confidence thresholds
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

interface RouterConfig {
  routes: Array<{
    name: string;
    condition: string; // Expression: "intent == 'billing'"
    targetNode: string;
    priority: number;
  }>;
  defaultRoute: string;
}

export const conditionalRouterNode: NodeDefinition & Record<string, any> = {
  type: 'control.conditional_router',
  category: 'control',
  label: 'Conditional Router',
  description: 'Route to different branches based on conditions',
  icon: '🔀',
  color: '#64748b',
  inputs: [
    { id: 'input', type: 'any', label: 'Input' }
  ],
  outputs: [
    { id: 'route', type: 'text', label: 'Selected Route' }
  ],
  configSchema: [
    {
      name: 'routes',
      label: 'Routes (JSON)',
      type: 'json',
      default: [
        { name: 'billing', condition: "intent == 'billing'", targetNode: 'node_1', priority: 1 },
        { name: 'technical', condition: "intent == 'technical'", targetNode: 'node_2', priority: 2 }
      ],
      description: 'Array of {name, condition, targetNode, priority}'
    },
    {
      name: 'defaultRoute',
      label: 'Default Route',
      type: 'string',
      description: 'Node to route to if no conditions match'
    }
  ],

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as RouterConfig;
    
    // Evaluate conditions in priority order
    const sortedRoutes = [...config.routes].sort((a, b) => a.priority - b.priority);
    
    for (const route of sortedRoutes) {
      if (this.evaluateCondition(route.condition, context)) {
        return {
          outputs: { route: route.name },
          nextNodes: [route.targetNode],
          variableUpdates: { selectedRoute: route.name },
          guardrailViolations: [],
          auditEvents: []
        };
      }
    }

    // Default route
    return {
      outputs: { route: 'default' },
      nextNodes: [config.defaultRoute],
      variableUpdates: { selectedRoute: 'default' },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  evaluateCondition(condition: string, context: ExecutionContext): boolean {
    // Simple expression evaluator
    // Supports: "intent == 'billing'", "confidence > 0.8", "slots.account_id != null"
    try {
      const parts = condition.split(' == ');
      if (parts.length === 2) {
        const [left, right] = parts;
        const leftValue = this.resolveVariable(left.trim(), context);
        const rightValue = right.trim().replace(/'/g, '');
        return leftValue === rightValue;
      }
      
      const partsGt = condition.split(' > ');
      if (partsGt.length === 2) {
        const [left, right] = partsGt;
        const leftValue = this.resolveVariable(left.trim(), context);
        const rightValue = parseFloat(right.trim());
        return Number(leftValue) > rightValue;
      }
      
      return false;
    } catch {
      return false;
    }
  },

  resolveVariable(path: string, context: ExecutionContext): unknown {
    const parts = path.split('.');
    let value: unknown = context.variables;
    
    for (const part of parts) {
      if (value instanceof Map) {
        value = value.get(part);
      } else if (typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    const routes = config['routes'] as Array<{ name: string }> | undefined;
    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      errors.push({ field: 'routes', message: 'At least one route is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  config: {
    routes: [],
    defaultRoute: ''
  },
};
