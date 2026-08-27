/**
 * fuzzy-match — pure, deterministic string-matching primitives.
 *
 * A dependency-free re-expression of the classic "smart-case fuzzy +
 * glob-wildcard" matcher found in modern terminals and command palettes.
 * Everything here is a small pure function: no I/O, no shared state, no
 * mutation of inputs, no `console`.
 *
 * Surface:
 *   - matchIndices                              smart-case subsequence match
 *   - matchIndicesCaseInsensitive               always case-insensitive
 *   - matchIndicesCaseInsensitiveIgnoreSpaces   ci + spaces ignored
 *   - matchWildcardPattern                      glob (* ? [..] \) full-string
 *   - matchWildcardPatternCaseInsensitive       glob, case-insensitive
 *   - rankByFuzzy                               generic rank/filter/sort helper
 *
 * --------------------------------------------------------------------------
 * Subsequence scoring heuristic (deterministic; only ORDERING is contractual)
 * --------------------------------------------------------------------------
 * Every char of `query` must appear in `text` in order. Among the many
 * possible subsequences we use a single forward greedy scan with a fixed,
 * documented tie-break so the result is fully deterministic:
 *
 *   For each query char, scan `text` forward from the previous match + 1 and
 *   collect every candidate position. Pick the candidate that maximises a
 *   per-char local score:
 *
 *     + WORD_BOUNDARY_BONUS  if the candidate is at text start, or the
 *                            preceding char is a separator (`/ _ - . space`)
 *                            or a lower→upper camelCase hump.
 *     + CONTIGUOUS_BONUS     if the candidate immediately follows the
 *                            previous matched index (a run).
 *     - GAP_PENALTY * gap    distance skipped since the previous match.
 *     - LEADING_PENALTY      (first query char only) * its absolute index,
 *                            so earlier overall placement is preferred.
 *
 *   Ties on local score break toward the EARLIEST candidate index — this is
 *   what makes the scan deterministic and is exercised by the tests.
 *
 * The aggregate `score` is the sum of per-char local scores. Higher is a
 * better match. Magnitudes are intentionally unspecified; only the relative
 * ordering (boundary/contiguous/at-start outranks scattered/buried/late) is
 * part of the contract.
 *
 * Empty query: defined to match everything with `score === 0` and
 * `indices === []`. Empty text with a non-empty query: `null`.
 */

const SEPARATORS = new Set(["/", "_", "-", ".", " "]);

const WORD_BOUNDARY_BONUS = 16;
const CONTIGUOUS_BONUS = 12;
const STRING_START_BONUS = 8;
const GAP_PENALTY = 1;
const LEADING_PENALTY = 2;

/** A successful match: the chosen text positions and an aggregate score. */
export interface FuzzyMatch {
  readonly score: number;
  readonly indices: readonly number[];
}

interface MatchOptions {
  /** Force case-insensitive matching regardless of query casing. */
  readonly forceCaseInsensitive?: boolean | undefined;
}

function hasUpperCase(value: string): boolean {
  return value !== value.toLowerCase();
}

function isSeparator(ch: string | undefined): boolean {
  return ch !== undefined && SEPARATORS.has(ch);
}

/**
 * True when `text[index]` sits at a "word boundary": string start, right
 * after a separator, or a lower→upper camelCase hump.
 */
function isBoundary(text: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  const prev = text[index - 1];
  if (isSeparator(prev)) {
    return true;
  }
  const cur = text[index];
  if (prev !== undefined && cur !== undefined) {
    const prevLower = prev === prev.toLowerCase() && prev !== prev.toUpperCase();
    const curUpper = cur === cur.toUpperCase() && cur !== cur.toLowerCase();
    if (prevLower && curUpper) {
      return true;
    }
  }
  return false;
}

/**
 * Core greedy subsequence scan.
 *
 * @param text     the haystack
 * @param query    the needle
 * @param caseInsensitive  compare lower-cased chars
 * @param skipChar optional predicate: text chars for which this returns true
 *                 are skipped for *matching* but their original index is never
 *                 emitted (used by the ignore-spaces variant). Query chars for
 *                 which it returns true are dropped before scanning.
 */
function scan(
  text: string,
  query: string,
  caseInsensitive: boolean,
  skipChar?: (ch: string) => boolean,
): FuzzyMatch | null {
  // Drop skipped chars from the query (e.g. spaces) up front.
  const effectiveQuery = skipChar
    ? Array.from(query)
        .filter((c) => !skipChar(c))
        .join("")
    : query;

  if (effectiveQuery.length === 0) {
    return { score: 0, indices: [] };
  }
  if (text.length === 0) {
    return null;
  }

  const fold = (c: string): string => (caseInsensitive ? c.toLowerCase() : c);

  const indices: number[] = [];
  let score = 0;
  let searchFrom = 0;
  let prevMatched = -1;

  for (let q = 0; q < effectiveQuery.length; q++) {
    const target = fold(effectiveQuery[q]!);

    let bestIndex = -1;
    let bestLocal = Number.NEGATIVE_INFINITY;

    for (let t = searchFrom; t < text.length; t++) {
      const tch = text[t]!;
      if (skipChar && skipChar(tch)) {
        continue;
      }
      if (fold(tch) !== target) {
        continue;
      }

      let local = 0;
      if (isBoundary(text, t)) {
        local += WORD_BOUNDARY_BONUS;
      }
      if (t === 0) {
        local += STRING_START_BONUS;
      }
      if (prevMatched >= 0 && t === prevMatched + 1) {
        local += CONTIGUOUS_BONUS;
      }
      const gap = prevMatched >= 0 ? t - prevMatched - 1 : 0;
      local -= GAP_PENALTY * gap;
      if (q === 0) {
        local -= LEADING_PENALTY * t;
      }

      // Deterministic tie-break: strictly-greater wins, so the EARLIEST
      // candidate is retained on ties.
      if (local > bestLocal) {
        bestLocal = local;
        bestIndex = t;
      }
    }

    if (bestIndex === -1) {
      return null;
    }

    indices.push(bestIndex);
    score += bestLocal;
    prevMatched = bestIndex;
    searchFrom = bestIndex + 1;
  }

  return { score, indices };
}

/**
 * Smart-case subsequence fuzzy match.
 *
 * If `query` is all-lowercase the match is case-insensitive; if it contains
 * any uppercase char the *whole* query matches case-sensitively. Returns the
 * chosen 0-based `indices` in `text` plus an aggregate `score`, or `null` if
 * `query` is not a subsequence of `text`.
 */
export function matchIndices(
  text: string,
  query: string,
  options: MatchOptions = {},
): FuzzyMatch | null {
  const caseInsensitive = options.forceCaseInsensitive === true || !hasUpperCase(query);
  return scan(text, query, caseInsensitive);
}

/** Like {@link matchIndices} but always case-insensitive. */
export function matchIndicesCaseInsensitive(text: string, query: string): FuzzyMatch | null {
  return scan(text, query, true);
}

/**
 * Case-insensitive subsequence match where spaces in BOTH `query` and `text`
 * are ignored for matching. Returned `indices` always point at original
 * `text` positions and never land on a skipped space.
 */
export function matchIndicesCaseInsensitiveIgnoreSpaces(
  text: string,
  query: string,
): FuzzyMatch | null {
  return scan(text, query, true, (c) => c === " ");
}

// ---------------------------------------------------------------------------
// Wildcard / glob matcher
// ---------------------------------------------------------------------------

type GlobToken =
  | { readonly kind: "literal"; readonly ch: string }
  | { readonly kind: "any" } // *
  | { readonly kind: "single" } // ?
  | {
      readonly kind: "class";
      readonly negated: boolean;
      readonly ranges: ReadonlyArray<readonly [number, number]>;
    };

/**
 * Compile a glob pattern into a token stream. Supports:
 *   `*`  any run (including empty)
 *   `?`  exactly one char
 *   `[..]` / `[a-z]` / `[!..]` char class (negation via leading `!` or `^`)
 *   `\x` escape — next char is literal
 * `/` is an ordinary literal (path-friendly). Unterminated `[` is treated as
 * a literal `[`.
 */
function compileGlob(pattern: string): readonly GlobToken[] {
  const tokens: GlobToken[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === "\\") {
      const next = pattern[i + 1];
      if (next !== undefined) {
        tokens.push({ kind: "literal", ch: next });
        i += 2;
        continue;
      }
      tokens.push({ kind: "literal", ch: "\\" });
      i += 1;
      continue;
    }
    if (ch === "*") {
      tokens.push({ kind: "any" });
      i += 1;
      continue;
    }
    if (ch === "?") {
      tokens.push({ kind: "single" });
      i += 1;
      continue;
    }
    if (ch === "[") {
      const close = pattern.indexOf("]", i + 1);
      if (close === -1) {
        tokens.push({ kind: "literal", ch: "[" });
        i += 1;
        continue;
      }
      let body = pattern.slice(i + 1, close);
      let negated = false;
      if (body.startsWith("!") || body.startsWith("^")) {
        negated = true;
        body = body.slice(1);
      }
      const ranges: Array<readonly [number, number]> = [];
      let b = 0;
      while (b < body.length) {
        const c0 = body[b]!;
        if (body[b + 1] === "-" && b + 2 < body.length) {
          const c1 = body[b + 2]!;
          ranges.push([c0.charCodeAt(0), c1.charCodeAt(0)]);
          b += 3;
        } else {
          ranges.push([c0.charCodeAt(0), c0.charCodeAt(0)]);
          b += 1;
        }
      }
      tokens.push({ kind: "class", negated, ranges });
      i = close + 1;
      continue;
    }
    tokens.push({ kind: "literal", ch });
    i += 1;
  }
  return tokens;
}

function classMatches(token: Extract<GlobToken, { kind: "class" }>, code: number): boolean {
  let inRange = false;
  for (const [lo, hi] of token.ranges) {
    if (code >= lo && code <= hi) {
      inRange = true;
      break;
    }
  }
  return token.negated ? !inRange : inRange;
}

/**
 * Linear-time anchored glob match (no RegExp, no catastrophic backtracking).
 *
 * Classic two-pointer wildcard algorithm: on a `*` we record a backtrack
 * point and greedily advance; on any later mismatch we resume the last `*`
 * one char further. This is O(text * pattern) worst case — adversarial
 * `***...*b` inputs stay fast.
 */
function globMatch(text: string, tokens: readonly GlobToken[], caseInsensitive: boolean): boolean {
  const fold = (c: string): string => (caseInsensitive ? c.toLowerCase() : c);

  let ti = 0; // text index
  let pi = 0; // pattern (token) index
  let starPi = -1; // last '*' token index
  let starTi = 0; // text index when last '*' was seen

  while (ti < text.length) {
    const tok = tokens[pi];
    if (tok !== undefined && tok.kind === "any") {
      starPi = pi;
      starTi = ti;
      pi += 1;
      continue;
    }
    if (tok !== undefined && tok.kind === "single") {
      pi += 1;
      ti += 1;
      continue;
    }
    if (tok !== undefined && tok.kind === "literal") {
      if (fold(text[ti]!) === fold(tok.ch)) {
        pi += 1;
        ti += 1;
        continue;
      }
    } else if (tok !== undefined && tok.kind === "class") {
      const ch = caseInsensitive ? text[ti]!.toLowerCase() : text[ti]!;
      // For case-insensitive class matching, test both casings.
      const matched = caseInsensitive
        ? classMatches(tok, ch.charCodeAt(0)) ||
          classMatches(tok, text[ti]!.toUpperCase().charCodeAt(0))
        : classMatches(tok, ch.charCodeAt(0));
      if (matched) {
        pi += 1;
        ti += 1;
        continue;
      }
    }

    // Mismatch: resume from the last '*' if any.
    if (starPi !== -1) {
      pi = starPi + 1;
      starTi += 1;
      ti = starTi;
      continue;
    }
    return false;
  }

  // Consume any trailing '*' tokens.
  while (pi < tokens.length && tokens[pi]!.kind === "any") {
    pi += 1;
  }
  return pi === tokens.length;
}

/**
 * Anchored (full-string) glob match. `*` = any run incl. empty, `?` = one
 * char, `[..]`/`[a-z]`/`[!..]` char classes, `\` escapes a metachar. `/` is
 * an ordinary char. Case-sensitive.
 */
export function matchWildcardPattern(text: string, pattern: string): boolean {
  return globMatch(text, compileGlob(pattern), false);
}

/** Case-insensitive variant of {@link matchWildcardPattern}. */
export function matchWildcardPatternCaseInsensitive(text: string, pattern: string): boolean {
  return globMatch(text, compileGlob(pattern), true);
}

// ---------------------------------------------------------------------------
// Ranking helper
// ---------------------------------------------------------------------------

/** One ranked result: the original item plus its match score and indices. */
export interface RankedFuzzyResult<T> {
  readonly item: T;
  readonly score: number;
  readonly indices: readonly number[];
}

interface RankByFuzzyOptions {
  /** Force case-insensitive matching regardless of query casing. */
  readonly caseInsensitive?: boolean | undefined;
}

/**
 * Rank `items` by fuzzy-matching `key(item)` against `query`.
 *
 * - Non-matches are filtered out.
 * - Sorted by `score` descending.
 * - Stable for equal scores (input order preserved).
 * - Pure: neither `items` nor its elements are mutated.
 * - Empty query → every item with `score 0` / empty `indices`, input order.
 */
export function rankByFuzzy<T>(
  items: readonly T[],
  query: string,
  key: (item: T) => string,
  options: RankByFuzzyOptions = {},
): ReadonlyArray<RankedFuzzyResult<T>> {
  const forceCaseInsensitive = options.caseInsensitive === true;

  const ranked: Array<RankedFuzzyResult<T> & { readonly order: number }> = [];
  items.forEach((item, order) => {
    const match = matchIndices(key(item), query, { forceCaseInsensitive });
    if (match !== null) {
      ranked.push({ item, score: match.score, indices: match.indices, order });
    }
  });

  // Stable sort: score desc, original order asc for ties.
  ranked.sort((a, b) => b.score - a.score || a.order - b.order);

  return ranked.map(({ item, score, indices }) => ({ item, score, indices }));
}
