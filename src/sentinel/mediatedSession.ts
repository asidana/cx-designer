/**
 * Mediated realtime session — Sentinel sits between the S2S model and
 * the outside world in both directions.
 *
 *   caller audio ──▶ [Sentinel] ──▶ S2S model ──▶ [Sentinel] ──▶ caller
 *                        │                              │
 *                   (session policy,              (post_llm gate on
 *                    rate limit)                   partial transcripts;
 *                                                  audio held until
 *                                                  text clears)
 *
 * Text-gated audio: agent audio chunks are buffered until the matching
 * partial transcript passes the post_llm gate. On block, buffered audio
 * is dropped and the caller hears a holding phrase instead of the
 * violating speech. Nothing the caller never heard enters history.
 */

import { Sentinel } from './sentinel';

export interface MediatedCallbacks {
  /** audio cleared for playback */
  onAgentAudio?: (chunk: ArrayBuffer) => void;
  /** cleared transcript (for UI, logs already redacted upstream) */
  onAgentTranscript?: (text: string, isFinal: boolean) => void;
  /** fired when a gate blocks — UI should show policy state, not content */
  onBlocked?: (action: 'block' | 'escalate', message: string) => void;
}

export interface MediatedSessionConfig {
  sessionId: string;
  holdingPhrase?: string;
}

const DEFAULT_HOLDING_PHRASE = 'Let me connect you with someone who can help with that.';

/**
 * Minimal transport shape. Concrete S2S providers (OpenAI Realtime,
 * Gemini Live, Grok Voice, Moshi) adapt to this; see liveAdapters.ts.
 */
export interface S2STransport {
  sendCallerAudio(chunk: ArrayBuffer): void;
  close(): void;
}

export class MediatedVoiceSession {
  private audioBuffer: ArrayBuffer[] = [];

  constructor(
    private transport: S2STransport,
    private sentinel: Sentinel,
    private session: Record<string, unknown>,
    private config: MediatedSessionConfig,
    private cb: MediatedCallbacks = {}
  ) {}

  /** Caller audio → model. Session policy + rate limit apply; audio itself passes. */
  callerAudio(chunk: ArrayBuffer): void {
    const gate = this.sentinel.check({
      phase: 'pre_llm',
      content: '[audio-frame]',
      session: this.session,
      identity: this.config.sessionId
    });
    if (!gate.allowed) {
      this.cb.onBlocked?.(
        gate.action === 'escalate' ? 'escalate' : 'block',
        gate.violations.map(v => v.message).join('; ')
      );
      return;
    }
    if (gate.configUpdates) Object.assign(this.session, gate.configUpdates);
    this.transport.sendCallerAudio(chunk);
  }

  /**
   * Model partial transcript → gate before any audio plays.
   * Cleared text flows to UI/playback; blocked text drops its audio.
   */
  agentTranscript(text: string, isFinal: boolean): void {
    const gate = this.sentinel.check({
      phase: 'post_llm',
      content: text,
      session: this.session,
      identity: this.config.sessionId
    });
    if (gate.configUpdates) Object.assign(this.session, gate.configUpdates);
    if (!gate.allowed) {
      this.dropBufferedAudio();
      this.cb.onBlocked?.(
        gate.action === 'escalate' ? 'escalate' : 'block',
        gate.violations.map(v => v.message).join('; ')
      );
      return;
    }
    this.cb.onAgentTranscript?.(gate.redactedContent, isFinal);
  }

  /** Model audio → buffered until its transcript clears the gate. */
  agentAudio(chunk: ArrayBuffer): void {
    this.audioBuffer.push(chunk);
  }

  /** Release buffered audio after the transcript cleared. */
  flushAudio(): void {
    const buffered = this.audioBuffer;
    this.audioBuffer = [];
    for (const chunk of buffered) this.cb.onAgentAudio?.(chunk);
  }

  private dropBufferedAudio(): void {
    this.audioBuffer = [];
  }

  get holdingPhrase(): string {
    return this.config.holdingPhrase || DEFAULT_HOLDING_PHRASE;
  }

  close(): void {
    this.transport.close();
    this.audioBuffer = [];
  }
}
