/**
 * @nebutra/fonts — self-hosted OSS font registry (client-safe entry).
 *
 * Maps a normalized theme / DESIGN.md font-family name to the CSS variable that
 * the build-time self-hosted face defines (declared with next/font in
 * `@nebutra/fonts/next`, applied to <html> via `fontRegistryClassName`).
 *
 * WHY: next/font registers each face under a HASHED family name reachable ONLY
 * via its CSS variable — `font-family: 'Inter'` does NOT use the self-hosted
 * Inter. So when a theme / imported DESIGN.md font's primary family matches an
 * entry here, callers prepend `var(--font-…)` to the stack, making the
 * self-hosted font actually render — with ZERO runtime external requests
 * (next/font self-hosts at build time) and next/font's automatic metric-matched
 * fallback (no layout shift). Unmatched families keep their declared stack.
 *
 * This entry is FREE of `next/font` imports so client modules can use it.
 * The `./next` subpath holds the (server-only) next/font declarations and MUST
 * keep its CSS-variable names in sync with FONT_REGISTRY below.
 */

export const FONT_REGISTRY: Record<string, string> = {
  // Self-hosted via geist/font (default brand faces, loaded by the app shell)
  geist: "--font-geist-sans",
  "geist sans": "--font-geist-sans",
  "geist mono": "--font-geist-mono",
  // Self-hosted via next/font/google (see ./next)
  inter: "--font-inter",
  "space grotesk": "--font-space-grotesk",
  "playfair display": "--font-playfair-display",
  "jetbrains mono": "--font-jetbrains-mono",
  manrope: "--font-reg-manrope",
  sora: "--font-reg-sora",
  "work sans": "--font-reg-work-sans",
  "dm sans": "--font-reg-dm-sans",
  "plus jakarta sans": "--font-reg-plus-jakarta-sans",
  outfit: "--font-reg-outfit",
  figtree: "--font-reg-figtree",
  montserrat: "--font-reg-montserrat",
  lexend: "--font-reg-lexend",
  "fira code": "--font-reg-fira-code",
  "roboto mono": "--font-reg-roboto-mono",
  "source code pro": "--font-reg-source-code-pro",
};

/** Normalize a single font-family token: strip quotes/whitespace, lowercase. */
function normalizeFamily(name: string): string {
  // Strip ALL quotes with a quantifier-free global replace (quotes only appear
  // at token boundaries in a font-family value). Avoids the end-anchored /['"]+$/
  // form, which CodeQL flags as polynomial ReDoS (scanned from every position).
  return name.replace(/['"]/g, "").trim().toLowerCase();
}

/** The first (primary) family in a CSS font-family list, normalized. */
export function primaryFamily(stack: string): string {
  return normalizeFamily(stack.split(",")[0] ?? "");
}

/** Registry CSS variable for a stack's primary family, or undefined. */
export function resolveRegistryVar(stack: string): string | undefined {
  return FONT_REGISTRY[primaryFamily(stack)];
}

/**
 * Return `stack` with the self-hosted registry font prepended when its primary
 * family is registered; otherwise return it unchanged.
 * e.g. "Space Grotesk, sans-serif" → "var(--font-space-grotesk), Space Grotesk, sans-serif"
 */
export function withRegistryFont(stack: string | undefined): string | undefined {
  if (!stack) return stack;
  const variable = resolveRegistryVar(stack);
  return variable ? `var(${variable}), ${stack}` : stack;
}
