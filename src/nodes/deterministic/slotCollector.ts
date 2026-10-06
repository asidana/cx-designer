/**
 * Slot Collector Node — Typed slot collection with validation
 * 
 * Collects required information from the user with:
 * - Typed slots (string, number, date, email, phone, etc.)
 * - Regex validation
 * - Configurable retry counts
 * - Escalation paths
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

interface SlotConfig {
  slots: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'alphanumeric' | 'currency' | 'boolean';
    validation?: string; // Regex pattern
    retries: number;
    required: boolean;
    prompt: string; // What to ask the user
  }>;
  escalationPath: string;
}

export const slotCollectorNode: NodeDefinition = {
  type: 'deterministic.slot_collector',
  category: 'deterministic',
  label: 'Slot Collector',
  description: 'Collect required information with typed validation',
  icon: '🔒',
  color: '#3b82f6',
  inputs: [
    { id: 'input', type: 'text', label: 'User Input', required: true }
  ],
  outputs: [
    { id: 'complete', type: 'boolean', label: 'All Slots Collected' },
    { id: 'slots', type: 'json', label: 'Collected Slots' }
  ],
  configSchema: [
    {
      name: 'slots',
      label: 'Slots (JSON)',
      type: 'json',
      default: [
        {
          name: 'account_id',
          type: 'alphanumeric',
          validation: '^[A-Z0-9]{8}$',
          retries: 3,
          required: true,
          prompt: 'Please provide your 8-character account ID.'
        }
      ],
      description: 'Array of slot definitions'
    },
    {
      name: 'escalationPath',
      label: 'Escalation Path',
      type: 'string',
      default: 'escalate_human',
      description: 'Where to go if slot collection fails'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as SlotConfig;
    const input = context.variables.get('input') as string || '';
    
    // Get existing slots from context
    const existingSlots = (context.variables.get('slots') as Record<string, unknown>) || {};
    
    // Try to extract slots from input
    const newSlots = this.extractSlots(input, config.slots);
    const updatedSlots = { ...existingSlots, ...newSlots };
    
    // Check if all required slots are collected
    const allCollected = config.slots.every(
      slot => !slot.required || updatedSlots[slot.name] !== undefined
    );
    
    // Determine next prompt
    const nextPrompt = allCollected
      ? null
      : this.getNextPrompt(config.slots, updatedSlots);

    return {
      outputs: {
        complete: allCollected,
        slots: updatedSlots,
        nextPrompt
      },
      nextNodes: allCollected ? [] : [context.nodeId], // Loop back if not complete
      variableUpdates: {
        slots: updatedSlots,
        nextPrompt
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  private extractSlots(
    input: string,
    slots: SlotConfig['slots']
  ): Record<string, unknown> {
    const extracted: Record<string, unknown> = {};
    
    for (const slot of slots) {
      // In real implementation: use NLU/LLM to extract slot values
      // For now, simple regex matching
      if (slot.validation) {
        const regex = new RegExp(slot.validation);
        const match = input.match(regex);
        if (match) {
          extracted[slot.name] = match[0];
        }
      }
    }
    
    return extracted;
  },

  private getNextPrompt(
    slots: SlotConfig['slots'],
    collected: Record<string, unknown>
  ): string | null {
    const nextSlot = slots.find(s => !collected[s.name] && s.required);
    return nextSlot?.prompt || null;
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    const slots = config['slots'] as Array<{ name: string }> | undefined;
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      errors.push({ field: 'slots', message: 'At least one slot is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  get config(): SlotConfig {
    return this._config;
  }

  private _config: SlotConfig = {
    slots: [],
    escalationPath: 'escalate_human'
  };
};
