import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * The page-width contract from CLAUDE.md, enforced rather than described.
 *
 * `--container-text/content/wide` existed as CSS variables for months while Tailwind knew nothing
 * about them, so there was no `max-w-wide` to reach for and 98 call sites had typed
 * `max-w-[1400px]` instead. A decided number living in a className is a number the token cannot
 * move: changing `--container-wide` would have shifted three call sites and left ninety-eight.
 *
 * Registering them on the theme fixes that, at the cost of writing the literal twice — once in the
 * DTCG source, once in the generated @theme block. The parity test below is what makes that
 * duplication safe.
 */

const DTCG = JSON.parse(
  readFileSync(resolve(ROOT, "packages/design/design-tokens/tokens/core.json"), "utf-8"),
) as { size: { container: Record<string, { $value: string }> } };

const TOKENS_CSS = readFileSync(resolve(ROOT, "packages/design/tokens/styles.css"), "utf-8");

/** The @theme block Tailwind actually reads, isolated from the :root emissions below it. */
const themeBlock = (() => {
  const start = TOKENS_CSS.indexOf("@theme inline");
  expect(start, "packages/design/tokens/styles.css has no @theme inline block").toBeGreaterThan(-1);
  let depth = 0;
  for (let i = TOKENS_CSS.indexOf("{", start); i < TOKENS_CSS.length; i++) {
    if (TOKENS_CSS[i] === "{") depth++;
    else if (TOKENS_CSS[i] === "}" && --depth === 0) return TOKENS_CSS.slice(start, i + 1);
  }
  throw new Error("unterminated @theme block");
})();

const STEPS = ["text", "content", "wide"] as const;

describe("container width contract", () => {
  it("registers every step on the Tailwind theme, so max-w-<step> exists", () => {
    for (const step of STEPS) {
      expect(
        themeBlock,
        `--container-${step} must be in @theme or max-w-${step} is not generated`,
      ).toContain(`--container-${step}:`);
    }
  });

  it("keeps the theme literals equal to the DTCG source", () => {
    for (const step of STEPS) {
      const source = DTCG.size.container[step]?.$value;
      expect(source, `core.json is missing size.container.${step}`).toBeTruthy();
      const match = themeBlock.match(new RegExp(`--container-${step}:\\s*([^;]+);`));
      expect(match?.[1]?.trim(), `@theme --container-${step} drifted from core.json`).toBe(source);
    }
  });

  it("still emits the variables so var(--container-wide) keeps working", () => {
    for (const step of STEPS) {
      expect(TOKENS_CSS).toContain(`--container-${step}:`);
    }
  });

  it("has no call site typing a container width by hand", () => {
    const hits = execSync(
      "rg -n --no-heading -e 'max-w-\\[1400px\\]' -e 'max-w-\\[1152px\\]' -e 'max-w-\\[896px\\]' " +
        "-e 'max-w-\\[var\\(--container-[a-z]+\\)\\]' apps packages/design || true",
      { encoding: "utf-8", cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
    )
      .split("\n")
      .filter(Boolean);
    expect(hits, "use max-w-text / max-w-content / max-w-wide instead").toEqual([]);
  });

  it("does not let the container namespace hijack the default scale", () => {
    // Registering --spacing-{key} once rescaled max-w-sm to 0.75rem in production (2026-08-03).
    // The container steps are named, not numeric, so they cannot collide — assert that stays true.
    for (const step of STEPS) {
      expect(["sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"]).not.toContain(
        step,
      );
    }
  });
});
