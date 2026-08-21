/**
 * The generator and the runtime resolver must select by the same rules.
 *
 * `scripts/generate-frontier-models.mjs` picks the offline fallback; `catalog.ts`
 * picks the online model. If their patterns diverge, the fallback stops being
 * "the same choice, resolved earlier" and silently becomes a different model —
 * which is the failure the generator exists to prevent, reintroduced one layer
 * down.
 *
 * Keeping one copy of the rules would be better than testing two, but the
 * generator is plain `.mjs` run by `pnpm` outside any package and the runtime is
 * TS inside one, so a shared import would mean a build step in front of a
 * script whose entire job is to be runnable. Parity is checked instead.
 */

import { describe, expect, it } from "vitest";

import { TIER_MATCHERS } from "../../../../scripts/generate-frontier-models.mjs";
import { FRONTIER_FALLBACK, TIER_RULES } from "./catalog";

describe("frontier tier rules", () => {
  it("covers the same tiers in the generator and the resolver", () => {
    expect(Object.keys(TIER_MATCHERS).sort()).toEqual(Object.keys(TIER_RULES).sort());
  });

  for (const [tier, rule] of Object.entries(TIER_RULES)) {
    it(`${tier}: generator and resolver match on the same patterns`, () => {
      const matcher = TIER_MATCHERS[tier as keyof typeof TIER_MATCHERS];
      expect(matcher).toBeDefined();
      expect(new RegExp(matcher.include).source).toBe(rule.include.source);
      expect(new RegExp(matcher.exclude).source).toBe(rule.exclude.source);
    });
  }

  it("excludes batch-only endpoints from every tier", () => {
    // OpenRouter lists `<model>:batch` beside most frontier models. It matches
    // every family pattern and cannot serve an interactive stream, so selecting
    // one is a hang, not a downgrade.
    for (const [tier, rule] of Object.entries(TIER_RULES)) {
      const batchId = `${FRONTIER_FALLBACK[tier as keyof typeof FRONTIER_FALLBACK]}:batch`;
      expect(rule.include.test(batchId), `${tier} include should still match ${batchId}`).toBe(
        true,
      );
      expect(rule.exclude.test(batchId), `${tier} must exclude ${batchId}`).toBe(true);
    }
  });

  it("has a generated fallback for every tier, in gateway id form", () => {
    for (const [tier, rule] of Object.entries(TIER_RULES)) {
      const id = FRONTIER_FALLBACK[tier as keyof typeof FRONTIER_FALLBACK];
      expect(id, `${tier} has no fallback`).toBeTruthy();
      // A fallback the rules themselves would reject means the generated file
      // was hand-edited, or the rules changed without regenerating.
      expect(rule.include.test(id), `${tier} fallback ${id} does not match its own rule`).toBe(
        true,
      );
      expect(rule.exclude.test(id), `${tier} fallback ${id} is an excluded variant`).toBe(false);
    }
  });

  it("names no model generation that the repo has already moved past", () => {
    // A cheap, offline canary for the specific drift that prompted this: the
    // Anthropic tiers sat on 4.6/4.8 for two releases after 5 shipped. This is
    // not a general freshness check — `pnpm gen:frontier-models:check` is, and
    // it needs the network.
    const retired = ["claude-sonnet-4.6", "claude-opus-4.8", "gpt-5.5", "gemini-3.5-flash"];
    for (const id of Object.values(FRONTIER_FALLBACK)) {
      expect(
        retired,
        `${id} was current in 2026-06; run \`pnpm gen:frontier-models\``,
      ).not.toContain(id.slice(id.indexOf("/") + 1));
    }
  });
});
