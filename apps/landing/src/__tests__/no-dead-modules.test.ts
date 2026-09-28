import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { moduleReach } from "../../../../scripts/lib/module-reach.mjs";

/**
 * Every module in apps/landing/src is reachable from a route, the proxy or the
 * i18n config. A module nothing imports is dead code: it rots unseen, and it
 * ships into the Sailor template, which strips pages but cannot know which
 * helpers only those pages used. On 2026-09-27 thirty-one such files were
 * found and deleted — a retired product demo, mockups, marketing sections, and
 * a stats strip that hard-coded star and member counts nobody measured.
 */
const APP = join(__dirname, "..", "..");
const SRC = join(APP, "src");

describe("apps/landing modules", () => {
  it("are all reachable from an entry point", () => {
    expect(moduleReach(APP).unreachable).toEqual([]);
  });

  /**
   * A barrel keeps every file it re-exports reachable, so a component only the
   * barrel mentions passes the check above while nothing renders it. Six did.
   */
  it("re-export from a barrel only what something imports", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) walk(abs);
        else if (/\.tsx?$/.test(name)) files.push(abs);
      }
    };
    walk(SRC);
    const text = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
    const unused: string[] = [];
    for (const barrel of files.filter((f) => /\/index\.ts$/.test(f))) {
      const source = text.get(barrel) ?? "";
      for (const m of source.matchAll(/export \{([^}]+)\} from "([^"]+)"/g)) {
        const names = (m[1] ?? "")
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n && !n.startsWith("type "))
          .map((n) => n.split(/\s+as\s+/).pop() ?? n);
        for (const name of names) {
          const word = new RegExp(`\\b${name}\\b`);
          const used = files.some(
            (f) =>
              f !== barrel &&
              !f.includes(`${m[2]?.replace("./", "/")}.`) &&
              word.test(text.get(f) ?? ""),
          );
          if (!used) unused.push(`${relative(APP, barrel)}: ${name}`);
        }
      }
    }
    expect(unused).toEqual([]);
  });
});
