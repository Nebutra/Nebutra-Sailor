/**
 * Skill distillation (INVERSE of ./skills).
 *
 * Where ./skills only *loads and discloses* authored skills, this module
 * *creates and refines* them from lived experience — the "learn a skill
 * from a trajectory" loop of a self-improving agent, re-expressed from
 * first principles.
 *
 * The loop:
 *   1. observe a trajectory (the ordered steps an agent took toward a goal)
 *   2. gate it — only clean successes with real tool work distill (no noise)
 *   3. build a deterministic distillation prompt from the trajectory
 *   4. hand the prompt to an INJECTED synthesizer (the LLM call lives
 *      outside this module — here it is a pure indirection)
 *   5. assemble a tenant-scoped, least-privilege `DistilledSkill` whose
 *      tool allowlist is clamped to tools the experience actually exercised
 *   6. optionally refine an existing skill from a fresh success
 *
 * SECURITY: every entry point requires a non-empty `tenantId` and fails
 * closed. Cross-tenant improvement is rejected. A distilled skill can never
 * be granted a tool the trajectory did not use (least privilege). Pure
 * data/logic; no host access; the model call is an injected indirection.
 */

import { z } from "zod";

// ── Trajectory model ─────────────────────────────────────────────────────────

const trajectoryStepSchema = z.object({
  kind: z.enum(["tool", "message", "observation"]),
  name: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
});

const trajectorySchema = z.object({
  tenantId: z.string(),
  sessionId: z.string(),
  goal: z.string(),
  steps: z.array(trajectoryStepSchema),
  outcome: z.enum(["success", "failure", "partial"]),
});

export interface TrajectoryStep {
  readonly kind: "tool" | "message" | "observation";
  readonly name?: string | undefined;
  readonly input?: unknown;
  readonly output?: unknown;
}

export interface Trajectory {
  readonly tenantId: string;
  readonly sessionId: string;
  readonly goal: string;
  readonly steps: readonly TrajectoryStep[];
  readonly outcome: "success" | "failure" | "partial";
}

// ── Distilled skill (LOCAL minimal structural shape) ─────────────────────────

/**
 * Minimal structural shape — deliberately NOT imported from ./skills /
 * ./definitions. It is structurally usable as a skill record consumed by
 * the loader: a slug, frontmatter-shaped metadata, and a body text.
 */
export interface DistilledSkillFrontmatter {
  readonly name: string;
  readonly description: string;
  readonly whenToUse?: string | undefined;
  readonly allowedTools: readonly string[];
}

export interface DistilledSkillProvenance {
  readonly sessionId: string;
  readonly distilledAt: string;
  readonly stepCount: number;
  readonly version?: number | undefined;
}

export interface DistilledSkill {
  readonly slug: string;
  readonly tenantId: string;
  readonly sourceTier: "dynamic";
  readonly frontmatter: DistilledSkillFrontmatter;
  readonly body: string;
  readonly provenance: DistilledSkillProvenance;
}

/** Injected LLM indirection — the model call is NOT implemented here. */
export type Synthesizer = (prompt: string) => Promise<{
  name: string;
  description: string;
  whenToUse: string;
  body: string;
  allowedTools: string[];
}>;

// ── Pure helpers ─────────────────────────────────────────────────────────────

const TRIVIAL_GOAL_MIN_CHARS = 12;
const MAX_PROMPT_OBSERVATIONS = 5;
const MAX_OBSERVATION_CHARS = 160;

/** kebab-case a free-form name into a stable slug. */
export function kebab(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-+)|(-+$)/g, "")
    .toLowerCase();
}

/** Ordered, de-duplicated tool names the trajectory actually exercised. */
function toolsUsed(traj: Trajectory): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of traj.steps) {
    if (s.kind === "tool" && s.name && !seen.has(s.name)) {
      seen.add(s.name);
      out.push(s.name);
    }
  }
  return out;
}

/** Intersection preserving the order of `wanted`. */
function clampTools(wanted: readonly string[], allowed: readonly string[]): readonly string[] {
  const set = new Set(allowed);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of wanted) {
    if (set.has(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/** Union preserving first-seen order. */
function unionTools(a: readonly string[], b: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...a, ...b]) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

const truncate = (s: string, max: number): string => (s.length <= max ? s : s.slice(0, max));

function salientObservations(traj: Trajectory): readonly string[] {
  const out: string[] = [];
  for (const s of traj.steps) {
    if (s.kind !== "observation") continue;
    const txt = typeof s.output === "string" ? s.output : JSON.stringify(s.output ?? "");
    if (txt) out.push(truncate(txt, MAX_OBSERVATION_CHARS));
    if (out.length >= MAX_PROMPT_OBSERVATIONS) break;
  }
  return out;
}

/** Deterministic distillation prompt — pure function of the trajectory. */
export function buildDistillationPrompt(traj: Trajectory): string {
  const tools = toolsUsed(traj);
  const obs = salientObservations(traj);
  const lines = [
    "Distill a reusable skill from this successful trajectory.",
    "",
    `Goal: ${traj.goal}`,
    "",
    `Tools used (in order): ${tools.join(", ")}`,
    "",
    "Salient observations:",
    ...(obs.length > 0 ? obs.map((o) => `- ${o}`) : ["- (none)"]),
    "",
    "Produce a concise, generalizable skill (name, description, whenToUse, body, allowedTools).",
  ];
  return lines.join("\n");
}

/** Deterministic improvement prompt — does not regress the existing skill. */
export function buildImprovementPrompt(existing: DistilledSkill, traj: Trajectory): string {
  return [
    "Improve this existing skill using a new successful trajectory.",
    "Refine and generalize; do NOT regress what already works.",
    "",
    `Existing skill: ${existing.frontmatter.name}`,
    `Existing body:\n${existing.frontmatter.description}`,
    "",
    buildDistillationPrompt(traj),
  ].join("\n");
}

// ── Eligibility gate ─────────────────────────────────────────────────────────

const eligibilityOptionsSchema = z.object({
  minToolSteps: z.number().int().positive().default(2),
});
export type EligibilityOptions = z.input<typeof eligibilityOptionsSchema>;

/**
 * Only clean successes with real tool work and a non-trivial goal qualify.
 * Pure. Don't manufacture noise skills from failures or trivial sessions.
 */
export function isDistillable(
  traj: Trajectory,
  options: EligibilityOptions = {},
): { ok: boolean; reason?: string } {
  const t = trajectorySchema.parse(traj);
  const opts = eligibilityOptionsSchema.parse(options);

  if (t.outcome !== "success") {
    return { ok: false, reason: `outcome is '${t.outcome}', not 'success'` };
  }
  if (t.goal.trim().length < TRIVIAL_GOAL_MIN_CHARS) {
    return { ok: false, reason: "goal is trivial / too short" };
  }
  const toolStepCount = t.steps.filter((s) => s.kind === "tool").length;
  if (toolStepCount < opts.minToolSteps) {
    return {
      ok: false,
      reason: `only ${toolStepCount} tool step(s); need ≥ ${opts.minToolSteps}`,
    };
  }
  return { ok: true };
}

// ── Distillation ─────────────────────────────────────────────────────────────

export interface DistillOptions {
  /** Override the clock for deterministic provenance in tests. */
  readonly now?: (() => Date) | undefined;
  readonly eligibility?: EligibilityOptions | undefined;
}

function assertTenant(tenantId: string, where: string): void {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error(`${where}: tenantId is required (fail-closed)`);
  }
}

/**
 * Distill a `DistilledSkill` from a successful trajectory. The model call is
 * the injected `synthesize`. The resulting tool allowlist is clamped to the
 * intersection of what the synthesizer asked for and what the trajectory
 * actually exercised — least privilege, always.
 */
export async function distillSkill(
  traj: Trajectory,
  synthesize: Synthesizer,
  opts: DistillOptions = {},
): Promise<DistilledSkill> {
  const t = trajectorySchema.parse(traj);
  assertTenant(t.tenantId, "distillSkill");

  const gate = isDistillable(t, opts.eligibility ?? {});
  if (!gate.ok) {
    throw new Error(`distillSkill: trajectory not distillable — ${gate.reason}`);
  }

  const prompt = buildDistillationPrompt(t);
  const synthesized = await synthesize(prompt);

  const used = toolsUsed(t);
  const allowedTools = clampTools(synthesized.allowedTools, used);
  const distilledAt = (opts.now ? opts.now() : new Date()).toISOString();

  return {
    slug: kebab(synthesized.name),
    tenantId: t.tenantId,
    sourceTier: "dynamic",
    frontmatter: {
      name: synthesized.name,
      description: synthesized.description,
      whenToUse: synthesized.whenToUse,
      allowedTools,
    },
    body: synthesized.body,
    provenance: {
      sessionId: t.sessionId,
      distilledAt,
      stepCount: t.steps.length,
      version: 1,
    },
  };
}

// ── Improvement ──────────────────────────────────────────────────────────────

/**
 * Refine an existing distilled skill from a fresh successful trajectory for
 * the same goal. Tenant must match (fail-closed). The tool allowlist is the
 * union of the existing allowlist and the new trajectory's tools, then
 * re-clamped to tools the new trajectory actually used (still least
 * privilege). The body is replaced via the injected synthesizer with an
 * "improve, don't regress" prompt. Version bumps.
 */
export async function improveSkill(
  existing: DistilledSkill,
  traj: Trajectory,
  synthesize: Synthesizer,
): Promise<DistilledSkill> {
  const t = trajectorySchema.parse(traj);
  assertTenant(existing.tenantId, "improveSkill");
  assertTenant(t.tenantId, "improveSkill");
  if (existing.tenantId !== t.tenantId) {
    throw new Error("improveSkill: cross-tenant improvement rejected");
  }
  const gate = isDistillable(t);
  if (!gate.ok) {
    throw new Error(`improveSkill: trajectory not distillable — ${gate.reason}`);
  }

  const prompt = buildImprovementPrompt(existing, t);
  const synthesized = await synthesize(prompt);

  const used = toolsUsed(t);
  const merged = unionTools(existing.frontmatter.allowedTools, used);
  const allowedTools = clampTools(merged, unionTools(existing.frontmatter.allowedTools, used));
  const distilledAt = new Date().toISOString();
  const nextVersion = (existing.provenance.version ?? 1) + 1;

  return {
    slug: existing.slug,
    tenantId: existing.tenantId,
    sourceTier: "dynamic",
    frontmatter: {
      name: existing.frontmatter.name,
      description: synthesized.description,
      whenToUse: synthesized.whenToUse,
      allowedTools,
    },
    body: synthesized.body,
    provenance: {
      sessionId: t.sessionId,
      distilledAt,
      stepCount: t.steps.length,
      version: nextVersion,
    },
  };
}

// ── Self-persist nudge ───────────────────────────────────────────────────────

const nudgeOptionsSchema = z.object({
  minUnsavedSuccesses: z.number().int().positive().default(3),
  minTurns: z.number().int().positive().default(40),
});
export type NudgeOptions = z.input<typeof nudgeOptionsSchema>;

/**
 * Deterministic heuristic: nudge the agent to persist learning once enough
 * unsaved successes have accumulated, or enough turns have passed since the
 * last distillation. Pure.
 */
export function shouldNudgePersist(
  sessionStats: { turnsSinceLastDistill: number; unsavedSuccesses: number },
  options: NudgeOptions = {},
): boolean {
  const opts = nudgeOptionsSchema.parse(options);
  return (
    sessionStats.unsavedSuccesses >= opts.minUnsavedSuccesses ||
    sessionStats.turnsSinceLastDistill >= opts.minTurns
  );
}
