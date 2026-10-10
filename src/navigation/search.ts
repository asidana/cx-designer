/**
 * Fuzzy search for the command palette.
 *
 * Subsequence match with positional bonuses — "ntcls" finds
 * "Intent Classifier", "tpl" finds "Templates". Pure and unit-tested.
 */

export interface Searchable {
  label: string;
  hint?: string;
  group?: string;
  keywords?: string[];
}

export interface SearchHit<T> {
  item: T;
  score: number;
}

/**
 * Score `text` against `query`. Returns -1 when the query characters do not
 * appear in order. Higher is better.
 */
export function scoreMatch(query: string, text: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!t) return -1;

  // Exact / prefix / word-boundary matches dominate subsequence noise.
  if (t === q) return 1000;
  if (t.startsWith(q)) return 900 - t.length * 0.1;

  const wordStart = new RegExp(`\\b${escapeRegExp(q)}`).test(t);
  if (t.includes(q)) return (wordStart ? 800 : 700) - t.length * 0.1;

  let score = 0;
  let ti = 0;
  let lastMatch = -2;
  for (const ch of q) {
    if (ch === ' ') continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    // Consecutive characters are worth much more than scattered ones.
    if (found === lastMatch + 1) score += 12;
    else score += 4;
    // Prefer matches at word boundaries.
    if (found === 0 || t[found - 1] === ' ' || t[found - 1] === '-' || t[found - 1] === '/') {
      score += 8;
    }
    score -= Math.min(6, (found - ti) * 0.5);
    lastMatch = found;
    ti = found + 1;
  }
  return score - text.length * 0.1;
}

/**
 * Rank `items` against `query`. An empty query returns everything in
 * declaration order. Matches on label beat matches on hint/keywords.
 */
export function searchItems<T extends Searchable>(
  query: string,
  items: T[],
  limit = 50
): Array<SearchHit<T>> {
  const q = query.trim();
  if (!q) return items.slice(0, limit).map(item => ({ item, score: 0 }));

  const hits: Array<SearchHit<T>> = [];
  for (const item of items) {
    const labelScore = scoreMatch(q, item.label);
    if (labelScore >= 0) {
      hits.push({ item, score: labelScore + 20 });
      continue;
    }
    let best = -1;
    for (const kw of item.keywords || []) {
      best = Math.max(best, scoreMatch(q, kw));
    }
    if (best < 0 && item.hint) best = scoreMatch(q, item.hint) - 20;
    if (best >= 0) hits.push({ item, score: best });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Group ranked hits back into `[{ group, items }]`, groups in first-hit order. */
export function groupHits<T extends Searchable>(
  hits: Array<SearchHit<T>>
): Array<{ group: string; items: T[] }> {
  const out: Array<{ group: string; items: T[] }> = [];
  for (const hit of hits) {
    const group = hit.item.group || '';
    const existing = out.find(g => g.group === group);
    if (existing) existing.items.push(hit.item);
    else out.push({ group, items: [hit.item] });
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}