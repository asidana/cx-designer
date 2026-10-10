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
      name: 'voice.mode',
      label: 'Voice Mode',
      type: 'select',
      options: [
        { label: 'Cascaded (STT → LLM → TTS)', value: 'cascaded' },
        { label: 'Realtime Speech-to-Speech', value: 'realtime-s2s' }
      ],
      default: 'cascaded',
      required: true,
      description: 'Cascaded gives full guardrail/slot hooks on text; S2S is lower-latency native speech.'
    },
    {
      name: 's2s.provider',
      label: 'S2S Provider (realtime-s2s mode only)',
      type: 'select',
      options: [
        { label: 'GPT Live (OpenAI Realtime)', value: 'openai-realtime' },
        { label: 'Gemini Live (Google)', value: 'gemini-live' },
        { label: 'Grok Voice (xAI)', value: 'grok-voice' },
        { label: 'NVIDIA Voice (Riva + Nemotron)', value: 'nvidia-voice' },
        { label: 'Kyutai Moshi', value: 'kyutai-moshi' }
      ],
      default: 'openai-realtime',
      description: 'Native speech-to-speech model; guardrails run on streamed partial transcripts.'
    },
    {
      name: 's2s.model',
      label: 'S2S Model',
      type: 'select',
      options: [
        { label: 'GPT Realtime', value: 'gpt-realtime' },
        { label: 'GPT-4o Realtime', value: 'gpt-4o-realtime-preview' },
        { label: 'Gemini 2.5 Flash Live', value: 'gemini-2.5-flash-live' },
        { label: 'Gemini 2.0 Flash Live', value: 'gemini-2.0-flash-live' },
        { label: 'Grok Voice', value: 'grok-voice' },
        { label: 'Riva + Nemotron pipeline', value: 'riva-nemotron' },
        { label: 'Parakeet + Nemotron pipeline', value: 'parakeet-nemotron' },
        { label: 'Moshi', value: 'moshi' },
        { label: 'Moshi 1.1', value: 'moshi-1.1' }
      ],
      default: 'gpt-realtime'
    },
    {
      name: 'stt.provider',
      label: 'STT Provider (cascaded mode)',
      type: 'select',
      options: [
        { label: 'Deepgram', value: 'deepgram' },
        { label: 'OpenAI Whisper', value: 'openai' },
        { label: 'AWS Transcribe', value: 'aws' },
        { label: 'Google Speech', value: 'google' },
        { label: 'NVIDIA Riva', value: 'nvidia-riva' }
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
        { label: 'Whisper Large v3', value: 'whisper-large-v3' },
        { label: 'Parakeet TDT 0.6B', value: 'parakeet-tdt-0.6b' },
        { label: 'Conformer CTC', value: 'conformer-ctc' }
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
