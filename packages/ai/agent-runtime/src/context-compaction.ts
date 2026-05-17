/**
 * In-session context compaction — a faithful re-expression of a coding agent's
 * mid-turn "the transcript no longer fits, shrink it and keep going" recovery
 * into Sailor's grammar: TypeScript, deterministic, model-agnostic, no datastore
 * and no tokenizer-vendor lock-in.
 *
 * ── What this is (and is NOT) ───────────────────────────────────────────────
 * This module shrinks the CURRENT, in-flight transcript when a turn overflows
 * the model's context window. It is NOT cross-session memory: nothing here
 * persists, recalls, or indexes past sessions. The only output is a single
 * summary string that the caller substitutes for the old transcript so the
 * SAME turn can be retried within budget. Memory is a different subsystem;
 * conflating the two is the classic mistake this header exists to prevent.
 *
 * ── Mental model: recursive map-reduce ──────────────────────────────────────
 * A transcript is a list of whole {@link Message}s. We never split a message —
 * the unit of summarization is always a complete message so a tool call and its
 * output, or a reasoning block, are never torn in half.
 *
 *   MAP    {@link split} greedily packs whole messages into chunks each ≤ the
 *          token budget, then {@link summarizeChunks} summarizes every chunk
 *          (bounded concurrency) into a partial summary.
 *   REDUCE {@link reduce} binary-pairs the partial summaries, summarizes each
 *          pair, and recurses on the shorter list — at most {@link REDUCE_DEPTH}
 *          levels — until the combined summary fits the budget. The final text
 *          is hard-capped at {@link OUTPUT_TOKEN_CAP} (a model that ignores the
 *          length instruction is truncated, not trusted).
 *
 * ── The numeric contract (constants ARE the design — exported) ──────────────
 *  • {@link TOKEN_CORRECTION} = 1.3 — char/4 and similar cheap heuristics
 *    UNDERCOUNT real BPE tokens by ~15-30% on code/markup-heavy transcripts.
 *    Multiplying the base estimate by 1.3 buys headroom so a "fits" decision
 *    does not itself overflow. We round UP everywhere for the same reason:
 *    over-counting wastes a little budget, under-counting reintroduces the
 *    exact overflow we are recovering from.
 *  • {@link BUDGET_RATIO} = 0.6 — the summary must coexist with the system
 *    prompt, the model's reply, fresh tool output, and decode headroom in the
 *    SAME retried turn. Spending only 60% of the usable window on the recap
 *    leaves room for all of that.
 *  • {@link MIN_BUDGET} = 1000 — below ~1k tokens a "summary" degenerates into
 *    lossy garbage; we would rather over-summarize than emit something useless,
 *    so the budget is clamped up to a floor that can still hold a coherent map
 *    of paths/commands/decisions.
 *  • {@link CONCURRENCY} = 3 — chunk summaries are independent and fan out, but
 *    an unbounded fan-out melts rate limits mid-recovery (the worst possible
 *    moment). 3 is the empirical "fast but polite" point for hosted models.
 *  • {@link REDUCE_DEPTH} = 3 — binary reduction shrinks the summary list
 *    geometrically; 3 levels collapse up to 8 partials into one, which covers
 *    realistic overflowed transcripts while bounding worst-case model calls so
 *    a pathological "never shrinks" model cannot recurse forever.
 *  • {@link OUTPUT_TOKEN_CAP} = 2048 — the recap must itself be small enough to
 *    leave the bulk of the retried turn for actual work; also the hard backstop
 *    against a model that ignores the length instruction.
 *  • {@link CLIP_TOOL_CHARS} = 2000 / {@link CLIP_TEXT_CHARS} = 16000 — raw
 *    tool dumps (lockfiles, build logs) and giant pasted blobs are mostly noise
 *    for a recap; clipping them BEFORE summarization keeps the model focused on
 *    signal and keeps chunk sizing predictable. Text gets a larger allowance
 *    than tool I/O because prose carries more decision-relevant signal per char.
 *
 * ── Fail-closed sentinel (DOCUMENTED CHOICE) ────────────────────────────────
 * If ANY chunk or reduce-group summarization rejects, we must NOT splice a
 * partial or empty recap into the turn — that silently DROPS context the agent
 * still needs and corrupts the run in a way that is nearly impossible to debug
 * after the fact. Instead {@link compactTranscript} resolves with the sentinel
 * string `"compact"`. The contract with the caller: seeing `"compact"` back
 * means "compaction could not be completed safely — retry the WHOLE compaction"
 * (the same token the eligibility check keys on), never "here is your summary".
 * Failing loud-but-recoverable beats failing silent-and-lossy.
 *
 * ── Determinism & immutability ──────────────────────────────────────────────
 * No Date, no Math.random, no network, no I/O. Output is a pure function of the
 * transcript plus the injected `summarize` and `base` estimator. The transcript
 * is never mutated; every transformation builds new arrays/strings.
 */

import { z } from "zod";

/** Tokenizers undercount real BPE by ~15-30%; scale the base estimate up. */
export const TOKEN_CORRECTION = 1.3;

/** Fraction of the usable window the recap is allowed to occupy. */
export const BUDGET_RATIO = 0.6;

/** Hard floor: below this a summary degenerates into lossy noise. */
export const MIN_BUDGET = 1000;

/** Max simultaneous in-flight chunk summaries (rate-limit politeness). */
export const CONCURRENCY = 3;

/** Max binary-reduce recursion levels (bounds worst-case model calls). */
export const REDUCE_DEPTH = 3;

/** Hard cap on the final combined summary size, in corrected tokens. */
export const OUTPUT_TOKEN_CAP = 2048;

/** Per-tool-part input/output clip length before summarization. */
export const CLIP_TOOL_CHARS = 2000;

/** Per-text-part clip length before summarization. */
export const CLIP_TEXT_CHARS = 16000;

/** Appended whenever any field is clipped, so the loss is visible to the model. */
const TRUNCATION_MARKER = " …[truncated]";

/** A text fragment of a message. */
export interface TextPart {
  readonly type: "text";
  readonly text: string;
}

/** A tool invocation fragment: the call inputs and the tool's raw output. */
export interface ToolPart {
  readonly type: "tool";
  readonly name: string;
  readonly input: string;
  readonly output: string;
}

export type Part = TextPart | ToolPart;

/** One conversational turn fragment owned by a single role. */
export interface Message {
  readonly role: "user" | "assistant" | "tool" | "system";
  readonly parts: readonly Part[];
}

/** The ordered list of messages making up the current turn's context. */
export type Transcript = readonly Message[];

/**
 * Caller-injected model seam. Real callers back this with their LLM; tests pass
 * a deterministic fake. The module never talks to a network itself.
 */
export type Summarize = (prompt: string) => Promise<string>;

/** Caller-injected cheap token heuristic; defaults to chars/4. */
export type BaseEstimator = (text: string) => number;

/** The eligibility signal this module keys on (also the failure sentinel). */
export const COMPACT_SENTINEL = "compact";

const defaultBase: BaseEstimator = (s) => Math.ceil(s.length / 4);

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const toolPartSchema = z.object({
  type: z.literal("tool"),
  name: z.string(),
  input: z.string(),
  output: z.string(),
});

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "tool", "system"]),
  parts: z.array(z.discriminatedUnion("type", [textPartSchema, toolPartSchema])),
});

const compactInputSchema = z.object({
  transcript: z.array(messageSchema),
  usableTokens: z.number().int().positive(),
});

/**
 * Corrected token estimate: `ceil(base(text) * TOKEN_CORRECTION)`. The base
 * estimator is injectable so callers can swap a real tokenizer in; we still
 * apply the correction multiplier on top because even real tokenizers diverge
 * from the model's server-side counting. Always rounds UP — see header.
 */
export function estimateTokens(text: string, base: BaseEstimator = defaultBase): number {
  return Math.ceil(base(text) * TOKEN_CORRECTION);
}

/**
 * Budget = 60% of the usable window, floored, then clamped UP to
 * {@link MIN_BUDGET} so a tiny window can never produce an incoherent recap.
 */
export function computeBudget(usableTokens: number): number {
  return Math.max(MIN_BUDGET, Math.floor(usableTokens * BUDGET_RATIO));
}

/** Clip a string to `limit`, appending a visible marker only if it shrank. */
function clip(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return value.slice(0, limit) + TRUNCATION_MARKER;
}

/** Render one part to its XML-ish line(s), clipping at the part-type limit. */
function renderPart(part: Part): string {
  if (part.type === "text") {
    return `<text>${clip(part.text, CLIP_TEXT_CHARS)}</text>`;
  }
  const input = clip(part.input, CLIP_TOOL_CHARS);
  const output = clip(part.output, CLIP_TOOL_CHARS);
  return `<tool name="${part.name}"><input>${input}</input><output>${output}</output></tool>`;
}

/**
 * Produce a stable, XML-ish `<conversation>` rendering of a single message,
 * clipping oversized text/tool fields so a giant blob can neither dominate a
 * chunk nor blow the model's own window during summarization. Pure: the input
 * message is never mutated (new strings only).
 */
export function renderClipped(msg: Message): string {
  const body = msg.parts.map(renderPart).join("");
  return `<conversation><message role="${msg.role}">${body}</message></conversation>`;
}

/**
 * MAP step. Greedily pack WHOLE messages into chunks whose corrected estimate
 * is ≤ `budget`. A message that alone exceeds `budget` becomes its own chunk
 * (oversize fallback) — it is summarized later through the same clipping render
 * path, so it can never wedge the packer. Pure: builds new arrays only.
 */
export function split(
  transcript: Transcript,
  budget: number,
  estimate: (text: string) => number,
): Message[][] {
  const chunks: Message[][] = [];
  let current: Message[] = [];
  let currentTokens = 0;

  for (const msg of transcript) {
    const size = estimate(renderClipped(msg));

    if (size > budget) {
      // Flush whatever is buffered, then this message stands alone.
      if (current.length > 0) {
        chunks.push(current);
        current = [];
        currentTokens = 0;
      }
      chunks.push([msg]);
      continue;
    }

    if (current.length > 0 && currentTokens + size > budget) {
      chunks.push(current);
      current = [];
      currentTokens = 0;
    }

    current = [...current, msg];
    currentTokens += size;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * The summarization rubric. Embedded verbatim so the prompt provably instructs
 * preservation of the five things a resumed agent cannot reconstruct on its
 * own: file paths, exact commands, errors, decisions made, and unresolved /
 * outstanding tasks. Tests assert each rubric item is present.
 */
function buildPrompt(rendered: string): string {
  return [
    "Summarize the following conversation transcript so the work can continue",
    "without the original messages. You MUST preserve, verbatim where possible:",
    "  1. Every file path that was read, written, or referenced.",
    "  2. Every exact command that was run (and its key result).",
    "  3. Every error or failure encountered.",
    "  4. Every decision made and the reasoning behind it.",
    "  5. Every unresolved / outstanding task still to be done.",
    `Keep the summary under ${OUTPUT_TOKEN_CAP} tokens. Be terse; drop pleasantries.`,
    "",
    rendered,
  ].join("\n");
}

/**
 * Hand-rolled bounded-concurrency map (no p-limit dependency). Runs `worker`
 * over `items` with at most {@link CONCURRENCY} in flight, preserving result
 * order. Any rejection propagates (caught by the orchestrator → fail-closed).
 */
async function mapLimited<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index] as T, index);
    }
  }

  const lanes = Math.min(CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: lanes }, () => run()));
  return results;
}

/**
 * MAP fan-out: render each chunk (clipping applied), then summarize all chunks
 * under the concurrency limit. Order-preserving so the reduce step keeps
 * chronological coherence.
 */
async function summarizeChunks(
  chunks: readonly Message[][],
  summarize: Summarize,
): Promise<string[]> {
  return mapLimited(chunks, async (chunk) => {
    const rendered = chunk.map(renderClipped).join("\n");
    return summarize(buildPrompt(rendered));
  });
}

/** Cap a final combined summary at {@link OUTPUT_TOKEN_CAP}, marking any cut. */
function capOutput(summary: string, estimate: (text: string) => number): string {
  if (estimate(summary) <= OUTPUT_TOKEN_CAP) {
    return summary;
  }
  // Walk down a char budget that maps to the token cap. Estimation is
  // monotonic in length, so a linear shrink converges deterministically.
  let cut = summary;
  while (cut.length > 0 && estimate(cut + TRUNCATION_MARKER) > OUTPUT_TOKEN_CAP) {
    // Shrink proportionally toward the cap, but always make progress.
    const ratio = OUTPUT_TOKEN_CAP / Math.max(1, estimate(cut));
    const nextLen = Math.min(cut.length - 1, Math.floor(cut.length * ratio));
    cut = cut.slice(0, Math.max(0, nextLen));
  }
  return cut + TRUNCATION_MARKER;
}

/**
 * REDUCE step. Binary-pair the partial summaries, summarize each pair, recurse
 * on the (now shorter) list. Stops when the combined text fits `budget` OR
 * after {@link REDUCE_DEPTH} levels (a model that never shrinks must not loop
 * forever). The terminal combined summary is always {@link capOutput}-bounded.
 */
async function reduce(
  summaries: readonly string[],
  budget: number,
  estimate: (text: string) => number,
  summarize: Summarize,
): Promise<string> {
  let level = summaries;
  let depth = 0;

  // A lone summary that already fits needs no reduction at all.
  if (level.length === 1 && estimate(level[0] as string) <= budget) {
    return capOutput(level[0] as string, estimate);
  }

  while (depth < REDUCE_DEPTH) {
    const combined = level.join("\n\n");
    if (level.length === 1 || estimate(combined) <= budget) {
      return capOutput(level.length === 1 ? (level[0] as string) : combined, estimate);
    }

    const groups: string[][] = [];
    for (let i = 0; i < level.length; i += 2) {
      groups.push(level.slice(i, i + 2));
    }

    const next = await mapLimited(groups, async (group) => {
      if (group.length === 1) {
        return group[0] as string;
      }
      return summarize(buildPrompt(group.join("\n\n")));
    });

    level = next;
    depth += 1;
  }

  // Depth exhausted: emit the best combination we have, hard-capped.
  return capOutput(level.length === 1 ? (level[0] as string) : level.join("\n\n"), estimate);
}

/** Input to {@link compactTranscript}. `base` is optional (exactOptional). */
export interface CompactTranscriptInput {
  readonly transcript: Transcript;
  readonly usableTokens: number;
  readonly summarize: Summarize;
  readonly base?: BaseEstimator | undefined;
}

/**
 * Orchestrate split → summarizeChunks → reduce and return the final recap.
 *
 * FAIL CLOSED: if any chunk or reduce-group summarization rejects, this resolves
 * with the {@link COMPACT_SENTINEL} string `"compact"` rather than a partial or
 * empty summary — never silently dropping context. The caller treats `"compact"`
 * as "retry the whole compaction" (see module header).
 *
 * Deterministic given the injected `summarize` and `base`. The transcript is
 * never mutated.
 */
export async function compactTranscript(input: CompactTranscriptInput): Promise<string> {
  const { transcript, usableTokens } = compactInputSchema.parse({
    transcript: input.transcript,
    usableTokens: input.usableTokens,
  });

  const base = input.base ?? defaultBase;
  const estimate = (text: string): number => estimateTokens(text, base);
  const budget = computeBudget(usableTokens);

  try {
    const chunks = split(transcript, budget, estimate);
    if (chunks.length === 0) {
      return "";
    }

    const partials = await summarizeChunks(chunks, input.summarize);
    return await reduce(partials, budget, estimate, input.summarize);
  } catch {
    // Any summarization failure → loud-but-recoverable sentinel, never a
    // partial/empty recap that would silently corrupt the retried turn.
    return COMPACT_SENTINEL;
  }
}

/**
 * Eligibility gate. Compaction runs only when the model stopped specifically
 * because it wants a compaction or because the context overflowed; every other
 * stop reason (end_turn, tool_use, …) is left untouched.
 */
export function shouldCompact(stop: { reason: string }): boolean {
  return stop.reason === "compact" || stop.reason === "context_overflow";
}
