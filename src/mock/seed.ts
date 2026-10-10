/**
 * Mock seed data — caller personas, call scenarios, tool mocks.
 *
 * Seeded into IndexedDB on first simulation run. Personas shape how
 * utterances are delivered (pace, interruptions, STT noise); scenarios
 * are multi-turn scripts; tool mocks are scripted API responses so
 * flows run end-to-end with zero credentials.
 */

import { idbBulkPut, idbGetAll } from './db';

export interface Persona {
  id: string;
  name: string;
  description: string;
  /** ms pause between turns */
  paceMs: number;
  /** 0 = clean transcript, 1 = light noise, 2 = heavy noise */
  sttNoise: 0 | 1 | 2;
  /** whether this caller barges in (interrupts TTS) */
  bargesIn: boolean;
}

export interface ScenarioTurn {
  /** persona utterance for this turn */
  say: string;
  /** session state to merge before this turn */
  state?: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  personaId: string;
  initialState: Record<string, unknown>;
  turns: ScenarioTurn[];
}

export interface ToolMock {
  name: string;
  description: string;
  /** match request by substring of JSON args; first match wins */
  rules: Array<{ matchArgs?: string; response: Record<string, unknown>; latencyMs: number }>;
  fallback: Record<string, unknown>;
}

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'patient',
    name: 'Patient Priya',
    description: 'Clear speech, full sentences, waits for the agent.',
    paceMs: 800,
    sttNoise: 0,
    bargesIn: false
  },
  {
    id: 'impatient',
    name: 'Impatient Ivan',
    description: 'Short replies, interrupts, repeats himself.',
    paceMs: 200,
    sttNoise: 1,
    bargesIn: true
  },
  {
    id: 'noisy',
    name: 'Noisy Nia',
    description: 'Calling from traffic; heavy STT degradation.',
    paceMs: 800,
    sttNoise: 2,
    bargesIn: false
  },
  {
    id: 'confused',
    name: 'Confused Carlos',
    description: 'Vague answers, needs reprompts, corrects himself.',
    paceMs: 1200,
    sttNoise: 1,
    bargesIn: false
  }
];

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 'billing-refund',
    name: 'Billing refund request',
    description: 'Caller was double-charged and wants a $49 refund.',
    personaId: 'patient',
    initialState: { identity_verified: false },
    turns: [
      { say: 'Hi, I was charged twice last month' },
      { say: 'My account ID is A B 1 2 3 4 5 6', state: { identity_verified: true } },
      { say: 'Yes, refund the duplicate forty nine dollars', state: { balance: 98 } }
    ]
  },
  {
    id: 'order-status',
    name: 'Order status check',
    description: 'Caller wants to know where their package is.',
    personaId: 'impatient',
    initialState: {},
    turns: [
      { say: 'Where is my order' },
      { say: 'Order O R D 9 9 1' }
    ]
  },
  {
    id: 'noisy-billing',
    name: 'Billing over a bad line',
    description: 'Same refund flow but with heavy STT noise.',
    personaId: 'noisy',
    initialState: { identity_verified: false },
    turns: [
      { say: 'Hi, I was charged twice last month' },
      { say: 'My account ID is A B 1 2 3 4 5 6', state: { identity_verified: true } }
    ]
  }
];

export const DEFAULT_TOOL_MOCKS: ToolMock[] = [
  {
    name: 'get_account_balance',
    description: 'Returns the caller account balance.',
    rules: [
      {
        matchArgs: 'AB123456',
        response: { balance: 98, currency: 'USD', duplicate_charge: true },
        latencyMs: 120
      }
    ],
    fallback: { balance: 0, currency: 'USD', duplicate_charge: false }
  },
  {
    name: 'issue_refund',
    description: 'Issues a refund; requires approval in production.',
    rules: [
      {
        matchArgs: '49',
        response: { refund_id: 'rf_mock_001', status: 'pending', amount: 49 },
        latencyMs: 300
      }
    ],
    fallback: { refund_id: 'rf_mock_000', status: 'pending' }
  },
  {
    name: 'track_order',
    description: 'Returns order tracking status.',
    rules: [
      {
        matchArgs: 'ORD991',
        response: { status: 'in_transit', eta: 'Tuesday', carrier: 'MockPost' },
        latencyMs: 150
      }
    ],
    fallback: { status: 'unknown' }
  },
  {
    name: 'schedule_appointment',
    description: 'Books an appointment slot.',
    rules: [],
    fallback: { appointment_id: 'appt_mock_001', status: 'confirmed' }
  }
];

export async function seedMocks(): Promise<void> {
  const [personas, scenarios, tools] = await Promise.all([
    idbGetAll('personas'),
    idbGetAll('scenarios'),
    idbGetAll('toolMocks')
  ]);
  const ops: Promise<void>[] = [];
  if (personas.length === 0) {
    ops.push(idbBulkPut('personas', DEFAULT_PERSONAS as unknown as Record<string, unknown>[]));
  }
  if (scenarios.length === 0) {
    ops.push(idbBulkPut('scenarios', DEFAULT_SCENARIOS as unknown as Record<string, unknown>[]));
  }
  if (tools.length === 0) {
    ops.push(idbBulkPut('toolMocks', DEFAULT_TOOL_MOCKS as unknown as Record<string, unknown>[]));
  }
  await Promise.all(ops);
}

/** Look up a scripted tool response (with simulated latency). */
export async function mockToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ response: Record<string, unknown>; latencyMs: number; mocked: true }> {
  const mock = await idbGetAll<ToolMock>('toolMocks').then(all =>
    all.find(t => t.name === name)
  );
  const argStr = JSON.stringify(args);
  const rule = mock?.rules.find(r => !r.matchArgs || argStr.includes(r.matchArgs));
  const response = rule?.response || mock?.fallback || { success: true, mocked: true };
  const latencyMs = rule?.latencyMs ?? 100;
  await new Promise(res => setTimeout(res, latencyMs));
  return { response, latencyMs, mocked: true as const };
}
