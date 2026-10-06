/**
 * Voice Output Node — TTS + Prosody
 * 
 * Synthesizes speech from text with emotion-aware prosody,
 * interruption handling, and multi-language support.
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

export const voiceOutputNode: NodeDefinition = {
  type: 'voice.output',
  category: 'voice',
  label: 'Voice Output',
  description: 'Synthesize speech with TTS, prosody, and emotion awareness',
  icon: '🎧',
  color: '#10b981',
  inputs: [
    { id: 'text', type: 'text', label: 'Text to Speak', required: true }
  ],
  outputs: [
    { id: 'audio', type: 'audio', label: 'Audio Output' }
  ],
  configSchema: [
    {
      name: 'tts.provider',
      label: 'TTS Provider',
      type: 'select',
      options: [
        { label: 'ElevenLabs', value: 'elevenlabs' },
        { label: 'OpenAI TTS', value: 'openai' },
        { label: 'AWS Polly', value: 'aws' },
        { label: 'Google TTS', value: 'google' },
        { label: 'Cartesia', value: 'cartesia' }
      ],
      default: 'elevenlabs',
      required: true
    },
    {
      name: 'tts.voice',
      label: 'Voice',
      type: 'select',
      options: [
        { label: 'Rachel', value: 'rachel' },
        { label: 'Clyde', value: 'clyde' },
        { label: 'Domi', value: 'domi' },
        { label: 'Dave', value: 'dave' },
        { label: 'Sarah', value: 'sarah' }
      ],
      default: 'rachel'
    },
    {
      name: 'tts.model',
      label: 'TTS Model',
      type: 'select',
      options: [
        { label: 'Eleven Turbo v2', value: 'eleven_turbo_v2' },
        { label: 'Eleven Multilingual v2', value: 'eleven_multilingual_v2' },
        { label: 'Eleven Flash v2', value: 'eleven_flash_v2' }
      ],
      default: 'eleven_turbo_v2'
    },
    {
      name: 'prosody.emotion',
      label: 'Emotion Adaptation',
      type: 'select',
      options: [
        { label: 'Adaptive', value: 'adaptive' },
        { label: 'Neutral', value: 'neutral' },
        { label: 'Happy', value: 'happy' },
        { label: 'Empathetic', value: 'empathetic' },
        { label: 'Professional', value: 'professional' }
      ],
      default: 'adaptive',
      description: 'How the voice adapts emotion based on context'
    },
    {
      name: 'prosody.pace',
      label: 'Speaking Pace',
      type: 'select',
      options: [
        { label: 'Slow', value: 'slow' },
        { label: 'Natural', value: 'natural' },
        { label: 'Fast', value: 'fast' }
      ],
      default: 'natural'
    },
    {
      name: 'interruptible',
      label: 'Interruptible',
      type: 'boolean',
      default: true,
      description: 'Allow user to interrupt while speaking'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const text = context.variables.get('input') as string || '';
    
    // In real implementation:
    // 1. Call TTS provider with text + voice config
    // 2. Apply prosody (emotion, pace)
    // 3. Stream audio to output
    // 4. Handle interruption if enabled

    return {
      outputs: {
        audio: null, // Would be AudioChunk
        text
      },
      nextNodes: [],
      shouldSpeak: true,
      shouldListen: true,
      variableUpdates: {
        lastSpokenText: text
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['tts.provider']) {
      errors.push({ field: 'tts.provider', message: 'TTS provider is required' });
    }
    
    return { valid: errors.length === 0, errors };
  }
};
