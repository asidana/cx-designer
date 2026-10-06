/**
 * Human Handoff Node — escalate to a human agent
 * 
 * Transfers the conversation to a human agent with:
 * - Full context summary
 - Priority routing
 * - Queue selection
 * - Callback scheduling
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface HandoffConfig {
  queue: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contextSummary: boolean;
  transcriptIncluded: boolean;
  callbackEnabled: boolean;
  callbackDelay?: number; // minutes
  message: string;
}

export const humanHandoffNode: NodeDefinition = {
  type: 'deterministic.human_handoff',
  category: 'deterministic',
  label: 'Human Handoff',
  description: 'Escalate to a human agent with full context',
  icon: '👤',
  color: '#3b82f6',
  inputs: [
    { id: 'input', type: 'any', label: 'Trigger' }
  ],
  outputs: [
    { id: 'handoffId', type: 'text', label: 'Handoff ID' },
    { id: 'queue', type: 'text', label: 'Queue' },
    { id: 'estimatedWait', type: 'number', label: 'Estimated Wait (min)' }
  ],
  configSchema: [
    {
      name: 'queue',
      label: 'Queue',
      type: 'select',
      options: [
        { label: 'General Support', value: 'general' },
        { label: 'Billing', value: 'billing' },
        { label: 'Technical', value: 'technical' },
        { label: 'Escalations', value: 'escalations' }
      ],
      default: 'general'
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'Urgent', value: 'urgent' }
      ],
      default: 'medium'
    },
    {
      name: 'contextSummary',
      label: 'Include Context Summary',
      type: 'boolean',
      default: true
    },
    {
      name: 'transcriptIncluded',
      label: 'Include Transcript',
      type: 'boolean',
      default: true
    },
    {
      name: 'message',
      label: 'Handoff Message',
      type: 'textarea',
      default: 'Connecting you to a human agent. Please hold...',
      description: 'Message to play before handoff'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as HandoffConfig;
    
    // In real implementation:
    // 1. Generate context summary
    // 2. Create handoff ticket
    // 3. Route to queue
    // 4. Return handoff details

    return {
      outputs: {
        handoffId: `handoff_${Date.now()}`,
        queue: config.queue,
        estimatedWait: 3
      },
      nextNodes: [],
      variableUpdates: { handoffStatus: 'pending' },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    return { valid: errors.length === 0, errors };
  },

  get config(): HandoffConfig {
    return this._config;
  }

  private _config: HandoffConfig = {
    queue: 'general',
    priority: 'medium',
    contextSummary: true,
    transcriptIncluded: true,
    callbackEnabled: false,
    message: 'Connecting you to a human agent. Please hold...'
  };
};
