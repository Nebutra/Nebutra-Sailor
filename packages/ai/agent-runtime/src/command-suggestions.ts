/**
 * command-suggestions — pure, deterministic ranked input-suggestion model.
 *
 * A dependency-free re-expression of the ranked command/input suggestion
 * engine found in modern terminals and command palettes. The fuzzy matcher
 * itself lives elsewhere; this module never imports it — callers wire a real
 * matcher through the injected {@link FuzzyMatchFn} port (tests pass a
 * deterministic fake).
 *
 * Invariants:
 *   - Pure functions: no I/O, no shared state, no input mutation, no console.
 *   - Match banding is contractual: exact > prefix > fuzzy, regardless of the
 *     fuzzy matcher's score magnitude.
 *   - Tenancy is structural and fails closed: every history operation requires
 *     a non-empty tenantId (Zod-validated) and is keyed per tenant, so
 *     cross-tenant reads are impossible by construction.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types (faithful, neutral)
// ---------------------------------------------------------------------------

export type SuggestionType = "history" | "workflow" | "completion" | "ai";

export type MatchType = "exact" | "prefix" | "fuzzy" | "none";

export interface SuggestionItem {
  readonly id: string;
  readonly text: string;
  readonly type: SuggestionType;
  readonly isHistory: boolean;
  readonly detail?: string | undefined;
}

export interface RankedSuggestion {
  readonly item: SuggestionItem;
  readonly score: number;
  readonly matchType: MatchType;
  readonly matchIndices: number[];
}

export interface SuggestionResults {
  readonly query: string;
  readonly results: RankedSuggestion[];
}

export interface RankOptions {
  readonly limit?: number | undefined;
}

/**
 * Injected fuzzy-match port. The real matcher is wired by the caller; this
 * module declares only the shape it consumes. A `null` return means "no match".
 */
export type FuzzyMatchFn = (
  text: string,
  query: string,
) => { score: number; indices: number[] } | null;

export interface MatchClassification {
  readonly matchType: MatchType;
  readonly score: number;
  readonly indices: number[];
}

// ---------------------------------------------------------------------------
// Score bands — exact > prefix > fuzzy, independent of fuzzy magnitude
// ---------------------------------------------------------------------------

/**
 * Fuzzy scores share the lowest band. Prefix and exact are pinned ABOVE any
 * representable fuzzy score so banding is a total order regardless of what the
 * injected matcher returns.
 */
const FUZZY_CEILING = Number.MAX_SAFE_INTEGER / 4;
const PREFIX_SCORE = FUZZY_CEILING * 2;
const EXACT_SCORE = FUZZY_CEILING * 3;

const DEFAULT_LIMIT = 50;
const DEFAULT_HISTORY_CAP = 500;

// ---------------------------------------------------------------------------
// Boundary validation (fail-closed tenancy)
// ---------------------------------------------------------------------------

const TenantSchema = z
  .string()
  .refine((v) => v.trim() !== "", "tenantId is required (fail-closed)");

function assertTenant(tenantId: unknown): string {
  const parsed = TenantSchema.safeParse(tenantId);
  if (!parsed.success) {
    throw new Error("tenantId is required (fail-closed)");
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// classifyMatch
// ---------------------------------------------------------------------------

function fullSpan(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

/**
 * Classify how `query` matches `text`. Exact (case-insensitive full equality)
 * outranks prefix (case-insensitive starts-with) outranks the injected fuzzy
 * matcher. An empty query is inert: `none`, score 0, no indices.
 */
export function classifyMatch(
  text: string,
  query: string,
  fuzzy: FuzzyMatchFn,
): MatchClassification {
  if (query === "") {
    return { matchType: "none", score: 0, indices: [] };
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText === lowerQuery) {
    return {
      matchType: "exact",
      score: EXACT_SCORE,
      indices: fullSpan(text.length),
    };
  }

  if (lowerText.startsWith(lowerQuery)) {
    return {
      matchType: "prefix",
      score: PREFIX_SCORE,
      indices: fullSpan(query.length),
    };
  }

  const fuzzyResult = fuzzy(text, query);
  if (fuzzyResult === null) {
    return { matchType: "none", score: 0, indices: [] };
  }

  return {
    matchType: "fuzzy",
    // Clamp into the fuzzy band so an overzealous matcher can never reach the
    // prefix/exact bands.
    score: Math.min(fuzzyResult.score, FUZZY_CEILING),
    indices: [...fuzzyResult.indices],
  };
}

// ---------------------------------------------------------------------------
// rankSuggestions
// ---------------------------------------------------------------------------

interface ScoredEntry {
  readonly ranked: RankedSuggestion;
  readonly order: number;
}

/**
 * Compare two scored entries. Returns negative when `a` should rank first.
 * Order: score desc → history-first on tie → shorter text → stable input order.
 */
function compareEntries(a: ScoredEntry, b: ScoredEntry): number {
  if (a.ranked.score !== b.ranked.score) {
    return b.ranked.score - a.ranked.score;
  }
  const aHist = a.ranked.item.isHistory ? 1 : 0;
  const bHist = b.ranked.item.isHistory ? 1 : 0;
  if (aHist !== bHist) {
    return bHist - aHist;
  }
  const aLen = a.ranked.item.text.length;
  const bLen = b.ranked.item.text.length;
  if (aLen !== bLen) {
    return aLen - bLen;
  }
  return a.order - b.order;
}

/**
 * Rank `candidates` against `query` for one tenant. Fails closed on an empty
 * tenant. With a non-empty query, `none` matches are dropped; with an empty
 * query every candidate is kept (inert match) and ordered purely by the
 * tie-breakers. Never mutates `candidates`.
 */
export function rankSuggestions(
  tenantId: string,
  query: string,
  candidates: readonly SuggestionItem[],
  fuzzy: FuzzyMatchFn,
  opts?: RankOptions,
): SuggestionResults {
  assertTenant(tenantId);

  const limit = opts?.limit !== undefined && opts.limit >= 0 ? opts.limit : DEFAULT_LIMIT;
  const keepNone = query === "";

  const scored: ScoredEntry[] = [];
  candidates.forEach((item, order) => {
    const c = classifyMatch(item.text, query, fuzzy);
    if (c.matchType === "none" && !keepNone) {
      return;
    }
    scored.push({
      ranked: {
        item,
        score: c.score,
        matchType: c.matchType,
        matchIndices: [...c.indices],
      },
      order,
    });
  });

  const sorted = [...scored].sort(compareEntries);
  const results = sorted.slice(0, limit).map((e) => e.ranked);

  return { query, results };
}

// ---------------------------------------------------------------------------
// dedupeByText
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Keep one item per normalized (trimmed, case-insensitive) text. First
 * occurrence wins, EXCEPT a history item supersedes an earlier non-history
 * item that shares the same normalized text. Stable otherwise. Pure.
 */
export function dedupeByText(candidates: readonly SuggestionItem[]): SuggestionItem[] {
  const order: string[] = [];
  const chosen = new Map<string, SuggestionItem>();

  for (const item of candidates) {
    const key = normalizeText(item.text);
    const existing = chosen.get(key);
    if (existing === undefined) {
      chosen.set(key, item);
      order.push(key);
      continue;
    }
    if (!existing.isHistory && item.isHistory) {
      // History wins even when it appears later; keep the original slot.
      chosen.set(key, item);
    }
  }

  return order.map((key) => {
    const value = chosen.get(key);
    if (value === undefined) {
      throw new Error("dedupeByText: invariant violated (missing key)");
    }
    return value;
  });
}

// ---------------------------------------------------------------------------
// Tenant-scoped history store
// ---------------------------------------------------------------------------

/**
 * Tenant-scoped append-with-dedupe history seam. Implementations MUST key by
 * tenant so cross-tenant reads are impossible, MUST keep entries
 * most-recent-first, and MUST bound storage to a ring cap.
 */
export interface SuggestionHistoryStore {
  /** Append `text` for `tenantId`, deduped, most-recent-first, ring-bounded. */
  append(tenantId: string, text: string): void;
  /** Most-recent-first texts for `tenantId`. */
  list(tenantId: string): string[];
}

/**
 * In-memory reference implementation mirroring this package's other stores.
 * Tenancy is structural: `tenantId` is part of the key AND validated on every
 * read/write, so a tenant can never observe another tenant's history.
 */
export class InMemorySuggestionHistoryStore implements SuggestionHistoryStore {
  readonly #cap: number;
  readonly #byTenant = new Map<string, string[]>();

  constructor(cap: number = DEFAULT_HISTORY_CAP) {
    this.#cap = cap > 0 ? cap : DEFAULT_HISTORY_CAP;
  }

  append(tenantId: string, text: string): void {
    const tenant = assertTenant(tenantId);
    const trimmed = text.trim();
    if (trimmed === "") {
      return;
    }
    const prior = this.#byTenant.get(tenant) ?? [];
    const deduped = prior.filter((t) => t !== trimmed);
    const next = [trimmed, ...deduped].slice(0, this.#cap);
    this.#byTenant.set(tenant, next);
  }

  list(tenantId: string): string[] {
    const tenant = assertTenant(tenantId);
    return [...(this.#byTenant.get(tenant) ?? [])];
  }
}

/**
 * Record `text` into the tenant's suggestion history. Fails closed on an empty
 * tenant; blank text is ignored.
 */
export function recordHistory(store: SuggestionHistoryStore, tenantId: string, text: string): void {
  assertTenant(tenantId);
  store.append(tenantId, text);
}

/**
 * Read the tenant's history as ranked-ready {@link SuggestionItem}s
 * (most-recent-first, flagged `isHistory`). Fails closed on an empty tenant.
 */
export function historyCandidates(
  store: SuggestionHistoryStore,
  tenantId: string,
): SuggestionItem[] {
  assertTenant(tenantId);
  return store.list(tenantId).map((text, index) => ({
    id: `history:${index}:${text}`,
    text,
    type: "history" as const,
    isHistory: true,
    detail: undefined,
  }));
}
