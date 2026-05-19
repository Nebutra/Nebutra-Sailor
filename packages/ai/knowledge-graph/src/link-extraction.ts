/**
 * Zero-LLM typed entity-edge extractor — the substrate's self-wiring core.
 *
 * ── Mental model ────────────────────────────────────────────────────────────
 * A page is a markdown body + a frontmatter bag. This module reads both and
 * emits a set of typed {@link GraphEdge}s that wire the page into the graph,
 * with NO model call anywhere on the path. Determinism is the headline
 * property: the same inputs always yield byte-identical edges, so the derived
 * graph is rebuildable from disk markdown alone (the package's
 * "markdown is the system of record" invariant).
 *
 * ── Pipeline ────────────────────────────────────────────────────────────────
 *   1. CODE STRIPPING — fenced ``` blocks and inline `code` spans are blanked
 *      first; an entity reference living inside code is text, never a link.
 *   2. REFERENCE PASSES (fixed order, with SPAN MASKING) — every matched span
 *      is overwritten with spaces so a later, looser pass can never re-emit a
 *      span an earlier, stricter pass already claimed:
 *        a. `[[source-id:dir/slug]]`        → resolutionType `qualified`
 *        b. `[[dir/slug|Display]]`          → `unqualified`
 *        c. `[Name](dir/slug)`              → `unqualified`
 *        d. bare `\bdir/slug\b`             → `unqualified`
 *      A reference only becomes a candidate when its `dir` matches the dir
 *      whitelist ({@link DEFAULT_DIR_PATTERN} unless overridden).
 *   3. EDGE-TYPE INFERENCE — fixed precedence, highest wins:
 *
 *        founded > invested_in > advises > works_at > role-prior > mentions
 *
 *      • PER-EDGE: a {@link CONTEXT_WINDOW}-char window centred on the mention
 *        is tested against the four calibrated verb regexes in precedence
 *        order; the first match wins.
 *      • PAGE-ROLE PRIOR: if the per-edge pass falls through to `mentions`
 *        AND the edge is a `people/*` → `companies/*` edge, the WHOLE page is
 *        tested against the role regexes with precedence
 *        investor(invested_in) > advisor(advises) > employee(works_at). This
 *        closes the "partner bio lists a portfolio company without repeating
 *        the verb near each name" gap.
 *      • PAGE-TYPE SHORTCUTS: pageType `meeting` ⇒ `attended`, `image` ⇒
 *        `image_of`, `media` ⇒ `mentions` — applied BEFORE verb inference for
 *        those page types (the page's nature already fixes the relationship).
 *   4. FRONTMATTER → EDGES — {@link FRONTMATTER_LINK_MAP} is a deliberately
 *      FLAT array (single source of truth). `outgoing` means the current page
 *      is the subject of the verb; `incoming` means the frontmatter VALUE is
 *      the subject, so the edge is built reversed.
 *   5. RESOLUTION — every name flows through the injected
 *      {@link EntityResolver}. Resolved ⇒ emit an edge carrying the resolver's
 *      `resolutionType` (the qualified pass overrides it to `qualified`).
 *      Unresolved ⇒ FAIL CLOSED: never write a dead edge — surface the raw
 *      name in `unresolved` (deduped, first-seen order) so the host can act.
 *
 * ── Purity contract ─────────────────────────────────────────────────────────
 * Pure except for the injected resolver: no filesystem, network, clock, or
 * randomness. Inputs (including the frontmatter bag and the default rule
 * bundle) are never mutated; every result is a freshly built array.
 */

import { z } from "zod";
import type {
  EntityResolver,
  GraphEdge,
  LinkType,
  PageId,
  ResolutionType,
  ResolveMode,
} from "./interfaces";

// ─── Calibrated knobs ───────────────────────────────────────────────────────

/** Chars of body, centred on a mention, scanned for a verb cue. */
export const CONTEXT_WINDOW = 240;

/**
 * Default directory-bucket whitelist. A reference is only a graph entity when
 * its `dir` segment matches this. Hosts may pass a narrower/wider pattern via
 * `input.dirPattern`.
 */
export const DEFAULT_DIR_PATTERN = /^(people|companies|funds|meetings|media)$/;

/**
 * The overridable rule bundle: verb cues for per-edge inference plus the
 * coarser page-role priors. Kept as plain readable regexes so a host can
 * shadow any single entry through `input.rules` without forking the module.
 */
export interface ExtractionRules {
  /** Per-edge verb cue: the page subject created the target. */
  readonly FOUNDED_RE: RegExp;
  /** Per-edge verb cue: the page subject put capital into the target. */
  readonly INVESTED_RE: RegExp;
  /** Per-edge verb cue: the page subject advises the target. */
  readonly ADVISES_RE: RegExp;
  /** Per-edge verb cue: the page subject is employed by the target. */
  readonly WORKS_AT_RE: RegExp;
  /** Whole-page prior: subject is an investor (⇒ invested_in). */
  readonly PARTNER_ROLE_RE: RegExp;
  /** Whole-page prior: subject is an advisor (⇒ advises). */
  readonly ADVISOR_ROLE_RE: RegExp;
  /** Whole-page prior: subject is an employee (⇒ works_at). */
  readonly EMPLOYEE_ROLE_RE: RegExp;
  /** The flat frontmatter field → edge map (single source of truth). */
  readonly FRONTMATTER_LINK_MAP: readonly FrontmatterLink[];
}

/**
 * One flat frontmatter rule. `outgoing` ⇒ the current page is the verb
 * subject (edge: page → value). `incoming` ⇒ the value is the verb subject
 * (edge: value → page, i.e. reversed). Duplicate `field`s with different
 * `pageType` filters are intentional and must coexist.
 */
export interface FrontmatterLink {
  readonly field: string;
  readonly linkType: LinkType;
  readonly direction: "outgoing" | "incoming";
  readonly pageType?: string;
  readonly dirHint?: readonly string[];
}

/**
 * Seed frontmatter map. Flat by design: a future `pageType`-scoped duplicate
 * of an existing field can be appended without restructuring.
 */
export const FRONTMATTER_LINK_MAP: readonly FrontmatterLink[] = [
  { field: "company", linkType: "works_at", direction: "outgoing" },
  { field: "key_people", linkType: "works_at", direction: "incoming" },
  {
    field: "investors",
    linkType: "invested_in",
    direction: "incoming",
    dirHint: ["companies", "funds", "people"],
  },
  { field: "attendees", linkType: "attended", direction: "incoming" },
  { field: "founders", linkType: "founded", direction: "incoming" },
  { field: "advisors", linkType: "advises", direction: "incoming" },
];

/** The default, corpus-tuned rule bundle. Frozen — never mutated in place. */
export const DEFAULT_RULES: ExtractionRules = Object.freeze({
  FOUNDED_RE: /\b(founded|co-?founded|started|launched|created|established)\b/i,
  INVESTED_RE:
    /\b(invested in|invests in|backed|funded|led (?:the |a )?(?:seed|round|investment)|wrote (?:a |the )?check|portfolio)\b/i,
  ADVISES_RE: /\b(advis(?:es|ed|ing|or to)|mentors?|on the advisory board|board advisor)\b/i,
  WORKS_AT_RE: /\b(works at|working at|employed (?:at|by)|joined|engineer at|is at|role at)\b/i,
  PARTNER_ROLE_RE:
    /\b(general partner|managing partner|venture partner|limited partner|\bGP\b|\bLP\b|investor|invests?|portfolio)\b/i,
  ADVISOR_ROLE_RE: /\b(advisor|advises|mentor|advisory board)\b/i,
  EMPLOYEE_ROLE_RE: /\b(engineer|developer|designer|manager|employee|staff|works at|works for)\b/i,
  FRONTMATTER_LINK_MAP,
});

// ─── Public input contract ──────────────────────────────────────────────────

const inputSchema = z.object({
  pageId: z.string().trim().min(1, "pageId is required (fail-closed)"),
  body: z.string(),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
  pageType: z.string().optional(),
  dirPattern: z.instanceof(RegExp).optional(),
  mode: z.enum(["batch", "live"]),
});

export interface ExtractLinksInput {
  readonly pageId: PageId;
  readonly body: string;
  readonly frontmatter?: Record<string, unknown>;
  readonly pageType?: string;
  readonly dirPattern?: RegExp;
  readonly resolver: EntityResolver;
  readonly mode: ResolveMode;
  readonly rules?: Partial<ExtractionRules>;
}

export interface ExtractLinksResult {
  readonly edges: GraphEdge[];
  readonly unresolved: string[];
}

export interface ExtractLooseMentionEdgesInput {
  readonly pageId: PageId;
  readonly body: string;
  readonly targetDir?: string;
  readonly stopWords?: readonly string[];
}

// ─── Internal candidate model ───────────────────────────────────────────────

interface Candidate {
  /** Raw `dir/slug` reference text fed to the resolver. */
  readonly ref: string;
  readonly dir: string;
  /** Centre of the matched span in the stripped body (for the context window). */
  readonly at: number;
  readonly qualified: boolean;
}

/** Replace a `[start,end)` slice with spaces, preserving every offset. */
function blank(text: string, start: number, end: number): string {
  return text.slice(0, start) + " ".repeat(end - start) + text.slice(end);
}

/** Strip fenced blocks then inline spans; offsets stay stable (space fill). */
function stripCode(body: string): string {
  let out = body.replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length));
  out = out.replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length));
  return out;
}

const DIR_SLUG = "[A-Za-z0-9._-]+\\/[A-Za-z0-9._-]+";

/**
 * Run the four passes in fixed order over a working copy, masking every
 * claimed span so a looser later pass cannot double-emit it.
 */
function collectCandidates(stripped: string, dirPattern: RegExp): Candidate[] {
  const out: Candidate[] = [];
  let work = stripped;

  const sweep = (re: RegExp, refIdx: number, qualified: boolean): void => {
    re.lastIndex = 0;
    const spans: Array<[number, number]> = [];
    let m: RegExpExecArray | null = re.exec(work);
    while (m !== null) {
      const ref = m[refIdx];
      if (ref !== undefined) {
        const slashAt = ref.indexOf("/");
        const dir = ref.slice(0, slashAt);
        if (dirPattern.test(dir)) {
          out.push({
            ref,
            dir,
            at: m.index + Math.floor(m[0].length / 2),
            qualified,
          });
        }
      }
      spans.push([m.index, m.index + m[0].length]);
      m = re.exec(work);
    }
    for (let i = spans.length - 1; i >= 0; i--) {
      const span = spans[i];
      if (span !== undefined) work = blank(work, span[0], span[1]);
    }
  };

  // a. source-qualified wikilink: [[source-id:dir/slug]]
  sweep(new RegExp(`\\[\\[[A-Za-z0-9._-]+:(${DIR_SLUG})\\]\\]`, "g"), 1, true);
  // b. wikilink with optional display: [[dir/slug|Display]]
  sweep(new RegExp(`\\[\\[(${DIR_SLUG})(?:\\|[^\\]]*)?\\]\\]`, "g"), 1, false);
  // c. markdown link: [Name](dir/slug)
  sweep(new RegExp(`\\[[^\\]]*\\]\\((${DIR_SLUG})\\)`, "g"), 1, false);
  // d. bare slug: \bdir/slug\b
  sweep(new RegExp(`(?<![\\w/])(${DIR_SLUG})(?![\\w/])`, "g"), 1, false);

  return out;
}

/**
 * The sentence that physically contains offset `at` in `text`. Sentence
 * boundaries are `.!?` and hard newlines. Verb inference is sentence-scoped
 * on purpose: a verb describing the page subject's ROLE in a prior sentence
 * ("a General Partner who also advises…") must not be misread as a transitive
 * edge verb governing a link introduced later by a neutral connector
 * ("…Portfolio: [[x]]"). The wide context window is still captured on the
 * edge — only the verb decision is clause-local.
 */
function sentenceAround(text: string, at: number): string {
  let start = 0;
  for (let i = at - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      start = i + 1;
      break;
    }
  }
  let end = text.length;
  for (let i = at; i < text.length; i++) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      end = i + 1;
      break;
    }
  }
  return text.slice(start, end);
}

/** First verb match by fixed precedence; `mentions` if none fires. */
function inferFromWindow(window: string, rules: ExtractionRules): LinkType {
  if (rules.FOUNDED_RE.test(window)) return "founded";
  if (rules.INVESTED_RE.test(window)) return "invested_in";
  if (rules.ADVISES_RE.test(window)) return "advises";
  if (rules.WORKS_AT_RE.test(window)) return "works_at";
  return "mentions";
}

/** Whole-page role prior; precedence investor > advisor > employee. */
function inferFromRole(page: string, rules: ExtractionRules): LinkType | undefined {
  if (rules.PARTNER_ROLE_RE.test(page)) return "invested_in";
  if (rules.ADVISOR_ROLE_RE.test(page)) return "advises";
  if (rules.EMPLOYEE_ROLE_RE.test(page)) return "works_at";
  return undefined;
}

const PAGE_TYPE_SHORTCUT: Record<string, LinkType> = {
  meeting: "attended",
  image: "image_of",
  media: "mentions",
};

/** Coerce a frontmatter value into the list of reference strings it carries. */
function frontmatterRefs(value: unknown): string[] {
  if (typeof value === "string") return value.trim() === "" ? [] : [value];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  }
  return [];
}

const DEFAULT_LOOSE_MENTION_STOP_WORDS = new Set([
  "A",
  "An",
  "And",
  "For",
  "In",
  "No",
  "That",
  "The",
  "This",
  "To",
  "With",
]);

function looseMentionSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Deterministic, low-confidence fallback for product layers that need a
 * browseable graph before an LLM/entity resolver is configured. Explicit
 * references still belong to {@link extractLinks}; this only turns unlinked
 * capitalized prose mentions into `mentions` edges under a caller-chosen dir.
 */
export function extractLooseMentionEdges(
  input: ExtractLooseMentionEdgesInput,
): readonly GraphEdge[] {
  const stripped = stripCode(input.body);
  const targetDir = input.targetDir ?? "topics";
  const stopWords = new Set([...DEFAULT_LOOSE_MENTION_STOP_WORDS, ...(input.stopWords ?? [])]);
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const match of stripped.matchAll(/\b[A-Z][a-zA-Z0-9_-]{2,}\b/g)) {
    const name = match[0];
    if (stopWords.has(name)) continue;
    const slug = looseMentionSlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const at = match.index + Math.floor(name.length / 2);
    const start = Math.max(0, at - Math.floor(CONTEXT_WINDOW / 2));
    const end = Math.min(stripped.length, at + Math.floor(CONTEXT_WINDOW / 2));

    edges.push({
      fromPageId: input.pageId,
      toPageId: `${targetDir}/${slug}`,
      linkType: "mentions",
      context: stripped.slice(start, end),
      linkSource: "markdown",
      originPageId: input.pageId,
      originField: undefined,
      resolutionType: "unqualified",
    });
  }

  return edges;
}

/**
 * Extract every typed edge a page authors via its body and frontmatter,
 * deterministically and without any model call. Unresolved references are
 * surfaced, never written as dead edges.
 */
export async function extractLinks(input: ExtractLinksInput): Promise<ExtractLinksResult> {
  const parsed = inputSchema.parse({
    pageId: input.pageId,
    body: input.body,
    frontmatter: input.frontmatter,
    pageType: input.pageType,
    dirPattern: input.dirPattern,
    mode: input.mode,
  });

  const rules: ExtractionRules = { ...DEFAULT_RULES, ...input.rules };
  const dirPattern = input.dirPattern ?? DEFAULT_DIR_PATTERN;
  const { resolver } = input;
  const { pageId, body, frontmatter, pageType, mode } = parsed;

  const edges: GraphEdge[] = [];
  const unresolved: string[] = [];
  const seenUnresolved = new Set<string>();

  const surface = (name: string): void => {
    if (!seenUnresolved.has(name)) {
      seenUnresolved.add(name);
      unresolved.push(name);
    }
  };

  const pageIsPeople = pageId.startsWith("people/");
  const shortcut = pageType !== undefined ? PAGE_TYPE_SHORTCUT[pageType] : undefined;

  // ── Body pass ──────────────────────────────────────────────────────────────
  const stripped = stripCode(body);
  const candidates = collectCandidates(stripped, dirPattern);

  for (const cand of candidates) {
    const resolved = await resolver.resolve(cand.ref, { mode });
    if (resolved === undefined) {
      surface(cand.ref);
      continue;
    }

    const start = Math.max(0, cand.at - Math.floor(CONTEXT_WINDOW / 2));
    const end = Math.min(stripped.length, cand.at + Math.floor(CONTEXT_WINDOW / 2));
    const window = stripped.slice(start, end);

    let linkType: LinkType;
    if (shortcut !== undefined) {
      linkType = shortcut;
    } else {
      linkType = inferFromWindow(sentenceAround(stripped, cand.at), rules);
      if (linkType === "mentions" && pageIsPeople && cand.dir === "companies") {
        const roleType = inferFromRole(stripped, rules);
        if (roleType !== undefined) linkType = roleType;
      }
    }

    const resolutionType: ResolutionType = cand.qualified ? "qualified" : resolved.resolutionType;

    edges.push({
      fromPageId: pageId,
      toPageId: resolved.pageId,
      linkType,
      context: window,
      linkSource: "markdown",
      originPageId: pageId,
      originField: undefined,
      resolutionType,
    });
  }

  // ── Frontmatter pass ───────────────────────────────────────────────────────
  for (const rule of rules.FRONTMATTER_LINK_MAP) {
    if (rule.pageType !== undefined && rule.pageType !== pageType) continue;
    if (!Object.hasOwn(frontmatter, rule.field)) continue;

    const refs = frontmatterRefs(frontmatter[rule.field]);
    for (const ref of refs) {
      const resolved = await resolver.resolve(ref, {
        dirHint: rule.dirHint,
        mode,
      });
      if (resolved === undefined) {
        surface(ref);
        continue;
      }

      const fromPageId = rule.direction === "incoming" ? resolved.pageId : pageId;
      const toPageId = rule.direction === "incoming" ? pageId : resolved.pageId;

      edges.push({
        fromPageId,
        toPageId,
        linkType: rule.linkType,
        context: undefined,
        linkSource: "frontmatter",
        originPageId: pageId,
        originField: rule.field,
        resolutionType: resolved.resolutionType,
      });
    }
  }

  return { edges, unresolved };
}
