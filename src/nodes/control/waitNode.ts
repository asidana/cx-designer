/**
 * Wait Node — pause execution
 * 
 * Waits for:
 * - Fixed duration
 * - External event
 * - Condition
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface WaitConfig {
  type: 'duration' | 'event' | 'condition';
  duration?: number; // ms
  event?: string;
  condition?: string;
  timeout?: number;
}

export const waitNode: NodeDefinition = {
  type: 'control.wait',
  category: 'control',
  label: 'Wait',
  description: 'Pause execution for duration, event, or condition',
  icon: '⏱️',
  color: '#64748b',
  inputs: [
    { id: 'input', type: 'any', label: 'Input' }
  ],
  outputs: [
    { id: 'output', type: 'any', label: 'Output' }
  ],
  configSchema: [
    {
      name: 'type',
      label: 'Wait Type',
      type: 'select',
      options: [
        { label: 'Duration', value: 'duration' },
        { label: 'Event', value: 'event' },
        { label: 'Condition', value: 'condition' }
      ],
      default: 'duration'
    },
    {
      name: 'duration',
      label: 'Duration (ms)',
      type: 'number',
      default: 1000
    },
    {
      name: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      default: 30000
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as WaitConfig;
    
    // In real implementation:
    // 1. Wait based on type
    // 2. Return when complete

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
    return { valid: errors.length === 0, errors };
  },

  get config(): WaitConfig {
    return this._config;
  }

  private _config: WaitConfig = {
    type: 'duration',
    duration: 1000
  };
};
