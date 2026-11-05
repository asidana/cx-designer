/**
 * Self-help knowledge base — deterministic, in-product articles — T6.
 *
 * The Self-Help channel answers by resolving the caller's turn against this
 * KB, so the feature works offline, in tests, and in every deployment
 * without a vector store. A flow can override with `agentic.selfhelp_answer`
 * nodes; the runtime only falls back here when the flow yields no answer.
 */

export interface SelfHelpArticle {
  id: string;
  title: string;
  summary: string;
  /** Markdown-ish body. */
  body: string;
  /** Keywords used for deterministic lookup scoring. */
  keywords: string[];
  category: 'billing' | 'orders' | 'product' | 'security' | 'platform';
}

export const ARTICLES: SelfHelpArticle[] = [
  {
    id: 'A-101',
    title: 'Refund policy',
    summary: 'How refunds work, timelines and self-serve eligibility.',
    body: 'Digital and physical purchases are refundable within 30 days. Approved refunds post to the original payment method in 5–7 business days. Orders marked non-returnable are excluded.',
    keywords: ['refund', 'money back', 'return', 'policy'],
    category: 'billing'
  },
  {
    id: 'A-102',
    title: 'Order tracking',
    summary: 'Where your order is, and when it arrives.',
    body: 'Track with your order id on the order page. Statuses: processing → shipped → delivered. Shipping notifications arrive by email and SMS once the carrier scans the parcel.',
    keywords: ['order', 'tracking', 'shipped', 'delivery', 'eta', 'track'],
    category: 'orders'
  },
  {
    id: 'A-103',
    title: 'Cancel an order',
    summary: 'When you can cancel and what happens next.',
    body: 'Orders can be cancelled for free up to the moment they ship. After shipping, cancel is not available — return the parcel instead (see Refund policy).',
    keywords: ['cancel', 'order', 'stop shipment'],
    category: 'orders'
  },
  {
    id: 'A-104',
    title: 'Change or reset your password',
    summary: 'Reset steps and how long the reset link stays valid.',
    body: 'Use the sign-in page “Forgot password” link. The reset email is valid for 30 minutes. If it does not arrive, check spam and request again after 60 seconds.',
    keywords: ['password', 'reset', 'login', 'sign in', 'account'],
    category: 'security'
  },
  {
    id: 'A-105',
    title: 'What is the Omnichannel Agent Platform?',
    summary: 'One canvas to design, guard, and ship agents for every channel.',
    body: 'The Omnichannel Agent Platform is a design-to-deploy workspace: CX Designer for flows, Agent Firewall for protection, Voice Gateway for transport, and built-in observability — all on one model.',
    keywords: ['platform', 'what is', 'omnichannel', 'product', 'overview'],
    category: 'platform'
  },
  {
    id: 'A-106',
    title: 'Voice Gateway setup',
    summary: 'Connect a SIP trunk and route voice through a node.',
    body: 'Add a Voice Gateway SIP trunk, then wire `integration.telephony` into your flow. Audio travels through the gateway as an envelope part; the same flow runs for chat and voice.',
    keywords: ['voice', 'sip', 'telephony', 'gateway', 'setup'],
    category: 'platform'
  }
];

/** Deterministic keyword-scored lookup. Returns best article or null. */
export function findArticle(query: string): SelfHelpArticle | null {
  const q = query.toLowerCase();
  let best: SelfHelpArticle | null = null;
  let bestScore = 0;
  for (const article of ARTICLES) {
    let score = 0;
    for (const kw of article.keywords) {
      if (q.includes(kw)) score += 3;
    }
    // Title words are strong signals.
    for (const word of article.title.toLowerCase().split(/\s+/)) {
      if (q.includes(word) && word.length > 3) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = article;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Knowledge-base articles exposed to Web MCP and the help console. */
export function articleSearch(query: string, limit = 3): SelfHelpArticle[] {
  const q = query.toLowerCase();
  return ARTICLES.filter(a =>
    q.length === 0 ||
    a.title.toLowerCase().includes(q) ||
    a.body.toLowerCase().includes(q) ||
    a.keywords.some(k => k.includes(q) || q.includes(k))
  ).slice(0, limit);
}