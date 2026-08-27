import { describe, expect, it } from "vitest";
import {
  buildCommitPrompt,
  CommitMessageError,
  type CompletionModel,
  DEFAULT_ABORT_MS,
  DEFAULT_TEMPERATURE,
  type GitContext,
  generateCommitMessage,
  MAX_RETRIES,
  stripFormatting,
} from "./commit-message.js";

const ctx: GitContext = {
  branch: "feat/access-invites",
  recentCommits: ["feat(web): manage access invites", "chore(web): remove stale helper"],
  files: [
    { status: "M", path: "apps/web/src/invites.ts", diff: "@@ -1 +1 @@\n-old\n+new" },
    { status: "A", path: "apps/web/src/invites.test.ts", diff: "@@ +1 @@\n+added" },
  ],
};

/**
 * Deterministic fake model. `script` yields one resolution per `complete()`
 * call; an Error value is thrown (a "rejection"), a string is returned. Records
 * every invocation so prompt/temperature/abort wiring can be asserted.
 */
class ScriptedModel implements CompletionModel {
  #i = 0;
  readonly calls: Array<{
    system: string;
    user: string;
    temperature: number;
    abortMs: number;
  }> = [];
  constructor(private readonly script: ReadonlyArray<string | Error>) {}
  async complete(p: {
    system: string;
    user: string;
    temperature: number;
    abortMs: number;
  }): Promise<string> {
    this.calls.push({ ...p });
    const step = this.script[this.#i] ?? this.script[this.script.length - 1];
    this.#i += 1;
    if (step instanceof Error) {
      throw step;
    }
    return step as string;
  }
}

describe("buildCommitPrompt", () => {
  it("encodes the Conventional Commits type list in the system prompt", () => {
    const { system } = buildCommitPrompt(ctx);
    for (const t of [
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "perf",
      "test",
      "build",
      "ci",
      "chore",
    ]) {
      expect(system).toContain(t);
    }
  });

  it("instructs imperative mood in the system prompt", () => {
    const { system } = buildCommitPrompt(ctx);
    expect(system.toLowerCase()).toContain("imperative");
  });

  it("instructs returning only the commit message (no fences/commentary)", () => {
    const { system } = buildCommitPrompt(ctx);
    const lower = system.toLowerCase();
    expect(lower).toContain("only");
    expect(lower).toContain("commit message");
  });

  it("describes the type(scope): subject shape", () => {
    const { system } = buildCommitPrompt(ctx);
    expect(system).toContain("type(scope): subject");
  });

  it("renders the branch into the user prompt", () => {
    const { user } = buildCommitPrompt(ctx);
    expect(user).toContain("feat/access-invites");
  });

  it("renders the recent commits into the user prompt", () => {
    const { user } = buildCommitPrompt(ctx);
    expect(user).toContain("feat(web): manage access invites");
    expect(user).toContain("chore(web): remove stale helper");
  });

  it("renders per-file status, path, and diff into the user prompt", () => {
    const { user } = buildCommitPrompt(ctx);
    expect(user).toContain("M");
    expect(user).toContain("apps/web/src/invites.ts");
    expect(user).toContain("@@ -1 +1 @@");
    expect(user).toContain("A");
    expect(user).toContain("apps/web/src/invites.test.ts");
  });

  it("omits a negative-constraint block when no previous message is given", () => {
    const { user } = buildCommitPrompt(ctx);
    expect(user.toLowerCase()).not.toContain("already generated and rejected");
  });

  it("appends a negative-constraint block when previous is provided", () => {
    const { user } = buildCommitPrompt(ctx, { previous: "feat: do the thing" });
    expect(user.toLowerCase()).toContain("already generated and rejected");
    expect(user).toContain("feat: do the thing");
    expect(user.toLowerCase()).toContain("materially different");
  });

  it("treats an explicit undefined previous as 'no previous'", () => {
    const { user } = buildCommitPrompt(ctx, { previous: undefined });
    expect(user.toLowerCase()).not.toContain("already generated and rejected");
  });
});

describe("stripFormatting", () => {
  it("returns plain text untouched (only trimmed)", () => {
    expect(stripFormatting("feat: add login")).toBe("feat: add login");
  });

  it("strips a plain triple-backtick fence", () => {
    expect(stripFormatting("```\nfeat: add login\n```")).toBe("feat: add login");
  });

  it("strips a fence with a language tag", () => {
    expect(stripFormatting("```text\nfeat: add login\n```")).toBe("feat: add login");
    expect(stripFormatting("```bash\nfix: patch parser\n```")).toBe("fix: patch parser");
  });

  it("strips surrounding double quotes", () => {
    expect(stripFormatting('"feat: add login"')).toBe("feat: add login");
  });

  it("strips surrounding single quotes", () => {
    expect(stripFormatting("'feat: add login'")).toBe("feat: add login");
  });

  it("trims surrounding whitespace", () => {
    expect(stripFormatting("   \n feat: add login \n  ")).toBe("feat: add login");
  });

  it("strips fence then trims inner content", () => {
    expect(stripFormatting("```\n\n  fix: trim me  \n\n```")).toBe("fix: trim me");
  });
});

describe("generateCommitMessage", () => {
  it("returns the stripped message on a clean first response", async () => {
    const model = new ScriptedModel(["```\nfeat(web): add invites\n```"]);
    const msg = await generateCommitMessage({ ctx, model });
    expect(msg).toBe("feat(web): add invites");
    expect(model.calls).toHaveLength(1);
  });

  it("passes the default temperature and abort budget through to the model", async () => {
    const model = new ScriptedModel(["feat: ok"]);
    await generateCommitMessage({ ctx, model });
    expect(model.calls[0]?.temperature).toBe(DEFAULT_TEMPERATURE);
    expect(model.calls[0]?.abortMs).toBe(DEFAULT_ABORT_MS);
    expect(DEFAULT_TEMPERATURE).toBe(0.3);
    expect(DEFAULT_ABORT_MS).toBe(30000);
  });

  it("forwards the built prompt to the model", async () => {
    const model = new ScriptedModel(["feat: ok"]);
    await generateCommitMessage({ ctx, model });
    expect(model.calls[0]?.user).toContain("feat/access-invites");
    expect(model.calls[0]?.system).toContain("feat");
  });

  it("retries after a rejection then succeeds", async () => {
    const model = new ScriptedModel([new Error("model unavailable"), "fix: recovered"]);
    const msg = await generateCommitMessage({ ctx, model });
    expect(msg).toBe("fix: recovered");
    expect(model.calls).toHaveLength(2);
  });

  it("retries after empty/whitespace output then succeeds", async () => {
    const model = new ScriptedModel(["   \n  ", "feat: now valid"]);
    const msg = await generateCommitMessage({ ctx, model });
    expect(msg).toBe("feat: now valid");
    expect(model.calls).toHaveLength(2);
  });

  it("treats a fence wrapping only whitespace as empty and retries", async () => {
    const model = new ScriptedModel(["```\n   \n```", "chore: real"]);
    const msg = await generateCommitMessage({ ctx, model });
    expect(msg).toBe("chore: real");
    expect(model.calls).toHaveLength(2);
  });

  it("throws CommitMessageError after MAX_RETRIES exhausted (fail closed)", async () => {
    const model = new ScriptedModel([new Error("down"), new Error("down"), new Error("down")]);
    await expect(generateCommitMessage({ ctx, model })).rejects.toBeInstanceOf(CommitMessageError);
    expect(model.calls).toHaveLength(MAX_RETRIES);
    expect(MAX_RETRIES).toBe(3);
  });

  it("never returns an empty message — throws when every attempt is blank", async () => {
    const model = new ScriptedModel(["", "  ", "```\n```"]);
    await expect(generateCommitMessage({ ctx, model })).rejects.toBeInstanceOf(CommitMessageError);
    expect(model.calls).toHaveLength(MAX_RETRIES);
  });

  it("threads the negative constraint through when opts.previous is set", async () => {
    const model = new ScriptedModel(["feat: a different one"]);
    await generateCommitMessage({
      ctx,
      model,
      opts: { previous: "feat: the rejected one" },
    });
    expect(model.calls[0]?.user.toLowerCase()).toContain("already generated and rejected");
    expect(model.calls[0]?.user).toContain("feat: the rejected one");
  });

  it("zod-rejects a context missing branch", async () => {
    const model = new ScriptedModel(["feat: ok"]);
    const bad = { recentCommits: [], files: [] } as unknown as GitContext;
    await expect(generateCommitMessage({ ctx: bad, model })).rejects.toBeDefined();
  });

  it("zod-rejects a context whose files have the wrong shape", async () => {
    const model = new ScriptedModel(["feat: ok"]);
    const bad = {
      branch: "main",
      recentCommits: [],
      files: [{ status: "M" }],
    } as unknown as GitContext;
    await expect(generateCommitMessage({ ctx: bad, model })).rejects.toBeDefined();
  });

  it("CommitMessageError is a typed Error subclass with a name", () => {
    const err = new CommitMessageError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CommitMessageError");
    expect(err.message).toBe("boom");
  });
});
