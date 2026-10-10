/**
 * Human Handoff Node - escalate to a human agent
 *
 * Transfers with full context (history, AI summary, suggested next step).
 * Transfer modes follow voice-market terms: cold transfer drops off
 * immediately, warm transfer briefs the destination first. Escalation
 * triggers follow Botpress terms: topic, sentiment, tier, request.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

interface HandoffConfig {
  queue: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  mode: 'cold' | 'warm';
  destination?: string;
  transferMessage: string;
  triggers: string[];
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
  description: 'Escalate to a human agent with full context (cold/warm transfer)',
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
      name: 'mode',
      label: 'Transfer Mode',
      type: 'select',
      options: [
        { label: 'Cold transfer (drop off immediately)', value: 'cold' },
        { label: 'Warm transfer (brief destination first)', value: 'warm' }
      ],
      default: 'cold',
      description: 'Voice-market transfer modes (Vapi/Retell terms)'
    },
    {
      name: 'destination',
      label: 'Destination',
      type: 'string',
      placeholder: '+14155550100 or sip:queue@example.com',
      description: 'Phone number (E.164) or SIP URI for voice transfers'
    },
    {
      name: 'transferMessage',
      label: 'Transfer Message',
      type: 'textarea',
      default: 'Transferring you now.',
      description: 'Spoken to the caller (and, on warm transfer, to brief the destination)'
    },
    {
      name: 'triggers',
      label: 'Escalation Triggers (JSON)',
      type: 'json',
      default: ['explicit-request'],
      description: 'Topic, sentiment, tier, or explicit request, e.g. ["angry", "vip-tier", "explicit-request"]'
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

  async execute(_context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as HandoffConfig;

    // In real implementation:
    // 1. Generate context summary
    // 2. Create handoff ticket
    // 3. Cold: route immediately; warm: brief destination, then bridge
    // 4. Return handoff details

    return {
      outputs: {
        handoffId: `handoff_${Date.now()}`,
        queue: config.queue,
        estimatedWait: 3
      },
      nextNodes: [],
      variableUpdates: {
        handoffStatus: 'pending',
        handoffMode: config.mode || 'cold',
        handoffDestination: config.destination || null
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(_config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    return { valid: errors.length === 0, errors };
  },

  config: {
    queue: 'general',
    priority: 'medium',
    mode: 'cold',
    transferMessage: 'Transferring you now.',
    triggers: ['explicit-request'],
    contextSummary: true,
    transcriptIncluded: true,
    callbackEnabled: false,
    message: 'Connecting you to a human agent. Please hold...'
  },
};
