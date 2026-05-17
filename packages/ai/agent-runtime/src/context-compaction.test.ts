import { describe, expect, it } from "vitest";
import {
  BUDGET_RATIO,
  CLIP_TEXT_CHARS,
  CLIP_TOOL_CHARS,
  CONCURRENCY,
  compactTranscript,
  computeBudget,
  estimateTokens,
  type Message,
  MIN_BUDGET,
  OUTPUT_TOKEN_CAP,
  REDUCE_DEPTH,
  renderClipped,
  shouldCompact,
  split,
  TOKEN_CORRECTION,
  type Transcript,
} from "./context-compaction.js";

/**
 * House-rule fidelity: NO mocking libraries. Every "model" is a hand-written
 * deterministic fake whose behaviour is fully observable from the test, so the
 * suite stays reproducible without Date/random/network.
 */

/** A deterministic base estimator: 1 token per 4 chars (the documented default). */
const charBase = (s: string): number => Math.ceil(s.length / 4);

/** Echoing summarizer — returns a short, deterministic, prompt-derived string. */
const echoSummarize =
  (label = "S") =>
  async (prompt: string): Promise<string> =>
    `${label}[len=${prompt.length}]`;

/**
 * A summarizer that records every prompt it ever saw AND tracks the maximum
 * number of calls that were ever in flight simultaneously, so concurrency
 * limiting can be asserted without timers or mocks. Each call yields control
 * to the microtask queue a fixed number of times before resolving, which lets
 * the scheduler interleave the limiter's batch.
 */
class TrackingSummarizer {
  readonly prompts: string[] = [];
  inFlight = 0;
  maxInFlight = 0;
  #counter = 0;

  constructor(private readonly settle = 4) {}

  summarize = async (prompt: string): Promise<string> => {
    this.prompts.push(prompt);
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    for (let i = 0; i < this.settle; i += 1) {
      await Promise.resolve();
    }
    this.inFlight -= 1;
    this.#counter += 1;
    return `sum#${this.#counter}`;
  };
}

/** A summarizer that rejects on the Nth (1-based) call, otherwise echoes. */
const failOnCall = (n: number) => {
  let calls = 0;
  return async (_prompt: string): Promise<string> => {
    calls += 1;
    if (calls === n) {
      throw new Error("model overloaded");
    }
    return `ok#${calls}`;
  };
};

const text = (role: Message["role"], body: string): Message => ({
  role,
  parts: [{ type: "text", text: body }],
});

describe("exported design constants", () => {
  it("freezes the documented numeric contract", () => {
    expect(TOKEN_CORRECTION).toBe(1.3);
    expect(BUDGET_RATIO).toBe(0.6);
    expect(MIN_BUDGET).toBe(1000);
    expect(CONCURRENCY).toBe(3);
    expect(REDUCE_DEPTH).toBe(3);
    expect(OUTPUT_TOKEN_CAP).toBe(2048);
    expect(CLIP_TOOL_CHARS).toBe(2000);
    expect(CLIP_TEXT_CHARS).toBe(16000);
  });
});

describe("estimateTokens", () => {
  it("applies the 1.3x correction over the default char estimator", () => {
    // 8 chars → base ceil(8/4)=2 → 2 * 1.3 = 2.6 → ceil → 3
    expect(estimateTokens("abcdefgh")).toBe(3);
  });

  it("uses an injected base estimator when provided", () => {
    // base returns 10 → 10 * 1.3 = 13
    expect(estimateTokens("ignored", () => 10)).toBe(13);
  });

  it("always rounds up so it never undercounts", () => {
    // base 1 → 1.3 → ceil → 2
    expect(estimateTokens("abcd", () => 1)).toBe(2);
  });

  it("returns 0 for empty text under the default estimator", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("computeBudget", () => {
  it("takes 60% of the usable token window", () => {
    expect(computeBudget(10_000)).toBe(6000);
  });

  it("floors fractional budgets", () => {
    // 3333 * 0.6 = 1999.8 → floor → 1999 (> MIN_BUDGET)
    expect(computeBudget(3333)).toBe(1999);
  });

  it("never returns below MIN_BUDGET", () => {
    expect(computeBudget(0)).toBe(MIN_BUDGET);
    expect(computeBudget(100)).toBe(MIN_BUDGET);
  });

  it("uses MIN_BUDGET exactly at the crossover", () => {
    // 1666 * 0.6 = 999.6 → floor 999 → clamped up to 1000
    expect(computeBudget(1666)).toBe(MIN_BUDGET);
  });
});

describe("shouldCompact", () => {
  it("is true for the explicit compact stop reason", () => {
    expect(shouldCompact({ reason: "compact" })).toBe(true);
  });

  it("is true for context_overflow", () => {
    expect(shouldCompact({ reason: "context_overflow" })).toBe(true);
  });

  it("is false for unrelated stop reasons", () => {
    expect(shouldCompact({ reason: "end_turn" })).toBe(false);
    expect(shouldCompact({ reason: "tool_use" })).toBe(false);
    expect(shouldCompact({ reason: "" })).toBe(false);
  });
});

describe("renderClipped", () => {
  it("emits an XML-ish conversation envelope tagged by role", () => {
    const out = renderClipped(text("user", "hello world"));
    expect(out).toContain("<conversation>");
    expect(out).toContain("</conversation>");
    expect(out).toContain('role="user"');
    expect(out).toContain("hello world");
  });

  it("renders tool parts with name, input and output", () => {
    const msg: Message = {
      role: "tool",
      parts: [{ type: "tool", name: "grep", input: "foo", output: "bar" }],
    };
    const out = renderClipped(msg);
    expect(out).toContain("grep");
    expect(out).toContain("foo");
    expect(out).toContain("bar");
  });

  it("clips overlong text to CLIP_TEXT_CHARS and appends a truncation marker", () => {
    const big = "x".repeat(CLIP_TEXT_CHARS + 500);
    const out = renderClipped(text("assistant", big));
    expect(out).toContain("x".repeat(CLIP_TEXT_CHARS));
    expect(out).not.toContain("x".repeat(CLIP_TEXT_CHARS + 1));
    expect(out.toLowerCase()).toContain("truncat");
  });

  it("clips tool input and output to CLIP_TOOL_CHARS independently", () => {
    const msg: Message = {
      role: "tool",
      parts: [
        {
          type: "tool",
          name: "shell",
          input: "i".repeat(CLIP_TOOL_CHARS + 100),
          output: "o".repeat(CLIP_TOOL_CHARS + 100),
        },
      ],
    };
    const out = renderClipped(msg);
    expect(out).toContain("i".repeat(CLIP_TOOL_CHARS));
    expect(out).not.toContain("i".repeat(CLIP_TOOL_CHARS + 1));
    expect(out).toContain("o".repeat(CLIP_TOOL_CHARS));
    expect(out).not.toContain("o".repeat(CLIP_TOOL_CHARS + 1));
  });

  it("does not append a marker when nothing was clipped", () => {
    const out = renderClipped(text("user", "short"));
    expect(out.toLowerCase()).not.toContain("truncat");
  });

  it("does not mutate the input message", () => {
    const msg = text("user", "y".repeat(CLIP_TEXT_CHARS + 10));
    const snapshot = JSON.stringify(msg);
    renderClipped(msg);
    expect(JSON.stringify(msg)).toBe(snapshot);
  });
});

describe("split", () => {
  it("greedily packs whole messages into budget-sized chunks", () => {
    // split() estimates the RENDERED (clipped, XML-enveloped) message, not the
    // raw text. Derive the budget from the real rendered size so the test
    // pins packing behaviour, not a guessed envelope length. Uniform "user"
    // role keeps every message the same size.
    const t: Transcript = [
      text("user", "aaaa"),
      text("user", "bbbb"),
      text("user", "cccc"),
      text("user", "dddd"),
      text("user", "eeee"),
    ];
    const per = estimateTokens(renderClipped(text("user", "aaaa")));
    // Budget holds exactly 2 messages (2*per) but not a 3rd.
    const chunks = split(t, per * 2, estimateTokens);
    // 2 + 2 + 1 messages → 3 chunks
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(2);
    expect(chunks[1]).toHaveLength(2);
    expect(chunks[2]).toHaveLength(1);
  });

  it("never splits a single message across chunks", () => {
    const t: Transcript = [text("user", "aaaa"), text("user", "bbbb")];
    const per = estimateTokens(renderClipped(text("user", "aaaa")));
    // Budget holds exactly one message → one message per chunk.
    const chunks = split(t, per, estimateTokens);
    expect(chunks).toHaveLength(2);
    expect(chunks.every((c) => c.length === 1)).toBe(true);
  });

  it("makes an oversize single message its own chunk", () => {
    const small = text("user", "aaaa");
    const huge = text("assistant", "z".repeat(4000));
    const t: Transcript = [small, huge, text("user", "bbbb")];
    const per = estimateTokens(renderClipped(small));
    // Budget holds the small messages but the huge one alone exceeds it.
    const chunks = split(t, per, estimateTokens);
    // small alone, huge alone (oversize fallback), bbbb alone
    expect(chunks).toHaveLength(3);
    const oversize = chunks[1] ?? [];
    expect(oversize).toHaveLength(1);
    expect(oversize[0]).toBe(huge);
  });

  it("returns no chunks for an empty transcript", () => {
    expect(split([], 100, estimateTokens)).toEqual([]);
  });

  it("does not mutate the source transcript", () => {
    const t: Transcript = [text("user", "aaaa"), text("user", "bbbb")];
    const snapshot = JSON.stringify(t);
    split(t, 1, estimateTokens);
    expect(JSON.stringify(t)).toBe(snapshot);
  });
});

describe("compactTranscript — input validation", () => {
  it("rejects a non-array transcript", async () => {
    await expect(
      // @ts-expect-error — exercising the zod boundary
      compactTranscript({ transcript: "nope", usableTokens: 4000, summarize: echoSummarize() }),
    ).rejects.toThrow();
  });

  it("rejects a non-positive usable token budget", async () => {
    await expect(
      compactTranscript({
        transcript: [text("user", "hi")],
        usableTokens: 0,
        summarize: echoSummarize(),
      }),
    ).rejects.toThrow();
  });

  it("rejects a malformed message part", async () => {
    await expect(
      compactTranscript({
        // @ts-expect-error — exercising the zod boundary
        transcript: [{ role: "user", parts: [{ type: "text" }] }],
        usableTokens: 4000,
        summarize: echoSummarize(),
      }),
    ).rejects.toThrow();
  });

  it("accepts a well-formed tool part", async () => {
    const out = await compactTranscript({
      transcript: [
        { role: "tool", parts: [{ type: "tool", name: "ls", input: "-la", output: "files" }] },
      ],
      usableTokens: 4000,
      summarize: echoSummarize(),
    });
    expect(typeof out).toBe("string");
  });
});

describe("summarization prompt rubric", () => {
  it("instructs preservation of paths, commands, errors, decisions and open tasks", async () => {
    const tracker = new TrackingSummarizer();
    await compactTranscript({
      transcript: [text("user", "do the thing"), text("assistant", "done")],
      usableTokens: 4000,
      summarize: tracker.summarize,
    });
    const joined = tracker.prompts.join("\n").toLowerCase();
    expect(joined).toContain("file path");
    expect(joined).toContain("command");
    expect(joined).toContain("error");
    expect(joined).toContain("decision");
    // "outstanding" / "unresolved" tasks
    expect(joined).toMatch(/unresolved|outstanding/);
  });
});

describe("concurrency limiter", () => {
  it("never runs more than CONCURRENCY chunk summaries at once", async () => {
    const tracker = new TrackingSummarizer(6);
    // Each message alone exceeds the (MIN_BUDGET-floored) budget, so split()
    // emits one chunk per message → 20 independent chunk summaries that the
    // limiter must fan out at most CONCURRENCY at a time.
    const t: Transcript = Array.from({ length: 20 }, (_, i) =>
      text("user", `m${i}-${"x".repeat(5000)}`),
    );
    await compactTranscript({
      transcript: t,
      usableTokens: 2000,
      summarize: tracker.summarize,
    });
    expect(tracker.prompts.length).toBeGreaterThan(CONCURRENCY);
    expect(tracker.maxInFlight).toBeLessThanOrEqual(CONCURRENCY);
    expect(tracker.maxInFlight).toBeGreaterThan(1);
  });
});

describe("reduce — recursive map-reduce", () => {
  it("collapses many partial summaries into a single string", async () => {
    const t: Transcript = Array.from({ length: 30 }, (_, i) =>
      text("user", `message number ${i} with some body`),
    );
    const out = await compactTranscript({
      transcript: t,
      usableTokens: 2500,
      summarize: echoSummarize("R"),
    });
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  it("bounds recursion to REDUCE_DEPTH levels even when summaries stay large", async () => {
    let calls = 0;
    // A summarizer that NEVER shrinks: always returns a big block so the
    // reducer can never satisfy the budget and must stop at REDUCE_DEPTH.
    const neverShrinks = async (_p: string): Promise<string> => {
      calls += 1;
      return "B".repeat(5000);
    };
    const t: Transcript = Array.from({ length: 16 }, (_, i) =>
      text("user", `chunk-seed-${i}-${"q".repeat(40)}`),
    );
    const out = await compactTranscript({
      transcript: t,
      usableTokens: 2000,
      summarize: neverShrinks,
    });
    // Terminates (does not recurse forever) and applies the output cap.
    expect(calls).toBeGreaterThan(0);
    expect(calls).toBeLessThan(1000);
    expect(estimateTokens(out)).toBeLessThanOrEqual(OUTPUT_TOKEN_CAP);
  });

  it("caps the final combined summary at OUTPUT_TOKEN_CAP and marks the truncation", async () => {
    // Single chunk whose summary massively overshoots the cap.
    const overshoot = async (_p: string): Promise<string> => "Z".repeat(40_000);
    const out = await compactTranscript({
      transcript: [text("user", "small input")],
      usableTokens: 4000,
      summarize: overshoot,
    });
    expect(estimateTokens(out)).toBeLessThanOrEqual(OUTPUT_TOKEN_CAP);
    expect(out.toLowerCase()).toContain("truncat");
  });

  it("passes a single small summary straight through without re-summarizing", async () => {
    let calls = 0;
    const counting = async (_p: string): Promise<string> => {
      calls += 1;
      return "tiny";
    };
    await compactTranscript({
      transcript: [text("user", "hi")],
      usableTokens: 4000,
      summarize: counting,
    });
    // Exactly one map call; no reduce pass needed for a lone fitting summary.
    expect(calls).toBe(1);
  });
});

describe("fail-closed sentinel", () => {
  it('returns "compact" when a chunk (MAP) summarization rejects', async () => {
    // Oversized messages → one chunk each → multiple MAP summarize calls; the
    // 2nd rejects, so the orchestrator must fail closed rather than splice a
    // partial recap built from only the 1st chunk.
    const t: Transcript = Array.from({ length: 12 }, (_, i) =>
      text("user", `m${i}-${"x".repeat(5000)}`),
    );
    const out = await compactTranscript({
      transcript: t,
      usableTokens: 2000,
      summarize: failOnCall(2),
    });
    expect(out).toBe("compact");
  });

  it('returns "compact" when a reduce-group summarization rejects', async () => {
    // 6 oversized messages → 6 chunks → 6 MAP calls (1-6) that all succeed and
    // return LARGE partials so the budget is NOT satisfied and a real reduce
    // pass runs. Reduce groups 6 partials into 3 pairs → calls 7,8,9; call 7
    // rejects, exercising a reduce-group failure specifically.
    let calls = 0;
    const bigThenFail = async (_p: string): Promise<string> => {
      calls += 1;
      if (calls === 7) {
        throw new Error("model overloaded mid-reduce");
      }
      return "D".repeat(8000);
    };
    const t: Transcript = Array.from({ length: 6 }, (_, i) =>
      text("user", `seed-${i}-${"y".repeat(5000)}`),
    );
    const out = await compactTranscript({
      transcript: t,
      usableTokens: 2000,
      summarize: bigThenFail,
    });
    expect(calls).toBeGreaterThanOrEqual(7);
    expect(out).toBe("compact");
  });

  it("never returns an empty or partial summary on failure", async () => {
    const out = await compactTranscript({
      transcript: [text("user", "a"), text("user", "b"), text("user", "c")],
      usableTokens: 1500,
      summarize: async () => {
        throw new Error("always down");
      },
    });
    expect(out).toBe("compact");
  });
});

describe("end-to-end happy path", () => {
  it("produces a non-empty deterministic summary for a realistic transcript", async () => {
    const transcript: Transcript = [
      text("system", "You are a coding agent."),
      text("user", "Run the test suite at packages/foo and report failures."),
      {
        role: "assistant",
        parts: [{ type: "text", text: "Running `pnpm test` now." }],
      },
      {
        role: "tool",
        parts: [
          {
            type: "tool",
            name: "shell",
            input: "pnpm test",
            output: "1 failing: expected 3 received 4",
          },
        ],
      },
      text("assistant", "Decision: patch the off-by-one in sum(). Outstanding: re-run suite."),
    ];
    const first = await compactTranscript({
      transcript,
      usableTokens: 8000,
      summarize: echoSummarize("E"),
      base: charBase,
    });
    const second = await compactTranscript({
      transcript,
      usableTokens: 8000,
      summarize: echoSummarize("E"),
      base: charBase,
    });
    expect(first.length).toBeGreaterThan(0);
    expect(first).not.toBe("compact");
    // Deterministic given the same injected summarize + base.
    expect(first).toBe(second);
  });

  it("does not mutate the caller's transcript end-to-end", async () => {
    const transcript: Transcript = [
      text("user", "p".repeat(CLIP_TEXT_CHARS + 50)),
      {
        role: "tool",
        parts: [{ type: "tool", name: "x", input: "i", output: "o" }],
      },
    ];
    const snapshot = JSON.stringify(transcript);
    await compactTranscript({
      transcript,
      usableTokens: 3000,
      summarize: echoSummarize(),
    });
    expect(JSON.stringify(transcript)).toBe(snapshot);
  });
});
