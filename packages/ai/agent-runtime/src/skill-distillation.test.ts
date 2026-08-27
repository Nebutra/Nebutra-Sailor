import { describe, expect, it, vi } from "vitest";
import {
  type DistilledSkill,
  distillSkill,
  improveSkill,
  isDistillable,
  type Synthesizer,
  shouldNudgePersist,
  type Trajectory,
} from "./skill-distillation.js";

const goodTraj = (over: Partial<Trajectory> = {}): Trajectory => ({
  tenantId: "org_1",
  sessionId: "sess_1",
  goal: "Refactor the billing module to use the provider-agnostic adapter",
  outcome: "success",
  steps: [
    { kind: "message", input: "start" },
    { kind: "tool", name: "ReadFile", input: { path: "a.ts" }, output: "ok" },
    { kind: "observation", output: "found 3 callers" },
    { kind: "tool", name: "EditFile", input: { path: "a.ts" }, output: "patched" },
    { kind: "tool", name: "RunTests", output: "pass" },
  ],
  ...over,
});

const fallback: Synthesizer = async () => ({
  name: "Billing Adapter Refactor",
  description: "Refactor billing toward the provider-agnostic adapter",
  whenToUse: "When migrating billing code to the shared adapter",
  body: "1. Read callers\n2. Edit\n3. Run tests",
  // intentionally over-broad — must be clamped to used tools
  allowedTools: ["ReadFile", "EditFile", "RunTests", "DeployProd"],
});

describe("isDistillable", () => {
  it("rejects a failed trajectory", () => {
    const r = isDistillable(goodTraj({ outcome: "failure" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it("rejects a partial trajectory", () => {
    expect(isDistillable(goodTraj({ outcome: "partial" })).ok).toBe(false);
  });

  it("rejects too-few tool steps", () => {
    const r = isDistillable(goodTraj({ steps: [{ kind: "tool", name: "ReadFile" }] }));
    expect(r.ok).toBe(false);
  });

  it("rejects a trivial goal", () => {
    expect(isDistillable(goodTraj({ goal: "hi" })).ok).toBe(false);
  });

  it("accepts a good trajectory", () => {
    expect(isDistillable(goodTraj()).ok).toBe(true);
  });

  it("honors a configurable minimum tool count", () => {
    expect(isDistillable(goodTraj(), { minToolSteps: 99 }).ok).toBe(false);
  });
});

describe("distillSkill", () => {
  it("clamps allowedTools to tools actually used (least privilege)", async () => {
    const s = await distillSkill(goodTraj(), fallback);
    expect([...s.frontmatter.allowedTools].sort()).toEqual(
      ["EditFile", "ReadFile", "RunTests"].sort(),
    );
    expect(s.frontmatter.allowedTools).not.toContain("DeployProd");
  });

  it("produces a kebab slug and carries tenant + provenance", async () => {
    const s = await distillSkill(goodTraj(), fallback);
    expect(s.slug).toBe("billing-adapter-refactor");
    expect(s.tenantId).toBe("org_1");
    expect(s.sourceTier).toBe("dynamic");
    expect(s.provenance.sessionId).toBe("sess_1");
    expect(s.provenance.stepCount).toBe(5);
    expect(typeof s.provenance.distilledAt).toBe("string");
  });

  it("builds a deterministic prompt (snapshot) and passes it to synthesize", async () => {
    const spy = vi.fn(fallback);
    await distillSkill(goodTraj(), spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toMatchInlineSnapshot(`
      "Distill a reusable skill from this successful trajectory.

      Goal: Refactor the billing module to use the provider-agnostic adapter

      Tools used (in order): ReadFile, EditFile, RunTests

      Salient observations:
      - found 3 callers

      Produce a concise, generalizable skill (name, description, whenToUse, body, allowedTools)."
    `);
  });

  it("fails closed on empty tenant", async () => {
    await expect(distillSkill(goodTraj({ tenantId: "" }), fallback)).rejects.toThrow();
  });

  it("does not mutate the input trajectory", async () => {
    const t = goodTraj();
    const snap = JSON.stringify(t);
    await distillSkill(t, fallback);
    expect(JSON.stringify(t)).toBe(snap);
  });
});

describe("improveSkill", () => {
  const base = async (): Promise<DistilledSkill> => distillSkill(goodTraj(), fallback);

  it("bumps version and unions tools clamped to used", async () => {
    const existing = await base();
    const newTraj = goodTraj({
      steps: [
        { kind: "tool", name: "ReadFile" },
        { kind: "tool", name: "Lint" },
        { kind: "tool", name: "RunTests" },
      ],
    });
    const improved = await improveSkill(existing, newTraj, async () => ({
      name: existing.frontmatter.name,
      description: "better",
      whenToUse: "later",
      body: "improved body",
      allowedTools: ["ReadFile", "Lint", "RunTests", "DeployProd"],
    }));
    expect(improved.provenance.version).toBe((existing.provenance.version ?? 1) + 1);
    // union of existing used (Read/Edit/RunTests) + new used (Read/Lint/RunTests)
    expect([...improved.frontmatter.allowedTools].sort()).toEqual(
      ["EditFile", "Lint", "ReadFile", "RunTests"].sort(),
    );
    expect(improved.body).toBe("improved body");
  });

  it("throws on tenant mismatch", async () => {
    const existing = await base();
    await expect(
      improveSkill(existing, goodTraj({ tenantId: "org_2" }), fallback),
    ).rejects.toThrow();
  });

  it("does not mutate the existing skill", async () => {
    const existing = await base();
    const snap = JSON.stringify(existing);
    await improveSkill(existing, goodTraj(), fallback);
    expect(JSON.stringify(existing)).toBe(snap);
  });
});

describe("shouldNudgePersist", () => {
  it("nudges on enough unsaved successes", () => {
    expect(shouldNudgePersist({ turnsSinceLastDistill: 1, unsavedSuccesses: 3 })).toBe(true);
  });

  it("nudges on enough turns", () => {
    expect(shouldNudgePersist({ turnsSinceLastDistill: 50, unsavedSuccesses: 0 })).toBe(true);
  });

  it("does not nudge below thresholds", () => {
    expect(shouldNudgePersist({ turnsSinceLastDistill: 2, unsavedSuccesses: 1 })).toBe(false);
  });

  it("honors custom thresholds", () => {
    expect(
      shouldNudgePersist(
        { turnsSinceLastDistill: 0, unsavedSuccesses: 1 },
        { minUnsavedSuccesses: 1 },
      ),
    ).toBe(true);
  });
});
