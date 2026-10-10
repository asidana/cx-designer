/**
 * AI-Assisted Flow Generation — prompt → flow
 * 
 * Generates a complete flow from a natural language description.
 * 
 * Example:
 *   "Create a customer support voice agent that handles billing inquiries.
 *    It should collect the account ID, check the balance, and offer a refund
 *    if the balance is over $100."
 */

import { FlowGraph, FlowNode, FlowEdge } from '../types/node';
import type { ChannelId } from '../channels/types';

export interface FlowGenerationPrompt {
  description: string;
  channel?: ChannelId;
  language?: string;
  industry?: string;
}

export interface GeneratedFlow {
  flow: FlowGraph;
  explanation: string;
  suggestions: string[];
}

export class FlowGenerator {
  /**
   * Generate a flow from a natural language description
   */
  static async generate(prompt: FlowGenerationPrompt): Promise<GeneratedFlow> {
    // In real implementation: call LLM to generate flow
    // For now, return a template based on keywords

    const description = prompt.description.toLowerCase();
    const channel = prompt.channel || 'voice';

    // Detect intents from description
    const intents = this.detectIntents(description);
    
    // Detect required slots
    const slots = this.detectSlots(description);
    
    // Detect actions
    const actions = this.detectActions(description);

    // Generate flow
    const flow = this.buildFlow(intents, slots, actions, channel);

    return {
      flow,
      explanation: this.generateExplanation(intents, slots, actions),
      suggestions: this.generateSuggestions(description)
    };
  }

  /**
   * Detect intents from description
   */
  private static detectIntents(description: string): string[] {
    const intents = [];
    
    if (description.includes('billing') || description.includes('payment') || description.includes('refund')) {
      intents.push('billing');
    }
    if (description.includes('technical') || description.includes('support') || description.includes('help')) {
      intents.push('technical');
    }
    if (description.includes('account') || description.includes('profile') || description.includes('settings')) {
      intents.push('account');
    }
    if (description.includes('order') || description.includes('shipping') || description.includes('delivery')) {
      intents.push('order_status');
    }
    
    return intents.length > 0 ? intents : ['general'];
  }

  /**
   * Detect required slots from description
   */
  private static detectSlots(description: string): string[] {
    const slots = [];
    
    if (description.includes('account id') || description.includes('account number')) {
      slots.push('account_id');
    }
    if (description.includes('email')) {
      slots.push('email');
    }
    if (description.includes('phone')) {
      slots.push('phone_number');
    }
    if (description.includes('order number') || description.includes('order id')) {
      slots.push('order_id');
    }
    
    return slots;
  }

  /**
   * Detect actions from description
   */
  private static detectActions(description: string): string[] {
    const actions = [];
    
    if (description.includes('refund')) {
      actions.push('issue_refund');
    }
    if (description.includes('balance') || description.includes('check')) {
      actions.push('get_balance');
    }
    if (description.includes('order') || description.includes('track')) {
      actions.push('track_order');
    }
    if (description.includes('appointment') || description.includes('schedule')) {
      actions.push('schedule_appointment');
    }
    
    return actions;
  }

  /**
   * Build a flow from detected components
   */
  private static buildFlow(
    intents: string[],
    slots: string[],
    actions: string[],
    _channel: string
  ): FlowGraph {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // Add voice input node
    const voiceInputId = 'voice_input';
    nodes.push({
      id: voiceInputId,
      type: 'voice.input',
      position: { x: 100, y: 200 },
      data: {
        config: {
          stt: { provider: 'deepgram', model: 'nova-2', language: 'en-US' },
          vad: { provider: 'silero', threshold: 0.5 },
          bargeIn: true
        },
        label: 'Voice Input',
        description: 'Capture user audio'
      }
    });

    // Add intent classifier
    const intentId = 'intent_classifier';
    nodes.push({
      id: intentId,
      type: 'agentic.intent_classifier',
      position: { x: 350, y: 200 },
      data: {
        config: {
          model: 'gpt-4o-mini',
          intents: intents.map(name => ({ name, description: `${name} intent` })),
          confidenceThreshold: 0.85,
          fallback: 'escalate_human'
        },
        label: 'Intent Classifier',
        description: 'Classify user intent'
      }
    });

    edges.push({
      id: 'e1',
      source: voiceInputId,
      target: intentId,
      sourceHandle: 'transcript',
      targetHandle: 'input'
    });

    // Add slot collector if slots are needed
    if (slots.length > 0) {
      const slotId = 'slot_collector';
      nodes.push({
        id: slotId,
        type: 'deterministic.slot_collector',
        position: { x: 600, y: 100 },
        data: {
          config: {
            slots: slots.map(name => ({
              name,
              type: 'string',
              retries: 3,
              required: true,
              prompt: `Please provide your ${name.replace('_', ' ')}.`
            })),
            escalationPath: 'escalate_human'
          },
          label: 'Slot Collector',
          description: 'Collect required information'
        }
      });

      edges.push({
        id: 'e2',
        source: intentId,
        target: slotId,
        sourceHandle: intents[0],
        targetHandle: 'input'
      });
    }

    // Add reasoning loop
    const reasoningId = 'reasoning_loop';
    nodes.push({
      id: reasoningId,
      type: 'agentic.reasoning_loop',
      position: { x: 600, y: 300 },
      data: {
        config: {
          model: 'gpt-4o',
          maxIterations: 8,
          costCeiling: 0.50,
          loopDetector: { maxSameToolCalls: 3 },
          tools: actions.map(name => ({
            name,
            type: 'http',
            endpoint: `/api/${name}`
          }))
        },
        label: 'Reasoning Loop',
        description: 'Handle complex queries'
      }
    });

    edges.push({
      id: 'e3',
      source: intentId,
      target: reasoningId,
      sourceHandle: intents[0] || 'input',
      targetHandle: 'input'
    });

    // Add voice output
    const voiceOutputId = 'voice_output';
    nodes.push({
      id: voiceOutputId,
      type: 'voice.output',
      position: { x: 850, y: 200 },
      data: {
        config: {
          tts: { provider: 'elevenlabs', voice: 'rachel', model: 'eleven_turbo_v2' },
          prosody: { emotion: 'adaptive', pace: 'natural' },
          interruptible: true
        },
        label: 'Voice Output',
        description: 'Synthesize speech'
      }
    });

    edges.push({
      id: 'e4',
      source: reasoningId,
      target: voiceOutputId,
      sourceHandle: 'response',
      targetHandle: 'text'
    });

    return {
      id: `flow_${Date.now()}`,
      name: 'AI Generated Agent',
      version: '1.0.0',
      nodes,
      edges
    };
  }

  /**
   * Generate explanation
   */
  private static generateExplanation(
    intents: string[],
    slots: string[],
    actions: string[]
  ): string {
    return `This flow handles ${intents.join(', ')} inquiries. ` +
      (slots.length > 0 ? `It collects ${slots.join(', ')} from the user. ` : '') +
      (actions.length > 0 ? `It can perform: ${actions.join(', ')}.` : '');
  }

  /**
   * Generate suggestions
   */
  private static generateSuggestions(description: string): string[] {
    const suggestions = [];
    
    if (!description.includes('guardrail') && !description.includes('pii')) {
      suggestions.push('Add a PII redaction guardrail to protect sensitive data');
    }
    if (!description.includes('human') && !description.includes('escalate')) {
      suggestions.push('Add a human handoff node for complex cases');
    }
    if (!description.includes('language') && !description.includes('spanish')) {
      suggestions.push('Consider adding multi-language support');
    }
    if (!description.includes('test') && !description.includes('eval')) {
      suggestions.push('Create an eval suite to test your agent');
    }
    
    return suggestions;
  }
}
