/**
 * What the Motion Lab hands out: the three forms of one spring.
 *
 *   token  the physics, as DTCG — the only thing an author writes
 *   css    what the token build derives from it (duration + linear() easing)
 *   js     the three numbers for Motion / react-spring, and a WAAPI call
 *
 * The token form is intentionally physics-only. `deriveSpring` in the token
 * package fills in duration and easing at build time, so showing them in the
 * token snippet would invite an author to hand-maintain what is computed.
 */

import { type SpringParams, springSettleMs, springToLinear } from "./spring";

/** Kebab-case token name from free text; never empty. */
export function toTokenName(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "custom" : slug;
}

export function springTokenJson(name: string, params: SpringParams): string {
  const leaf = (value: number) => ({ $value: value, $type: "number" });
  return JSON.stringify(
    {
      spring: {
        [toTokenName(name)]: {
          stiffness: leaf(params.stiffness),
          damping: leaf(params.damping),
          mass: leaf(params.mass),
        },
      },
    },
    null,
    2,
  );
}

export function springCss(name: string, params: SpringParams): string {
  const token = toTokenName(name);
  return [
    ":root {",
    `  --spring-${token}-duration: ${springSettleMs(params)}ms;`,
    `  --spring-${token}-easing: ${springToLinear(params)};`,
    "}",
    "",
    ".panel {",
    `  transition: transform var(--spring-${token}-duration) var(--spring-${token}-easing);`,
    "}",
  ].join("\n");
}

export function springJs(name: string, params: SpringParams): string {
  const token = toTokenName(name);
  const camel = token.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return [
    "// Motion, react-spring: the same three numbers",
    `const ${camel} = { type: "spring", stiffness: ${params.stiffness}, damping: ${params.damping}, mass: ${params.mass} };`,
    "",
    "// Web Animations API, no library: the same curve as the CSS above",
    `el.animate(`,
    `  { transform: ["translateY(var(--distance-sm))", "none"] },`,
    `  { duration: ${springSettleMs(params)}, easing: "${springToLinear(params)}", fill: "both" },`,
    `);`,
  ].join("\n");
}
