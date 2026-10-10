/**
 * Key Vault — provider API keys for live experience bots.
 *
 * Resolution order per provider:
 *   1. Session override (in-memory, never persisted)
 *   2. localStorage (`cx-designer-keys`) — set via Settings → API Keys
 *   3. Backend env passthrough (server injects availability only, never values)
 *
 * Keys are never logged, never put in traces, and displayed masked.
 * Until you paste keys, all voice paths run on IndexedDB mocks.
 */

export type KeyProvider = 'openai' | 'xai' | 'google' | 'deepgram' | 'elevenlabs' | 'nvidia' | 'cartesia' | 'kyutai';

const STORAGE_KEY = 'cx-designer-keys';

const sessionOverrides = new Map<KeyProvider, string>();

function readStored(): Partial<Record<KeyProvider, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<KeyProvider, string>>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function getKey(provider: KeyProvider): string | null {
  const session = sessionOverrides.get(provider);
  if (session) return session;
  return readStored()[provider] || null;
}

export function hasKey(provider: KeyProvider): boolean {
  return getKey(provider) !== null;
}

/** Persist a key to localStorage (Settings UI). Pass empty string to remove. */
export function setKey(provider: KeyProvider, value: string): void {
  const stored = readStored();
  if (!value.trim()) {
    delete stored[provider];
  } else {
    stored[provider] = value.trim();
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable — key lives for this session only
    if (value.trim()) sessionOverrides.set(provider, value.trim());
  }
}

/** In-memory override (e.g. pasted for one test run, not persisted). */
export function setSessionKey(provider: KeyProvider, value: string): void {
  if (!value.trim()) {
    sessionOverrides.delete(provider);
  } else {
    sessionOverrides.set(provider, value.trim());
  }
}

/** Masked for display: `sk-a…xyz`. Empty string when absent. */
export function maskedKey(provider: KeyProvider): string {
  const key = getKey(provider);
  if (!key || key.length < 8) return key ? '••••' : '';
  return `${key.slice(0, 4)}…${key.slice(-3)}`;
}

export function keySource(provider: KeyProvider): 'session' | 'stored' | 'missing' {
  if (sessionOverrides.has(provider)) return 'session';
  return readStored()[provider] ? 'stored' : 'missing';
}
