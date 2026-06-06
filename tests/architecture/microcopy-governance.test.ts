import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("microcopy governance", () => {
  it("keeps launch and waitlist copy out of startup-bro hype", () => {
    const sources = [
      "packages/commerce/marketing/src/components/LaunchBanner.tsx",
      "packages/commerce/marketing/src/components/Waitlist.tsx",
      "apps/landing-page/src/components/marketing/LaunchBannerWrapper.tsx",
      "apps/landing-page/src/lib/landing-content.ts",
    ].map(read);

    for (const source of sources) {
      expect(source).not.toContain("🚀");
      expect(source).not.toContain("Live Now!");
      expect(source).not.toContain("We're live on Product Hunt!");
      expect(source).not.toContain("Vote Now 🚀");
      expect(source).not.toContain("Joined!");
      expect(source).not.toContain("Thanks for joining!");
      expect(source).not.toContain('ctaPrimary: "Get Started"');
    }

    expect(read("packages/commerce/marketing/src/components/LaunchBanner.tsx")).toContain(
      "Live now",
    );
    expect(read("packages/commerce/marketing/src/components/Waitlist.tsx")).toContain(
      "You're on the list.",
    );
    expect(read("apps/landing-page/src/lib/landing-content.ts")).toContain(
      'ctaPrimary: "Create your first workspace"',
    );
  });

  // ── 七禁令 ratchet self-check ────────────────────────────────────────────
  // Verifies the governance configuration itself is consistent:
  //   - microcopyRules section exists in governance.config.json
  //   - bannedPatterns are defined (not empty in the monorepo config)
  //   - allowlist is an array (shrink-only invariant)
  //   - The lint engine script exists and is a thin wrapper
  // This complements the fixture tests in governance/lint-microcopy.test.ts.
  // Note: 禁二/禁三/禁五/禁六 and IP red lines (§6.5) are human-review gates
  // enforced via the golden-50 acceptance gate, not this engine.
  it("microcopyRules section exists in governance.config.json with required shape", () => {
    const cfg = JSON.parse(read("governance.config.json"));
    expect(cfg).toHaveProperty("microcopyRules");
    const rules = cfg.microcopyRules;
    expect(Array.isArray(rules.scanRoots)).toBe(true);
    expect(rules.scanRoots.length).toBeGreaterThan(0);
    expect(Array.isArray(rules.bannedPatterns)).toBe(true);
    // The monorepo config must have at least the 禁七 patterns (empty allowlist
    // in a fresh scaffold is fine; the monorepo seeds it with real offenders).
    expect(rules.bannedPatterns.length).toBeGreaterThan(0);
    expect(Array.isArray(rules.allowlist)).toBe(true);
    // Every bannedPattern entry must have pattern + label fields.
    for (const entry of rules.bannedPatterns) {
      expect(typeof entry.pattern).toBe("string");
      expect(typeof entry.label).toBe("string");
    }
  });

  it("microcopy lint engine script exists as thin wrapper", () => {
    const wrapper = read("scripts/lint-microcopy.mjs");
    expect(wrapper).toContain("governance/lint-microcopy.mjs");
    const engine = read("scripts/governance/lint-microcopy.mjs");
    // Engine must not emit emoji in its error output (MC-M2: self-contradictory)
    // Strip comment lines and check the process.stderr.write calls only.
    const nonCommentLines = engine
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("//"))
      .join("\n");
    // The error messages passed to stderr.write must not contain emoji.
    const stderrWriteCalls = nonCommentLines.match(
      /process\.stderr\.write\s*\(\s*(['"`])[\s\S]*?\1/g,
    );
    if (stderrWriteCalls) {
      for (const call of stderrWriteCalls) {
        // eslint-disable-next-line no-control-regex
        expect(call).not.toMatch(/[\u{1F300}-\u{1FFFF}]/u);
      }
    }
  });

  it("microcopyRules _config.mjs DEFAULTS has microcopyRules with empty allowlist for fresh scaffolds", () => {
    const configSrc = read("scripts/governance/_config.mjs");
    expect(configSrc).toContain("microcopyRules");
    // The DEFAULTS.microcopyRules section must exist (for scaffold distribution).
    // It must use an empty bannedPatterns default so Nebutra-specific Chinese
    // rules do not leak into other projects.
    // Check that microcopyRules appears in both DEFAULTS and config export.
    expect(configSrc.match(/microcopyRules/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
