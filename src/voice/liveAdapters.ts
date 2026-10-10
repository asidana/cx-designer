/**
 * Live provider adapters — GPT Live, Gemini Live, Grok Voice.
 *
 * Status: connection probes are REAL (cheap list-models calls, no spend).
 * Realtime audio sessions are STUBBED — the session interface below is
 * the contract to implement once keys arrive (see TODOs per provider).
 *
 * Until keys are pasted in Settings → API Keys, flows run on mocks.
 */

import { getKey, KeyProvider } from './keyVault';

export interface ProbeResult {
  ok: boolean;
  latencyMs: number;
  models?: string[];
  error?: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

async function getJson(url: string, headers: Record<string, string>): Promise<{ status: number; body: any }> {
  const res = await fetch(url, { headers });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

/** OpenAI: GPT Live (Realtime API). Probe = list models. */
export async function probeOpenAI(): Promise<ProbeResult> {
  const key = getKey('openai');
  if (!key) return { ok: false, latencyMs: 0, error: 'No OpenAI key — paste one in Settings → API Keys.' };
  try {
    const { result, latencyMs } = await timed(() =>
      getJson('https://api.openai.com/v1/models', { Authorization: `Bearer ${key}` })
    );
    if (result.status === 200) {
      const models = Array.isArray(result.body?.data)
        ? result.body.data.map((m: any) => String(m.id)).filter((id: string) => id.includes('realtime') || id.includes('gpt'))
        : [];
      return { ok: true, latencyMs, models };
    }
    return { ok: false, latencyMs, error: `OpenAI rejected the key (HTTP ${result.status}).` };
  } catch (e) {
    return { ok: false, latencyMs: 0, error: `Network error: ${e instanceof Error ? e.message : e}` };
  }
}

/** xAI: Grok Voice. Probe = list models. */
export async function probeXai(): Promise<ProbeResult> {
  const key = getKey('xai');
  if (!key) return { ok: false, latencyMs: 0, error: 'No xAI key — paste one in Settings → API Keys.' };
  try {
    const { result, latencyMs } = await timed(() =>
      getJson('https://api.x.ai/v1/models', { Authorization: `Bearer ${key}` })
    );
    if (result.status === 200) {
      const models = Array.isArray(result.body?.data)
        ? result.body.data.map((m: any) => String(m.id))
        : [];
      return { ok: true, latencyMs, models };
    }
    return { ok: false, latencyMs, error: `xAI rejected the key (HTTP ${result.status}).` };
  } catch (e) {
    return { ok: false, latencyMs: 0, error: `Network error: ${e instanceof Error ? e.message : e}` };
  }
}

/** Google: Gemini Live. Probe = list models. */
export async function probeGoogle(): Promise<ProbeResult> {
  const key = getKey('google');
  if (!key) return { ok: false, latencyMs: 0, error: 'No Google key — paste one in Settings → API Keys.' };
  try {
    const { result, latencyMs } = await timed(() =>
      getJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {})
    );
    if (result.status === 200) {
      const models = Array.isArray(result.body?.models)
        ? result.body.models.map((m: any) => String(m.name).replace('models/', ''))
        : [];
      return { ok: true, latencyMs, models };
    }
    return { ok: false, latencyMs, error: `Google rejected the key (HTTP ${result.status}).` };
  } catch (e) {
    return { ok: false, latencyMs: 0, error: `Network error: ${e instanceof Error ? e.message : e}` };
  }
}

export const PROBES: Record<'openai' | 'xai' | 'google', () => Promise<ProbeResult>> = {
  openai: probeOpenAI,
  xai: probeXai,
  google: probeGoogle
};

// ---------------------------------------------------------------------------
// Realtime session contract (stubbed until keys arrive)
// ---------------------------------------------------------------------------

export interface RealtimeSessionConfig {
  provider: 'openai-realtime' | 'gemini-live' | 'grok-voice';
  model: string;
  systemPrompt: string;
  voice?: string;
  onAudio?: (chunk: ArrayBuffer) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
}

export interface RealtimeSession {
  sendAudio(chunk: ArrayBuffer): void;
  sendText(text: string): void;
  close(): void;
}

/**
 * TODO(live): implement against the provider WebSocket APIs —
 * - openai-realtime: wss://api.openai.com/v1/realtime?model=... (Bearer auth,
 *   session.update with instructions + voice, input_audio_buffer.* events)
 * - gemini-live: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
 * - grok-voice: xAI realtime voice endpoint (confirm protocol against xAI docs on arrival)
 * Guardrails hook into onTranscript partials pre-playback; slot-filling
 * runs the parallel cascaded verification pass (§17.3).
 */
export async function createRealtimeSession(
  _config: RealtimeSessionConfig,
  keyProvider: KeyProvider
): Promise<RealtimeSession> {
  const key = getKey(keyProvider);
  if (!key) {
    throw new Error(
      `No ${keyProvider} key. Paste one in Settings → API Keys — mocks stay active until then.`
    );
  }
  throw new Error(
    'Realtime audio sessions are not wired yet — probe passes, session TODO is next once keys land.'
  );
}
