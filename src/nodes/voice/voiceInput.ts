/**
 * Voice Input Node — STT + VAD + Barge-in
 * 
 * Captures audio from the user, transcribes via STT,
 * and handles barge-in (user interrupting the agent).
 */

import { NodeDefinition, ExecutionContext, NodeResult } from '../../types/node';

export const voiceInputNode: NodeDefinition = {
  type: 'voice.input',
  category: 'voice',
  label: 'Voice Input',
  description: 'Capture audio from user with STT, VAD, and barge-in',
  icon: '🎤',
  color: '#10b981',
  inputs: [],
  outputs: [
    { id: 'audio', type: 'audio', label: 'Audio Stream' },
    { id: 'transcript', type: 'text', label: 'Transcript' }
  ],
  configSchema: [
    {
      name: 'stt.provider',
      label: 'STT Provider',
      type: 'select',
      options: [
        { label: 'Deepgram', value: 'deepgram' },
        { label: 'OpenAI Whisper', value: 'openai' },
        { label: 'AWS Transcribe', value: 'aws' },
        { label: 'Google Speech', value: 'google' }
      ],
      default: 'deepgram',
      required: true
    },
    {
      name: 'stt.model',
      label: 'STT Model',
      type: 'select',
      options: [
        { label: 'Nova-2', value: 'nova-2' },
        { label: 'Nova-3', value: 'nova-3' },
        { label: 'Whisper Large v3', value: 'whisper-large-v3' }
      ],
      default: 'nova-2'
    },
    {
      name: 'stt.language',
      label: 'Language',
      type: 'select',
      options: [
        { label: 'English (US)', value: 'en-US' },
        { label: 'English (UK)', value: 'en-GB' },
        { label: 'Spanish', value: 'es-ES' },
        { label: 'French', value: 'fr-FR' },
        { label: 'German', value: 'de-DE' },
        { label: 'Hindi', value: 'hi-IN' }
      ],
      default: 'en-US'
    },
    {
      name: 'vad.provider',
      label: 'VAD Provider',
      type: 'select',
      options: [
        { label: 'Silero', value: 'silero' },
        { label: 'WebRTC', value: 'webrtc' }
      ],
      default: 'silero'
    },
    {
      name: 'vad.threshold',
      label: 'VAD Threshold',
      type: 'number',
      default: 0.5,
      description: 'Voice activity detection threshold (0-1)'
    },
    {
      name: 'bargeIn',
      label: 'Enable Barge-in',
      type: 'boolean',
      default: true,
      description: 'Allow user to interrupt the agent'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config;
    
    // In real implementation:
    // 1. Initialize STT stream with provider config
    // 2. Initialize VAD with threshold
    // 3. Start listening to audio stream
    // 4. Return transcript when available

    return {
      outputs: {
        transcript: context.variables.get('input') || '',
        audio: null
      },
      nextNodes: [], // Will be set by edges
      shouldListen: true,
      variableUpdates: {
        voiceInputConfig: config
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['stt.provider']) {
      errors.push({ field: 'stt.provider', message: 'STT provider is required' });
    }
    
    return { valid: errors.length === 0, errors };
  }
};
