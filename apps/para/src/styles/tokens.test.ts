import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every PARA-namespaced utility a component asks for must exist in the token layer.
 *
 * A class Tailwind does not recognise is not an error. It stays in the markup, the element carries
 * it, and it does nothing — the same silent-drop failure CLAUDE.md documents for a token in the
 * wrong slot. This shipped: `max-w-wide` reached production on the home surface, left over from an
 * experiment whose `@theme` registration was reverted while the call site was not, so `<main>` had
 * no width constraint at all and nothing failed.
 *
 * Reading the built CSS would be stronger but needs a build. This is the cheap half: it catches a
 * call site referring to a `para` utility the shell never defined.
 */

const SRC = join(__dirname, "..");
const shell = readFileSync(join(SRC, "styles/shell.css"), "utf-8");

/** Theme keys declared in shell.css, e.g. `--container-para-surface` -> `para-surface`. */
function declaredParaKeys(namespace: string): Set<string> {
  const re = new RegExp(`--${namespace}-(para-[a-z-]+):`, "g");
  const out = new Set<string>();
  for (const m of shell.matchAll(re)) if (m[1]) out.add(m[1]);
  return out;
}

/** `para`-namespaced utilities used across the app, by Tailwind prefix. */
function usedParaUtilities(prefixes: string[]): Map<string, string[]> {
  const files = execFiles();
  const used = new Map<string, string[]>();
  for (const prefix of prefixes) {
    const re = new RegExp(`\\b${prefix}-(para-[a-z-]+)\\b`, "g");
    const hits: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      for (const m of src.matchAll(re)) if (m[1]) hits.push(m[1]);
    }
    used.set(prefix, [...new Set(hits)]);
  }
  return used;
}

function execFiles(): string[] {
  const { execSync } = require("node:child_process") as typeof import("node:child_process");
  return execSync(`find ${SRC} -name '*.tsx' -not -path '*/node_modules/*'`, { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean);
}

describe("PARA token layer", () => {
  it("defines every para-namespaced container utility a component uses", () => {
    const declared = declaredParaKeys("container");
    const used = usedParaUtilities(["max-w", "w", "min-w"]);
    const missing: string[] = [];
    for (const [prefix, keys] of used) {
      for (const key of keys) if (!declared.has(key)) missing.push(`${prefix}-${key}`);
    }
    expect(missing, `no --container-* token in shell.css backs these classes`).toEqual([]);
  });

  it("defines every para-namespaced aspect utility a component uses", () => {
    const declared = declaredParaKeys("aspect");
    const missing = (usedParaUtilities(["aspect"]).get("aspect") ?? []).filter(
      (k) => !declared.has(k),
    );
    expect(missing, `no --aspect-* token in shell.css backs these classes`).toEqual([]);
  });

  it("keeps the four-size type ladder the visual language settled", () => {
    for (const role of ["display", "body", "label", "meta"]) {
      expect(shell, `--text-${role} must stay on the ladder`).toContain(`--text-${role}:`);
    }
    // A fifth role has to be argued for here, not typed into a className.
    const roles = [...shell.matchAll(/--text-([a-z]+):/g)].map((m) => m[1]);
    expect(new Set(roles).size).toBe(4);
  });
});
