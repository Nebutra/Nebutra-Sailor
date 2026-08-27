/**
 * Shared definition kernel (WRAP — Claude-Code-class harness, the delta).
 *
 * Faithful re-expression of the source harness's layered-merge + precedence +
 * dual-gate resolver and its frontmatter→record parser. One implementation
 * backs the command registry, the skill catalog, and the subagent-definition
 * registry (the source uses the same loader for all three).
 *
 * Multi-tenant: every resolution is keyed by `tenantId`; tiers from one tenant
 * never merge into another. Pure data/logic — no FS scan, no shell, no TUI.
 */

import { z } from "zod";

/**
 * Source-tier precedence, low → high authority. A later tier overrides an
 * earlier one on slug collision (mirrors the upstream merge order:
 * bundled → builtin → workspace → workflow → plugin → dynamic, with
 * org policy as the final, non-overridable authority).
 */
export const SOURCE_TIERS = [
  "bundled",
  "builtin",
  "workspace",
  "workflow",
  "plugin",
  "dynamic",
  "policy",
] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

const tierRank = new Map<SourceTier, number>(SOURCE_TIERS.map((t, i) => [t, i]));

/** Frontmatter shared by skills / commands / subagents (faithful subset). */
export const frontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  /** Tool allowlist this definition self-declares. */
  allowedTools: z.array(z.string()).default([]),
  /** Tool denylist (subagents). */
  disallowedTools: z.array(z.string()).default([]),
  argumentHint: z.string().optional(),
  argNames: z.array(z.string()).default([]),
  whenToUse: z.string().optional(),
  version: z.string().optional(),
  /** "inherit" | a model alias. */
  model: z.string().optional(),
  effort: z.enum(["low", "medium", "high"]).optional(),
  /** Model may auto-invoke this. */
  modelInvocable: z.boolean().default(true),
  /** A human may invoke this. */
  userInvocable: z.boolean().default(true),
  /** inline = expand into current turn; fork = isolated child. */
  executionMode: z.enum(["inline", "fork"]).default("inline"),
  agent: z.string().optional(),
  /** Path-activation globs (surface only after a matching file is touched). */
  paths: z.array(z.string()).default([]),
});
export type Frontmatter = z.infer<typeof frontmatterSchema>;

const FRONTMATTER_FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Aliases mapping kebab/snake frontmatter keys → schema keys. */
const KEY_ALIASES: Record<string, keyof Frontmatter> = {
  "allowed-tools": "allowedTools",
  "disallowed-tools": "disallowedTools",
  "argument-hint": "argumentHint",
  arguments: "argNames",
  when_to_use: "whenToUse",
  "disable-model-invocation": "modelInvocable", // inverted below
  "user-invocable": "userInvocable",
  context: "executionMode",
};

function coerceScalar(raw: string): string | boolean | string[] {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[") && v.endsWith("]")) {
    return v
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return v.replace(/^["']|["']$/g, "");
}

/**
 * Parse a `--- … ---` frontmatter block + remaining body. Dependency-light
 * line parser (the package only depends on zod) — sufficient for the simple
 * key: value / list frontmatter the source uses. Throws on missing block.
 */
export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const m = FRONTMATTER_FENCE.exec(raw);
  if (!m) throw new Error("definition is missing a '--- … ---' frontmatter block");
  const block = m[1] ?? "";
  const body = raw.slice(m[0].length);

  const bag: Record<string, unknown> = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const rawKey = line.slice(0, idx).trim();
    const value = coerceScalar(line.slice(idx + 1));
    const key = KEY_ALIASES[rawKey] ?? (rawKey as keyof Frontmatter);
    if (rawKey === "disable-model-invocation") {
      bag.modelInvocable = value === true ? false : value === false ? true : true;
      continue;
    }
    if (rawKey === "context") {
      bag.executionMode = value === "fork" ? "fork" : "inline";
      continue;
    }
    bag[key] = value;
  }
  return { frontmatter: frontmatterSchema.parse(bag), body };
}

/** A resolvable definition of any kind (skill / command / subagent). */
export interface Definition {
  readonly slug: string;
  readonly tenantId: string;
  readonly sourceTier: SourceTier;
  readonly frontmatter: Frontmatter;
  readonly bodyRef: string;
  /** Entitlement gate — who may have this at all. */
  readonly availabilityPlans?: readonly string[];
  /** Runtime/feature toggle, recomputed per request. */
  readonly enabled?: boolean;
}

export interface ResolveContext {
  readonly tenantId: string;
  readonly plan?: string;
  /** Names already loaded this session (suppressed from re-listing). */
  readonly loadedSlugs?: ReadonlySet<string>;
}

/**
 * Tenant-scoped layered resolver. Merges definitions by slug with tier
 * precedence and applies the dual gate (availability ∧ enabled), recomputed
 * per call so entitlement/flag changes apply live. Cross-tenant inputs are
 * rejected — fail closed.
 */
export class DefinitionResolver<T extends Definition = Definition> {
  readonly #all: readonly T[];

  constructor(definitions: readonly T[]) {
    this.#all = [...definitions];
  }

  /** Entitlement gate. */
  static available(def: Definition, plan?: string): boolean {
    if (!def.availabilityPlans || def.availabilityPlans.length === 0) return true;
    return plan != null && def.availabilityPlans.includes(plan);
  }

  resolve(ctx: ResolveContext): T[] {
    if (!ctx.tenantId) throw new Error("ResolveContext.tenantId is required");
    const winner = new Map<string, T>();
    for (const def of this.#all) {
      if (def.tenantId !== ctx.tenantId) continue; // tenant isolation, fail-closed
      if (def.enabled === false) continue;
      if (!DefinitionResolver.available(def, ctx.plan)) continue;
      const cur = winner.get(def.slug);
      if (!cur || tierRank.get(def.sourceTier)! >= tierRank.get(cur.sourceTier)!) {
        winner.set(def.slug, def);
      }
    }
    return [...winner.values()];
  }

  /** Resolve a single slug (highest-precedence, gated). */
  resolveOne(slug: string, ctx: ResolveContext): T | undefined {
    return this.resolve(ctx).find((d) => d.slug === slug);
  }
}

/** Substitute `${name}` / positional `$1` args + session/dir variables. */
export function substituteArguments(
  template: string,
  args: Record<string, string>,
  variables: Record<string, string> = {},
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, k: string) =>
    k in args ? args[k]! : k in variables ? variables[k]! : "",
  );
}
