/**
 * Which tokens actually have a Tailwind utility.
 *
 * A CSS variable in `:root` is NOT automatically a Tailwind class. Only the
 * variables re-declared inside the `@theme inline { … }` block of
 * `packages/design/tokens/styles.css` (and `recipe.css`) become utilities —
 * `--radius-lg` there is what makes `rounded-lg` exist.
 *
 * This module reads those blocks so the token pages can only claim a utility
 * that is really registered. It matters: the DTCG source declares
 * `size.radius.card` and `size.radius.xs`, both of which emit `--radius-card`
 * and `--radius-xs` into `:root`, and NEITHER is in the `@theme` block — so
 * `rounded-card` and `rounded-xs` do not exist as classes, however natural they
 * look. Writing them silently produces no rounding at all. A hand-written table
 * would have listed them; reading the registry reports the gap instead.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const RUNTIME_CSS = [
  join("packages", "design", "tokens", "styles.css"),
  join("packages", "design", "tokens", "recipe.css"),
];

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let up = 0; up < 6; up += 1) {
    if (existsSync(join(dir, RUNTIME_CSS[0]))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `[apps/design] Could not locate ${RUNTIME_CSS[0]} from ${process.cwd()}. ` +
      "Utility availability is read from the @theme block; it is not assumed.",
  );
}

const REPO_ROOT = findRepoRoot();

/** Extract every `--name` declared inside any `@theme` block of a stylesheet. */
function themeVariables(css: string): string[] {
  const names: string[] = [];
  const blockStart = /@theme[^{]*\{/gu;
  let match = blockStart.exec(css);

  while (match !== null) {
    // Walk braces from the opening one so a nested block cannot end the scan early.
    let depth = 1;
    let index = match.index + match[0].length;
    const from = index;
    while (index < css.length && depth > 0) {
      const char = css[index];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      index += 1;
    }
    const body = css.slice(from, index - 1);
    for (const declaration of body.matchAll(/(--[a-z0-9-]+)\s*:/giu)) {
      names.push(declaration[1].slice(2));
    }
    blockStart.lastIndex = index;
    match = blockStart.exec(css);
  }

  return names;
}

const REGISTERED: ReadonlySet<string> = new Set(
  RUNTIME_CSS.flatMap((relative) => {
    const absolute = join(REPO_ROOT, relative);
    return existsSync(absolute) ? themeVariables(readFileSync(absolute, "utf8")) : [];
  }),
);

/** True when `--<name>` is declared in an `@theme` block and so backs a utility. */
export function isRegistered(name: string): boolean {
  return REGISTERED.has(name);
}

export interface UtilityInfo {
  /** The Tailwind class, when the backing variable is registered. */
  utility: string | null;
  /** How to reach the token when there is no utility. */
  fallback: string;
  /** The `@theme` variable that would have to exist for the utility to work. */
  requires: string;
}

/**
 * Resolve a token to its utility, or to the `var()` form that does work.
 *
 * @param themeVar the variable the utility would read, without `--`
 * @param utility the class name it would produce
 * @param tokenVar the variable the token itself emits, without `--`
 */
export function utilityFor(
  themeVar: string,
  utility: string,
  tokenVar: string | null,
): UtilityInfo {
  return {
    utility: isRegistered(themeVar) ? utility : null,
    fallback: tokenVar === null ? "not emitted as a variable" : `var(--${tokenVar})`,
    requires: `--${themeVar}`,
  };
}

/** Count of registered theme variables, for the layer-model page. */
export const REGISTERED_COUNT = REGISTERED.size;
