/**
 * Intent Classifier Node — LLM-based intent detection
 * 
 * Classifies user intent using an LLM with structured output.
 * Routes to different branches based on detected intent.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

interface IntentConfig {
  model: string;
  systemPrompt: string;
  intents: Array<{
    name: string;
    description: string;
  }>;
  confidenceThreshold: number;
  fallback: string;
}

export const intentClassifierNode: NodeDefinition & Record<string, any> = {
  type: 'agentic.intent_classifier',
  category: 'agentic',
  label: 'Intent Classifier',
  description: 'Classify user intent using LLM with structured output',
  icon: '🧠',
  color: '#8b5cf6',
  inputs: [
    { id: 'input', type: 'text', label: 'User Input', required: true }
  ],
  outputs: [
    { id: 'intent', type: 'text', label: 'Detected Intent' },
    { id: 'confidence', type: 'number', label: 'Confidence Score' },
    { id: 'entities', type: 'json', label: 'Extracted Entities' }
  ],
  // Dynamic outputs based on configured intents
  configSchema: [
    {
      name: 'model',
      label: 'LLM Model',
      type: 'select',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
        { label: 'Claude Haiku', value: 'claude-haiku-4-20250514' }
      ],
      default: 'gpt-4o-mini',
      required: true
    },
    {
      name: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      placeholder: 'Classify the user\'s intent into one of the following categories...',
      description: 'System prompt for intent classification'
    },
    {
      name: 'intents',
      label: 'Intents (JSON)',
      type: 'json',
      default: [
        { name: 'billing', description: 'Billing and payment issues' },
        { name: 'technical', description: 'Technical support' },
        { name: 'account', description: 'Account management' }
      ],
      description: 'Array of {name, description} objects'
    },
    {
      name: 'confidenceThreshold',
      label: 'Confidence Threshold',
      type: 'number',
      default: 0.85,
      description: 'Minimum confidence to accept intent (0-1)'
    },
    {
      name: 'fallback',
      label: 'Fallback Intent',
      type: 'string',
      default: 'escalate_human',
      description: 'Intent to use when confidence is below threshold'
    }
  ],

  async execute(_context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as IntentConfig;

    // In real implementation:
    // 1. Call LLM with system prompt + user input
    // 2. Parse structured output (intent, confidence, entities)
    // 3. Route based on intent + confidence threshold

    // Mock implementation
    const detectedIntent = 'billing';
    const confidence = 0.94;
    const entities = { account_id: 'ABC12345' };

    // Determine next nodes based on intent
    const nextNodes = this.determineNextNodes(detectedIntent, config);

    return {
      outputs: {
        intent: detectedIntent,
        confidence,
        entities
      },
      nextNodes,
      variableUpdates: {
        detectedIntent,
        intentConfidence: confidence,
        extractedEntities: entities
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  determineNextNodes(_intent: string, _config: IntentConfig): string[] {
    // In real implementation, this would map to actual edge targets
    // based on the intent name
    return [];
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['model']) {
      errors.push({ field: 'model', message: 'LLM model is required' });
    }
    
    const intents = config['intents'] as Array<{ name: string }> | undefined;
    if (!intents || !Array.isArray(intents) || intents.length === 0) {
      errors.push({ field: 'intents', message: 'At least one intent is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  config: {
    model: 'gpt-4o-mini',
    systemPrompt: '',
    intents: [],
    confidenceThreshold: 0.85,
    fallback: 'escalate_human'
  },
};
