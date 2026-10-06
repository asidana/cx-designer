/**
 * Test Case Store — "save as test case" (test → eval loop).
 *
 * Pins any test run (input + injected state + actual output) as an eval
 * case in localStorage, so building naturally produces the golden set.
 * A future backend migration can move this to /api/eval-suites.
 */

export interface SavedTestCase {
  id: string;
  name: string;
  input: string;
  startNodeId: string | null;
  injectedState: Record<string, unknown>;
  actualOutput: string;
  expectedOutput: string;
  cost: number;
  createdAt: number;
}

const STORAGE_KEY = 'agentic_cx_test_cases';

function loadAll(): SavedTestCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTestCase[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(cases: SavedTestCase[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {
    // Storage full or unavailable — eval cases are best-effort locally
  }
}

export function listTestCases(): SavedTestCase[] {
  return loadAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveTestCase(
  input: Omit<SavedTestCase, 'id' | 'createdAt'>
): SavedTestCase {
  const cases = loadAll();
  const saved: SavedTestCase = {
    ...input,
    id: `case_${Date.now()}`,
    createdAt: Date.now()
  };
  cases.push(saved);
  persist(cases);
  return saved;
}

export function deleteTestCase(id: string): void {
  persist(loadAll().filter(c => c.id !== id));
}

export function updateExpectedOutput(id: string, expectedOutput: string): void {
  const cases = loadAll().map(c => (c.id === id ? { ...c, expectedOutput } : c));
  persist(cases);
}
