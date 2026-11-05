/**
 * Local tool-call mock for the canvas simulator.
 * Deterministic canned results — no network, no platform store.
 * When the feature is embedded, the host can replace this module
 * with real tool dispatch.
 */

const CANNED_RESPONSES: Record<string, Record<string, unknown>> = {
  get_account_summary: {
    accountId: 'ACC-001',
    plan: 'Premium',
    balance: 84.5,
    currency: 'USD',
    nextBillingDate: '2026-12-01'
  },
  check_refund_status: {
    refundId: 'RFD-4410',
    status: 'processed',
    amount: 29.99,
    estimatedDays: 2
  },
  reset_password: {
    ok: true,
    message: 'Password reset link sent to the address on file.'
  },
  lookup_order: {
    orderId: 'ORD-8877',
    status: 'delivered',
    carrier: 'UPS',
    tracking: '1Z999AA10123456784'
  }
};

/**
 * Resolves a tool mock: scripted canned results first, then a generic
 * success stub — always non-null (callers spread `response` directly).
 */
export async function mockToolCall(
  name: string,
  args: Record<string, unknown> = {}
): Promise<{ response: Record<string, unknown>; mocked: boolean }> {
  // Small simulated latency keeps trace pulses legible (temporal ordering).
  await tinyDelay();
  if (name === 'generic_tool') {
    return { response: { success: true, echoed: args }, mocked: true };
  }
  const canned = CANNED_RESPONSES[name];
  if (canned) return { response: canned, mocked: true };
  return { response: { success: true }, mocked: true };
}

function tinyDelay(): Promise<void> {
  return new Promise(r => setTimeout(r, 120 + Math.round(Math.random() * 180)));
}
