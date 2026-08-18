/**
 * File discovery for the governance guards.
 *
 * Every guard begins by asking a search tool which files to read. That call has
 * three outcomes and only two of them mean "clean":
 *
 *   exit 0  — matches; read them
 *   exit 1  — no matches; the tree really is clean
 *   other   — the tool is not installed, or the query is malformed
 *
 * Written as a bare `try { rg } catch { files = [] }`, the third collapses into
 * the second: the guard reads nothing, finds nothing, prints its green line, and
 * CI believes it. `rg` is not on the GitHub runner, so on 2026-08-18 four guards
 * — brand-hex, arbitrary-breakpoints, defined-css-vars and ui-contracts — were
 * inert in CI while passing. lint-no-brand-hex gave itself away only because its
 * shrink-only allowlist reported every entry as "fixed"; the other three said
 * nothing at all.
 *
 * So: fall back to grep when the first tool is unavailable, and if neither can
 * run, throw. A guard that cannot look must not be able to say "clean".
 */

import { execSync } from "node:child_process";

/** Directories no guard ever wants to read. */
export const EXCLUDED_DIRS = [
  "node_modules",
  ".next",
  ".open-next",
  ".turbo",
  "dist",
  "build",
  "storybook-static",
  ".deploy",
];

function run(command) {
  return execSync(command, { encoding: "utf-8" }).trim();
}

/**
 * Run `rgCommand`, falling back to `grepCommand`, and return the matched paths.
 *
 * @param {object} opts
 * @param {string} opts.rgCommand    ripgrep invocation printing one path per line
 * @param {string} opts.grepCommand  equivalent grep invocation, for hosts without rg
 * @param {string} opts.label        guard name, used in the failure message
 * @returns {string[]}
 */
export function findFiles({ rgCommand, grepCommand, label }) {
  try {
    return run(rgCommand).split("\n").filter(Boolean);
  } catch (rgError) {
    // Exit 1 is ripgrep's "no matches" — a clean tree, and the one case where
    // an empty result is the truth rather than a missing scanner.
    if (rgError?.status === 1) return [];

    try {
      return run(grepCommand).split("\n").filter(Boolean);
    } catch (grepError) {
      if (grepError?.status === 1) return [];
      throw new Error(
        `${label}: neither ripgrep nor grep could run, so this guard cannot ` +
          `see the tree it is meant to check. Refusing to report it clean.\n` +
          `  rg:   ${rgError?.message ?? rgError}\n` +
          `  grep: ${grepError?.message ?? grepError}`,
      );
    }
  }
}

/** `grep -rl` exclusion flags matching EXCLUDED_DIRS. */
export function grepExcludes() {
  return EXCLUDED_DIRS.map((d) => `--exclude-dir='${d}'`).join(" ");
}
