/**
 * Conventional-Commits message generation — a faithful re-expression of a
 * coding agent's "write my commit message from staged changes" capability into
 * Sailor's grammar: TypeScript, multi-tenant, no model-vendor lock-in.
 *
 * ── This is a WRAP, not an agent ────────────────────────────────────────────
 * The small-model invocation is INJECTED via the {@link CompletionModel} port.
 * This module does NOT implement an agent loop, a transport, a token budget, or
 * tenancy — those travel inside the injected port (the real impl is the runtime
 * model seam; tests pass a deterministic fake). The delta this module owns is
 * purely DOMAIN SHAPING:
 *   • the Conventional Commits system prompt,
 *   • the git-context → user-prompt rendering,
 *   • the "regenerate, but DIFFERENT" negative-constraint contract,
 *   • output de-formatting + bounded retry with a FAIL-CLOSED terminal error.
 *
 * Everything here is pure/deterministic given the injected model. Inputs are
 * Zod-validated at the boundary; nothing is mutated in place.
 */

import { z } from "zod";

/** Sampling temperature handed to the injected model (slightly creative, stable). */
export const DEFAULT_TEMPERATURE = 0.3;
/** Per-attempt abort budget (ms) handed to the injected model. */
export const DEFAULT_ABORT_MS = 30_000;
/** Total attempts before failing closed (initial try + retries inclusive). */
export const MAX_RETRIES = 3;

const fileSchema = z.object({
  status: z.string(),
  path: z.string(),
  diff: z.string(),
});

const gitContextSchema = z.object({
  branch: z.string(),
  recentCommits: z.array(z.string()),
  files: z.array(fileSchema),
});

/** Staged git context the message is derived from. Zod-validated public input. */
export type GitContext = z.infer<typeof gitContextSchema>;

/**
 * When `previous` is set this is a "regenerate, but materially DIFFERENT from
 * the previous message" request — see {@link buildCommitPrompt}. Built
 * conditionally to honor `exactOptionalPropertyTypes`.
 */
export interface GenerateOptions {
  readonly previous?: string | undefined;
}

/**
 * Injected small-model seam. The real implementation is the runtime's model
 * invocation (carrying tenancy/auth); tests inject a deterministic fake. This
 * module consumes the port and never implements model plumbing itself.
 */
export interface CompletionModel {
  complete(p: {
    system: string;
    user: string;
    temperature: number;
    abortMs: number;
  }): Promise<string>;
}

/** Raised when every attempt is exhausted. Fail closed — never a fake message. */
export class CommitMessageError extends Error {
  constructor(message = "failed to generate a commit message") {
    super(message);
    this.name = "CommitMessageError";
  }
}

const SYSTEM_PROMPT = [
  "You write a single git commit message that follows the Conventional Commits specification.",
  "",
  "Format: type(scope): subject",
  "  - scope is optional; omit the parentheses entirely when there is no scope.",
  "  - allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore.",
  "  - subject: imperative mood, lower-case, concise, no trailing period.",
  "  - an optional body MAY follow after one blank line to explain the why.",
  "",
  "Return ONLY the commit message. No code fences, no quotes, no commentary, no preamble.",
].join("\n");

function renderFiles(files: GitContext["files"]): string {
  return files.map((f) => `[${f.status}] ${f.path}\n${f.diff}`).join("\n\n");
}

/**
 * Builds the `{ system, user }` pair. The system prompt encodes the
 * Conventional Commits spec and the "only the message" instruction. The user
 * prompt renders branch + recent commits + per-file status/path/diff. When
 * `opts.previous` is set, a NEGATIVE CONSTRAINT block is appended so a
 * regenerate request yields a materially different message. Pure.
 */
export function buildCommitPrompt(
  ctx: GitContext,
  opts?: GenerateOptions,
): { system: string; user: string } {
  const sections = [
    `Branch:\n${ctx.branch}`,
    `Recent commits:\n${ctx.recentCommits.join("\n")}`,
    `Staged changes:\n${renderFiles(ctx.files)}`,
  ];

  if (opts?.previous !== undefined) {
    sections.push(
      [
        "NEGATIVE CONSTRAINT:",
        "the following message was already generated and rejected;",
        "produce a materially different message:",
        opts.previous,
      ].join("\n"),
    );
  }

  return { system: SYSTEM_PROMPT, user: sections.join("\n\n") };
}

const FENCE = /^```[^\n]*\n([\s\S]*?)\n?```$/;

/**
 * Removes surrounding triple-backtick fences (with optional language tag) and
 * surrounding single/double quotes, then trims. Pure — defensive against models
 * that wrap output despite the system instruction.
 */
export function stripFormatting(raw: string): string {
  let s = raw.trim();
  const fenced = FENCE.exec(s);
  if (fenced) {
    s = (fenced[1] ?? "").trim();
  }
  if (
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Generates a Conventional-Commits message from staged git context by wrapping
 * the injected {@link CompletionModel}. Zod-validates `ctx`; calls the model at
 * {@link DEFAULT_TEMPERATURE}/{@link DEFAULT_ABORT_MS}; retries up to
 * {@link MAX_RETRIES} total attempts on rejection OR empty/whitespace output;
 * returns the de-formatted message. FAIL CLOSED: if every attempt is exhausted
 * it throws {@link CommitMessageError} — never an empty or fabricated message.
 */
export async function generateCommitMessage(args: {
  ctx: GitContext;
  model: CompletionModel;
  opts?: GenerateOptions;
}): Promise<string> {
  const ctx = gitContextSchema.parse(args.ctx);
  const prompt = buildCommitPrompt(ctx, args.opts !== undefined ? args.opts : undefined);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const raw = await args.model.complete({
        system: prompt.system,
        user: prompt.user,
        temperature: DEFAULT_TEMPERATURE,
        abortMs: DEFAULT_ABORT_MS,
      });
      const message = stripFormatting(raw);
      if (message.length > 0) {
        return message;
      }
    } catch {
      // Swallow per-attempt failure; the bounded loop decides the terminal
      // outcome and fails closed below.
    }
  }

  throw new CommitMessageError();
}
