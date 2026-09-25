/**
 * @nebutra/tokens/values — token values for code that cannot read CSS.
 *
 * Storybook and docs demos that print a value, OG images rendered by satori,
 * PDFs, emails, charts on canvas: anything that needs the value as a string
 * reads it here instead of restating it. The table is generated from
 * styles.css (./values.generated.ts), so it is the stylesheet apps render
 * with, not a copy of it. `scripts/lint-token-mirrors.mjs` fails a file that
 * restates token values instead.
 *
 * Server-safe: no React, no DOM.
 */
import { TOKEN_VALUES } from "./values.generated";

export { TOKEN_VALUES };

export type TokenName = keyof typeof TOKEN_VALUES;
export type TokenMode = "light" | "dark";

const table = TOKEN_VALUES as Record<string, { light?: string; dark?: string }>;

export function isTokenName(name: string): name is TokenName {
  return Object.hasOwn(table, name);
}

/** The value as declared, `var()` references intact. Dark falls back to light. */
export function tokenValue(name: TokenName, mode: TokenMode = "light"): string {
  const entry = table[name];
  const value = (mode === "dark" ? (entry?.dark ?? entry?.light) : entry?.light) ?? entry?.dark;
  if (value === undefined) throw new Error(`token ${name} has no value`);
  return value;
}

/** Split `a, b(c, d), e` on top-level commas. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(input.slice(start).trim());
  return parts;
}

/**
 * Substitute every `var()` with the token it names, recursively. A variable
 * the stylesheet does not define (a next/font variable set at runtime) takes
 * its fallback, or `undefinedAs` when it has none — `""` drops it.
 */
export function resolveTokenValue(
  name: TokenName,
  mode: TokenMode = "light",
  undefinedAs: (variable: string) => string = (v) => `var(${v})`,
): string {
  const resolve = (value: string, seen: Set<string>): string => {
    let out = "";
    let i = 0;
    while (i < value.length) {
      const at = value.indexOf("var(", i);
      if (at === -1) {
        out += value.slice(i);
        break;
      }
      out += value.slice(i, at);
      let depth = 1;
      let j = at + 4;
      while (j < value.length && depth > 0) {
        if (value[j] === "(") depth++;
        else if (value[j] === ")") depth--;
        j++;
      }
      const inner = value.slice(at + 4, j - 1);
      const comma = splitTopLevel(inner);
      const variable = comma[0] ?? "";
      const fallback = comma.length > 1 ? comma.slice(1).join(", ") : undefined;
      if (isTokenName(variable) && !seen.has(variable)) {
        out += resolve(tokenValue(variable, mode), new Set([...seen, variable]));
      } else if (fallback !== undefined) {
        out += resolve(fallback, seen);
      } else {
        out += undefinedAs(variable);
      }
      i = j;
    }
    return out;
  };
  return resolve(tokenValue(name, mode), new Set([name]));
}

/**
 * A font-family token as the families it names, in order, runtime next/font
 * variables dropped: `--font-heading` → ["DM Sans", "MiSans", "PingFang SC", "sans-serif"].
 */
export function fontFamilies(name: TokenName, mode: TokenMode = "light"): string[] {
  return splitTopLevel(resolveTokenValue(name, mode, () => ""))
    .map((family) => family.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

/** A font-family token as a CSS stack with runtime variables dropped. */
export function fontStack(name: TokenName, mode: TokenMode = "light"): string {
  return splitTopLevel(resolveTokenValue(name, mode, () => ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * A colour a non-CSS renderer can paint. Semantic tokens hold bare HSL
 * channels (`222 47% 11%`) — those come back wrapped as `hsl(…)`; everything
 * else comes back resolved.
 */
export function tokenColor(name: TokenName, mode: TokenMode = "light"): string {
  const value = resolveTokenValue(name, mode).trim();
  return /^-?[\d.]+\s+-?[\d.]+%\s+-?[\d.]+%$/.test(value) ? `hsl(${value})` : value;
}
