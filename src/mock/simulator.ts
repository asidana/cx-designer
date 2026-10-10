/**
 * Simulation runner — multi-turn mock calls with caller personas.
 *
 * Feeds persona utterances (optionally degraded like noisy STT) through
 * the flow engine turn by turn, merges per-turn session state, and
 * persists the call log to IndexedDB. No credentials, no network.
 */

import { FlowEngine } from '../engine/flowEngine';
import { idbAdd } from './db';
import { Persona, Scenario } from './seed';

export interface SimulatedTurn {
  turn: number;
  personaUtterance: string;
  transcriptSent: string;
  agentResponse: string;
  latencyMs: number;
  cost: number;
  bargedIn: boolean;
}

export interface SimulationResult {
  personaId: string;
  scenarioId: string;
  startedAt: number;
  turns: SimulatedTurn[];
  totalLatencyMs: number;
  totalCost: number;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic STT degradation so noisy runs are reproducible. */
export function garbleTranscript(text: string, level: 0 | 1 | 2, seed: string): string {
  if (level === 0) return text;
  const rand = mulberry32(hashSeed(seed));
  const words = text.split(' ');
  const out: string[] = [];
  for (const w of words) {
    const r = rand();
    if (level === 2 && r < 0.18) continue; // dropped word
    if (r < 0.12) {
      out.push(w.toLowerCase()); // mis-cased / mis-heard
      continue;
    }
    if (level === 2 && r < 0.22 && w.length > 3) {
      out.push(w.slice(0, -1)); // clipped ending
      continue;
    }
    out.push(w);
  }
  const joined = out.join(' ');
  return level === 2 ? joined.replace(/\?/g, '') : joined;
}

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Simulation aborted'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('Simulation aborted'));
    });
  });

export async function runSimulation(
  engine: FlowEngine,
  persona: Persona,
  scenario: Scenario,
  opts: {
    startNodeId?: string;
    onTurn?: (turn: SimulatedTurn) => void;
    signal?: AbortSignal;
  } = {}
): Promise<SimulationResult> {
  const turns: SimulatedTurn[] = [];
  let state: Record<string, unknown> = { ...scenario.initialState };
  let totalLatencyMs = 0;
  let totalCost = 0;

  for (let i = 0; i < scenario.turns.length; i++) {
    if (opts.signal?.aborted) throw new Error('Simulation aborted');
    const script = scenario.turns[i];
    if (script.state) state = { ...state, ...script.state };

    await delay(persona.paceMs, opts.signal);

    const transcriptSent = garbleTranscript(
      script.say,
      persona.sttNoise,
      `${scenario.id}:${i}`
    );
    const bargedIn = persona.bargesIn && i > 0;

    const start = Date.now();
    const result = opts.startNodeId
      ? await engine.executeFrom(opts.startNodeId, transcriptSent, `sim_${Date.now()}`, state)
      : await engine.execute(transcriptSent, `sim_${Date.now()}`);
    const latencyMs = Date.now() - start;
    const cost = (result.outputs.cost as number) || 0;
    const agentResponse = String(result.outputs.response || '');

    totalLatencyMs += latencyMs;
    totalCost += cost;

    const turn: SimulatedTurn = {
      turn: i + 1,
      personaUtterance: script.say,
      transcriptSent,
      agentResponse,
      latencyMs,
      cost,
      bargedIn
    };
    turns.push(turn);
    opts.onTurn?.(turn);
  }

  const startedAt = Date.now();
  await idbAdd('callLogs', {
    personaId: persona.id,
    scenarioId: scenario.id,
    startedAt,
    turns,
    totalLatencyMs,
    totalCost
  });

  return {
    personaId: persona.id,
    scenarioId: scenario.id,
    startedAt,
    turns,
    totalLatencyMs,
    totalCost
  };
}

export interface CallLog extends SimulationResult {
  id?: number;
}
