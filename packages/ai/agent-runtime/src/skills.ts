/**
 * Skills system (WRAP — progressive-disclosure capability).
 *
 * Faithful re-expression of the source harness's two-phase skill model:
 *
 *   Phase 1 — Listing (cheap, always in context): a budget-bounded catalog
 *     exposing only {name, description, whenToUse} per skill. First-party
 *     skills (bundled/builtin tier) are never truncated and never dropped;
 *     lower-tier skills degrade to names-only, then drop, as the context
 *     budget is exhausted. Path-activated skills stay hidden until a touched
 *     file matches one of their globs.
 *
 *   Phase 2 — Invocation (lazy, on demand): expand the chosen skill's body
 *     into turn messages, with arg/var substitution and a merged tool
 *     allowlist contributed to the permission context.
 *
 * A skill IS a `Definition` — the same tenant-scoped layered resolver backs
 * the command registry and the subagent registry (see ./definitions).
 *
 * SECURITY: this re-expression intentionally drops the source's body-side
 * command-substitution (the upstream "!`…`" inline-shell facility). Skill
 * bodies are inert text; they NEVER trigger host shell execution here. All
 * entry points require a non-empty `tenantId` and fail closed; cross-tenant
 * inputs are rejected by the underlying `DefinitionResolver`. Pure data/logic
 * — no host filesystem access (resource base is an injected indirection).
 */

import { z } from "zod";
import {
  type Definition,
  type DefinitionResolver,
  type ResolveContext,
  substituteArguments,
} from "./definitions.js";

/** A skill is just a resolvable `Definition`. */
export type SkillRecord = Definition;

/** Tiers treated as first-party (never truncated, never dropped). */
const FIRST_PARTY_TIERS: ReadonlySet<string> = new Set(["bundled", "builtin"]);

const isFirstParty = (s: SkillRecord): boolean => FIRST_PARTY_TIERS.has(s.sourceTier);

// ── Phase 1: listing ─────────────────────────────────────────────────────────

/** One catalog entry — only the cheap, always-in-context surface. */
export interface SkillListingEntry {
  readonly name: string;
  readonly description: string;
  readonly whenToUse?: string | undefined;
  /** True when this entry was degraded to names-only by the budget. */
  readonly degraded: boolean;
  readonly firstParty: boolean;
}

export interface SkillListing {
  readonly entries: readonly SkillListingEntry[];
  readonly text: string;
}

const listingOptionsSchema = z.object({
  maxListingDescChars: z.number().int().positive().default(250),
  contextWindowTokens: z.number().int().positive().default(200_000),
  budgetPercent: z.number().positive().max(1).default(0.01),
  touchedPaths: z.array(z.string()).default([]),
});
export type SkillListingOptions = z.input<typeof listingOptionsSchema>;

/** Cheap, deterministic token estimate (≈4 chars/token). */
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Minimal glob: `**` = any chars, `*` = any chars except `/`, else exact. */
function globToRegExp(glob: string): RegExp {
  let out = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*") {
      if (glob[i + 1] === "*") {
        out += ".*";
        i++;
      } else {
        out += "[^/]*";
      }
    } else if (".+?^${}()|[]\\".includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(`${out}$`);
}

const pathMatches = (globs: readonly string[], touched: readonly string[]): boolean =>
  globs.some((g) => {
    const re = globToRegExp(g);
    return touched.some((p) => re.test(p));
  });

/** Stable order: first-party first, then by slug — deterministic output. */
function orderSkills(skills: readonly SkillRecord[]): SkillRecord[] {
  return [...skills].sort((a, b) => {
    const fa = isFirstParty(a) ? 0 : 1;
    const fb = isFirstParty(b) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return a.slug.localeCompare(b.slug);
  });
}

const truncate = (s: string, max: number): string => (s.length <= max ? s : s.slice(0, max));

function renderEntry(e: SkillListingEntry): string {
  const head = e.whenToUse ? `- ${e.name} — ${e.whenToUse}` : `- ${e.name}`;
  return e.description ? `${head}\n  ${e.description}` : head;
}

/**
 * Phase 1 — build the always-in-context skill catalog. Pure & deterministic.
 *
 * Budget = `contextWindowTokens * budgetPercent`. First-party skills are
 * emitted in full and do NOT consume budget against being dropped. Each
 * remaining skill is tried at full description; if it would overflow it is
 * degraded to names-only; if even that overflows it is dropped. Skills in
 * `ctx.loadedSlugs` and unactivated path-gated skills are suppressed.
 */
export function buildSkillListing(
  resolver: DefinitionResolver<SkillRecord>,
  ctx: ResolveContext,
  options: SkillListingOptions = {},
): SkillListing {
  if (!ctx.tenantId) throw new Error("buildSkillListing: tenantId is required");
  const opts = listingOptionsSchema.parse(options);

  const loaded = ctx.loadedSlugs ?? new Set<string>();
  const visible = resolver
    .resolve(ctx)
    .filter((s) => !loaded.has(s.slug))
    .filter((s) => {
      const paths = s.frontmatter.paths;
      return paths.length === 0 || pathMatches(paths, opts.touchedPaths);
    });

  const budget = Math.max(1, Math.floor(opts.contextWindowTokens * opts.budgetPercent));

  const entries: SkillListingEntry[] = [];
  let used = 0;

  for (const s of orderSkills(visible)) {
    const fp = isFirstParty(s);
    const fm = s.frontmatter;
    const fullDesc = fp ? fm.description : truncate(fm.description, opts.maxListingDescChars);

    if (fp) {
      const entry: SkillListingEntry = {
        name: fm.name,
        description: fm.description,
        whenToUse: fm.whenToUse,
        degraded: false,
        firstParty: true,
      };
      entries.push(entry);
      used += estimateTokens(renderEntry(entry));
      continue;
    }

    const full: SkillListingEntry = {
      name: fm.name,
      description: fullDesc,
      whenToUse: fm.whenToUse,
      degraded: false,
      firstParty: false,
    };
    const fullCost = estimateTokens(renderEntry(full));
    if (used + fullCost <= budget) {
      entries.push(full);
      used += fullCost;
      continue;
    }

    const nameOnly: SkillListingEntry = {
      name: fm.name,
      description: "",
      whenToUse: undefined,
      degraded: true,
      firstParty: false,
    };
    const nameCost = estimateTokens(renderEntry(nameOnly));
    if (used + nameCost <= budget) {
      entries.push(nameOnly);
      used += nameCost;
    }
    // else: drop entirely.
  }

  const text = entries.map(renderEntry).join("\n");
  return { entries, text };
}

// ── Phase 2: invocation ──────────────────────────────────────────────────────

export interface SkillMessage {
  readonly role: "system" | "user";
  readonly content: string;
}

export interface ExpandedSkill {
  readonly messages: readonly SkillMessage[];
  readonly allowedTools: readonly string[];
  readonly modelOverride?: string | undefined;
  readonly effort?: "low" | "medium" | "high" | undefined;
  readonly executionMode: "inline" | "fork";
}

export interface ExpandContext {
  readonly tenantId: string;
  readonly args: Record<string, string>;
  readonly vars: Record<string, string>;
  /** Lazy body fetch — host supplies; called only here, only once. */
  readonly bodyLoader: (bodyRef: string) => Promise<string>;
  /** Host-injected resource-base indirection (NO host FS access here). */
  readonly skillResourceBase: (slug: string) => string;
}

/**
 * Phase 2 — expand a skill into turn messages. Body is loaded lazily via the
 * injected `bodyLoader` (never during listing). A `Base directory…` line is
 * prepended via the injected `skillResourceBase` indirection. Args + vars are
 * substituted with `substituteArguments`. The skill's `allowedTools` are
 * returned for the caller to merge into the permission context — this never
 * mutates global state and never executes anything from the body.
 */
export async function expandSkill(skill: SkillRecord, ctx: ExpandContext): Promise<ExpandedSkill> {
  if (!ctx.tenantId) throw new Error("expandSkill: tenantId is required");
  if (skill.tenantId !== ctx.tenantId) {
    throw new Error("expandSkill: cross-tenant skill access rejected");
  }

  const rawBody = await ctx.bodyLoader(skill.bodyRef);
  const body = substituteArguments(rawBody, ctx.args, ctx.vars);
  const baseLine = `Base directory for this skill: ${ctx.skillResourceBase(skill.slug)}`;

  const messages: readonly SkillMessage[] = [
    { role: "system", content: baseLine },
    { role: "user", content: body },
  ];

  const allowedTools = [...skill.frontmatter.allowedTools];

  return {
    messages,
    allowedTools,
    modelOverride: skill.frontmatter.model,
    effort: skill.frontmatter.effort,
    executionMode: skill.frontmatter.executionMode,
  };
}
