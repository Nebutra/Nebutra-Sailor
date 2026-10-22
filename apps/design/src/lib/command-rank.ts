export interface CommandEntry {
  href: string;
  label: string;
  /** Section it belongs to, shown as context on the row. */
  group: string;
  /** Extra words that find it without being its name — "install" for Getting started. */
  keywords?: string;
  /** A block inside a page (a showcase demo), not a page: it ranks below pages. */
  demo?: boolean;
  /** A file or another site, opened outside the app router. */
  external?: boolean;
}

/**
 * Subsequence match, scored 0–4, or -1 for no match.
 *
 * A plain `includes` fails "ipmock" → "iPhone Mockup", which is exactly how
 * people type into a palette. Subsequence matching handles that; the score then
 * favours a prefix hit and a tight run of characters.
 */
function score(text: string, query: string): number {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return 0;

  let at = -1;
  let first = -1;
  let last = -1;
  for (const char of needle) {
    at = haystack.indexOf(char, at + 1);
    if (at === -1) return -1;
    if (first === -1) first = at;
    last = at;
  }

  const spread = last - first + 1;
  const tightness = needle.length / spread;
  const early = 1 - first / Math.max(haystack.length, 1);
  const exact = haystack.startsWith(needle) ? 1 : 0;
  return exact * 2 + tightness + early;
}

/**
 * Tiers, highest first, so a weaker kind of match never beats a stronger one:
 *   name contains the query      6–10
 *   keywords contain the query   4–6
 *   name, loose subsequence      3–4
 *   keywords, loose subsequence  0–1
 * "icons" then finds IconBox by its keywords instead of "Notification Message
 * List", where i-c-o-n-s only happens to occur in order.
 */
export function rank(entry: CommandEntry, query: string): number {
  const base = rankText(entry, query);
  // A demo only needs to be findable; it must not outrank the page you meant.
  return base >= 0 && entry.demo ? Math.max(base - DEMO_PENALTY, 0.01) : base;
}

const DEMO_PENALTY = 3;

function rankText(entry: CommandEntry, query: string): number {
  const needle = query.toLowerCase();
  const label = entry.label.toLowerCase();
  if (label.includes(needle)) return 6 + score(entry.label, query);

  const keywords = entry.keywords?.toLowerCase();
  if (keywords?.includes(needle)) return 4 + score(entry.keywords ?? "", query) / 2;

  const byName = score(entry.label, query);
  if (byName >= 0) return 3 + byName / 4;

  const byKeyword = entry.keywords ? score(entry.keywords, query) : -1;
  return byKeyword >= 0 ? byKeyword / 4 : -1;
}
