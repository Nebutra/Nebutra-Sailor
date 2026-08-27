/**
 * css-var-name.mjs
 *
 * The DTCG-path → CSS-custom-property namer, extracted so it has exactly ONE
 * definition in the repository.
 *
 * `style-dictionary.config.mjs` uses it to emit `build/css/*.css` (which is
 * checked against the runtime SSOT `@nebutra/tokens/styles.css` by
 * `verify:parity`). The design site (`apps/design`) uses the same function to
 * label every token it renders with the variable a consumer actually writes.
 *
 * It lives here rather than in the config because a second copy in the site
 * would be a second source of truth for token names — the drift the site exists
 * to make impossible. A token renamed in the pipeline must rename on the page
 * in the same commit, with no edit to the site.
 *
 * Returning `null` means "this token does not become a CSS variable": either it
 * is a build-time-only primitive (`color.white`) or it is emitted by a
 * post-processing step under a different name (`transition.default`).
 */

/**
 * Maps a DTCG path to the CSS variable name the pipeline emits, without the
 * leading `--`.
 *
 * @param {{ path: string[] }} token a Style Dictionary token, or any `{ path }`
 * @returns {string | null} variable name without `--`, or null if not emitted
 */
export function pathToCssVarName(token) {
  const path = token.path;
  const [head, ...rest] = path;

  // Drop primitive `color.` prefix → keep child name.
  if (head === "color") {
    if (rest[0] === "white" || rest[0] === "black") return null;
    if (rest[0] === "tertiary-purple") return "brand-tertiary";
    return rest.join("-");
  }

  if (head === "size") return rest.join("-");
  if (head === "duration") return `duration-${rest.join("-")}`;
  if (head === "easing") return `ease-${rest.join("-")}`;
  if (head === "fontFamily") return `font-${rest.join("-")}`;

  if (head === "brand") {
    if (rest[0] === "gradient") {
      const sub = rest.slice(1).join("-");
      return sub === "primary" ? "brand-gradient" : `brand-gradient-${sub}`;
    }
    return `brand-${rest.join("-")}`;
  }

  if (head === "status") return `status-${rest.join("-")}`;

  if (head === "container") return `container-${rest.join("-")}`;
  if (head === "radius") {
    return rest[0] === "default" ? "radius" : `radius-${rest.join("-")}`;
  }
  if (head === "transition") {
    if (rest[0] === "shorthand") return "transition";
    if (rest[0] === "default") return null; // composite — emitted via post-process
    return `transition-${rest.join("-")}`;
  }
  if (head === "focusRing") {
    if (rest[0] === "default") return "focus-ring";
    return `focus-ring-${rest.join("-")}`;
  }

  if (head === "scale") return rest.join("-");
  if (head === "shadcn") return rest.join("-");
  if (head === "ds") return `ds-${rest.join("-")}`;
  if (head === "elevation") return `elevation-${rest.join("-")}`;

  if (head === "theme") return null;

  if (head === "shadow") return `shadow-${rest.join("-")}`;

  return path.join("-");
}

/**
 * CSS variable namer for theme token trees scoped to a `[data-theme]` selector.
 * Emits Tailwind v4 `@theme`-compatible names: color.primary → --color-primary.
 *
 * @param {{ path: string[] }} token
 * @returns {string | null}
 */
export function multiThemeName(token) {
  const path = token.path;
  const [head, ...rest] = path;
  if (head === "theme") return null;
  if (head === "color") return `color-${rest.join("-")}`;
  if (head === "radius") return `radius-${rest.join("-")}`;
  if (head === "fontFamily") return `font-${rest.join("-")}`;
  if (head === "shadow") return `shadow-${rest.join("-")}`;
  if (head === "transition") return `transition-${rest.join("-")}`;
  return path.join("-");
}
