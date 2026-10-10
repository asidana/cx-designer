/**
 * Speech Provider Registry — STT, TTS, and speech-to-speech options.
 *
 * Two voice modes (see architecture §17.3):
 * - `cascaded`: STT → LLM → TTS with full guardrail/slot hooks on text
 * - `realtime-s2s`: native speech-to-speech (no intermediate text);
 *   guardrails run on streamed partial transcripts pre-TTS.
 */

export type VoiceMode = 'cascaded' | 'realtime-s2s';

export type ProviderKind = 'stt' | 'tts' | 's2s';

export interface SpeechProvider {
  id: string;
  label: string;
  kind: ProviderKind;
  models: Array<{ label: string; value: string }>;
  defaultModel: string;
  streaming: boolean;
  selfHostable: boolean;
  envKey: string;
  notes: string;
}

export const STT_PROVIDERS: SpeechProvider[] = [
  {
    id: 'deepgram',
    label: 'Deepgram',
    kind: 'stt',
    models: [
      { label: 'Nova-2', value: 'nova-2' },
      { label: 'Nova-3', value: 'nova-3' }
    ],
    defaultModel: 'nova-2',
    streaming: true,
    selfHostable: false,
    envKey: 'DEEPGRAM_API_KEY',
    notes: 'Low-latency streaming STT, best default for cascaded mode.'
  },
  {
    id: 'openai',
    label: 'OpenAI Whisper',
    kind: 'stt',
    models: [{ label: 'Whisper Large v3', value: 'whisper-large-v3' }],
    defaultModel: 'whisper-large-v3',
    streaming: false,
    selfHostable: false,
    envKey: 'OPENAI_API_KEY',
    notes: 'High accuracy; batch-oriented, higher latency than Deepgram.'
  },
  {
    id: 'aws',
    label: 'AWS Transcribe',
    kind: 'stt',
    models: [{ label: 'Streaming', value: 'streaming' }],
    defaultModel: 'streaming',
    streaming: true,
    selfHostable: false,
    envKey: 'AWS_ACCESS_KEY_ID',
    notes: 'Streaming transcription inside AWS VPCs.'
  },
  {
    id: 'google',
    label: 'Google Speech',
    kind: 'stt',
    models: [{ label: 'Chirp 2', value: 'chirp-2' }],
    defaultModel: 'chirp-2',
    streaming: true,
    selfHostable: false,
    envKey: 'GOOGLE_API_KEY',
    notes: 'Strong multilingual coverage.'
  },
  {
    id: 'nvidia-riva',
    label: 'NVIDIA Riva',
    kind: 'stt',
    models: [
      { label: 'Parakeet TDT 0.6B', value: 'parakeet-tdt-0.6b' },
      { label: 'Conformer CTC', value: 'conformer-ctc' }
    ],
    defaultModel: 'parakeet-tdt-0.6b',
    streaming: true,
    selfHostable: true,
    envKey: 'NVIDIA_API_KEY',
    notes: 'Self-hostable GPU STT; pairs with the 75%-cheaper MPS inference path.'
  }
];

export const TTS_PROVIDERS: SpeechProvider[] = [
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    kind: 'tts',
    models: [
      { label: 'Eleven Turbo v2', value: 'eleven_turbo_v2' },
      { label: 'Eleven Multilingual v2', value: 'eleven_multilingual_v2' },
      { label: 'Eleven Flash v2', value: 'eleven_flash_v2' }
    ],
    defaultModel: 'eleven_turbo_v2',
    streaming: true,
    selfHostable: false,
    envKey: 'ELEVENLABS_API_KEY',
    notes: 'Most natural voices; Flash v2 for lowest latency.'
  },
  {
    id: 'openai',
    label: 'OpenAI TTS',
    kind: 'tts',
    models: [
      { label: 'TTS-1', value: 'tts-1' },
      { label: 'TTS-1 HD', value: 'tts-1-hd' }
    ],
    defaultModel: 'tts-1',
    streaming: true,
    selfHostable: false,
    envKey: 'OPENAI_API_KEY',
    notes: 'Simple API, six built-in voices.'
  },
  {
    id: 'aws',
    label: 'AWS Polly',
    kind: 'tts',
    models: [{ label: 'Neural', value: 'neural' }],
    defaultModel: 'neural',
    streaming: true,
    selfHostable: false,
    envKey: 'AWS_ACCESS_KEY_ID',
    notes: 'In-VPC synthesis with lexicons.'
  },
  {
    id: 'google',
    label: 'Google TTS',
    kind: 'tts',
    models: [{ label: 'Chirp 3 HD', value: 'chirp-3-hd' }],
    defaultModel: 'chirp-3-hd',
    streaming: true,
    selfHostable: false,
    envKey: 'GOOGLE_API_KEY',
    notes: '30+ languages, HD voices.'
  },
  {
    id: 'cartesia',
    label: 'Cartesia',
    kind: 'tts',
    models: [{ label: 'Sonic', value: 'sonic' }],
    defaultModel: 'sonic',
    streaming: true,
    selfHostable: false,
    envKey: 'CARTESIA_API_KEY',
    notes: 'Ultra-low-latency streaming voices.'
  },
  {
    id: 'grok',
    label: 'Grok Voice (xAI)',
    kind: 'tts',
    models: [{ label: 'Grok Voice', value: 'grok-voice' }],
    defaultModel: 'grok-voice',
    streaming: true,
    selfHostable: false,
    envKey: 'XAI_API_KEY',
    notes: 'xAI expressive voices; conversational tone out of the box.'
  },
  {
    id: 'nvidia-riva',
    label: 'NVIDIA Riva',
    kind: 'tts',
    models: [
      { label: 'FastPitch', value: 'fastpitch' },
      { label: 'HiFi-GAN', value: 'hifigan' }
    ],
    defaultModel: 'fastpitch',
    streaming: true,
    selfHostable: true,
    envKey: 'NVIDIA_API_KEY',
    notes: 'Self-hostable GPU TTS; keep audio fully in-VPC.'
  }
];

export const S2S_PROVIDERS: SpeechProvider[] = [
  {
    id: 'openai-realtime',
    label: 'GPT Live (OpenAI Realtime)',
    kind: 's2s',
    models: [
      { label: 'GPT Realtime', value: 'gpt-realtime' },
      { label: 'GPT-4o Realtime', value: 'gpt-4o-realtime-preview' }
    ],
    defaultModel: 'gpt-realtime',
    streaming: true,
    selfHostable: false,
    envKey: 'OPENAI_API_KEY',
    notes: 'Native speech-to-speech with function calling; guardrails on partial transcripts.'
  },
  {
    id: 'gemini-live',
    label: 'Gemini Live (Google)',
    kind: 's2s',
    models: [
      { label: 'Gemini 2.5 Flash Live', value: 'gemini-2.5-flash-live' },
      { label: 'Gemini 2.0 Flash Live', value: 'gemini-2.0-flash-live' }
    ],
    defaultModel: 'gemini-2.5-flash-live',
    streaming: true,
    selfHostable: false,
    envKey: 'GOOGLE_API_KEY',
    notes: 'Bidirectional audio + video; strong multilingual S2S.'
  },
  {
    id: 'grok-voice',
    label: 'Grok Voice (xAI)',
    kind: 's2s',
    models: [{ label: 'Grok Voice', value: 'grok-voice' }],
    defaultModel: 'grok-voice',
    streaming: true,
    selfHostable: false,
    envKey: 'XAI_API_KEY',
    notes: 'Full-duplex conversational voice from xAI.'
  },
  {
    id: 'nvidia-voice',
    label: 'NVIDIA Voice (Riva + Nemotron)',
    kind: 's2s',
    models: [
      { label: 'Riva + Nemotron pipeline', value: 'riva-nemotron' },
      { label: 'Parakeet + Nemotron pipeline', value: 'parakeet-nemotron' }
    ],
    defaultModel: 'riva-nemotron',
    streaming: true,
    selfHostable: true,
    envKey: 'NVIDIA_API_KEY',
    notes: 'Self-hosted S2S: Riva/Parakeet STT + Nemotron reasoning + Riva TTS on your GPUs.'
  },
  {
    id: 'kyutai-moshi',
    label: 'Kyutai Moshi',
    kind: 's2s',
    models: [
      { label: 'Moshi', value: 'moshi' },
      { label: 'Moshi 1.1', value: 'moshi-1.1' }
    ],
    defaultModel: 'moshi',
    streaming: true,
    selfHostable: true,
    envKey: 'KYUTAI_API_KEY',
    notes: 'Open-weight full-duplex speech model; self-host for private, barge-in-native voice.'
  }
];

export function getProvider(kind: ProviderKind, id: string): SpeechProvider | undefined {
  const all =
    kind === 'stt' ? STT_PROVIDERS : kind === 'tts' ? TTS_PROVIDERS : S2S_PROVIDERS;
  return all.find(p => p.id === id);
}
