/**
 * Sub-flow Node — nested canvas
 * 
 * Embeds a complete flow as a node within another flow.
 * Enables modular, reusable flow components.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

export interface SubflowConfig {
  subflowId: string;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
  timeout?: number;
}

export const subflowNode: NodeDefinition = {
  type: 'control.subflow',
  category: 'control',
  label: 'Sub-flow',
  description: 'Execute a nested flow as part of the parent flow',
  icon: '📦',
  color: '#64748b',
  inputs: [
    { id: 'input', type: 'any', label: 'Input' }
  ],
  outputs: [
    { id: 'output', type: 'any', label: 'Output' }
  ],
  configSchema: [
    {
      name: 'subflowId',
      label: 'Sub-flow',
      type: 'select',
      options: [
        { label: 'Select a flow...', value: '' }
      ],
      description: 'The flow to execute as a sub-flow'
    },
    {
      name: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      default: 30000,
      description: 'Maximum execution time for the sub-flow'
    }
  ],

  async execute(_context: ExecutionContext, _instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    
    // In real implementation:
    // 1. Load the sub-flow definition
    // 2. Map inputs from parent context
    // 3. Execute sub-flow
    // 4. Map outputs back to parent context

    return {
      outputs: {
        output: null
      },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['subflowId']) {
      errors.push({ field: 'subflowId', message: 'Sub-flow is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  config: {
    subflowId: '',
    inputMapping: {},
    outputMapping: {}
  },
};
