import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * README template drift guard.
 *
 * For each of the three locales we ship, the rendered `README*.md` must
 * be byte-identical to what `pnpm brand:apply` would produce from its
 * paired `README*.template.md`. This catches the failure mode that bit
 * us in 2026-05: developers editing the rendered file directly, then
 * `brand:apply` later overwriting their work because the template was
 * stale.
 *
 * The test snapshots all three rendered READMEs, runs the brand-apply
 * script in a way that doesn't touch the working tree (it writes back
 * to the same files, so we restore them after), and asserts the diff
 * is empty. If you legitimately want to update a README, edit the
 * template and run `pnpm brand:apply` — that's the supported path.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const LOCALES = [
  { rendered: "README.md", template: "README.template.md" },
  { rendered: "README.zh-CN.md", template: "README.zh-CN.template.md" },
  { rendered: "README.ja.md", template: "README.ja.template.md" },
];

describe("README template drift", () => {
  it("every rendered README matches what `brand:apply` would emit from its template", () => {
    // Snapshot current rendered files so we can restore them after the
    // brand:apply run modifies them in place.
    const snapshots = LOCALES.map(({ rendered }) => {
      const src = join(ROOT, rendered);
      const tmpPath = join(tmpdir(), `readme-drift-${Date.now()}-${rendered}`);
      copyFileSync(src, tmpPath);
      return { src, tmpPath, originalBytes: readFileSync(src, "utf8") };
    });

    try {
      // Run the script. It exits non-zero on internal failure; vitest
      // surfaces that as a clear failure of *this* assertion.
      execFileSync("pnpm", ["brand:apply"], {
        cwd: ROOT,
        stdio: "pipe",
      });

      // Compare post-run bytes against the snapshot.
      for (const { src, originalBytes } of snapshots) {
        const after = readFileSync(src, "utf8");
        expect(
          after,
          `${src.replace(ROOT + "/", "")} drift detected — the rendered file does not match what \`pnpm brand:apply\` would produce. ` +
            `Either (a) port your edits into the matching template file and re-run \`pnpm brand:apply\`, ` +
            `or (b) commit both files together.`,
        ).toBe(originalBytes);
      }
    } finally {
      // Always restore — never let the test leave the working tree dirty,
      // even on failure.
      for (const { src, tmpPath } of snapshots) {
        copyFileSync(tmpPath, src);
      }
    }
  });

  it("every locale in LOCALES has a template + rendered file actually present", () => {
    for (const { rendered, template } of LOCALES) {
      const renderedPath = join(ROOT, rendered);
      const templatePath = join(ROOT, template);
      expect(() => readFileSync(renderedPath, "utf8"), rendered).not.toThrow();
      expect(() => readFileSync(templatePath, "utf8"), template).not.toThrow();
    }
  });
});
