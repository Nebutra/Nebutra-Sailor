/**
 * Make a generated icon module droppable by a bundler when nothing imports it.
 *
 * The package ships one bundled `dist/index.mjs`, so a consumer's bundler
 * cannot drop unused icons module-by-module: it has to prove each top-level
 * declaration has no side effects. `forwardRef(...)` is a call the minifier
 * must assume impure, and `Icon.displayName = "Icon"` is a property write, so
 * every one of the 541 icons survived in every bundle that imported a single
 * one (~100 KB gzip on the landing's first load).
 *
 * The fix keeps the public shape — a forwardRef component with a displayName —
 * but builds it in one expression marked pure:
 *
 *   const Icon = /* @__PURE__ *\/ Object.assign(forwardRef(...), { displayName: "Icon" });
 *
 * Idempotent: a module already in that shape is returned unchanged.
 */
export function makeTreeShakeable(code: string, componentName: string): string {
  const head = `const ${componentName} = forwardRef<SVGSVGElement, IconProps>(`;
  const tail = new RegExp(`\\);\\n${componentName}\\.displayName = "${componentName}";`);
  if (!code.includes(head) || !tail.test(code)) return code;
  return code
    .replace(
      head,
      `const ${componentName} = /* @__PURE__ */ Object.assign(\n  forwardRef<SVGSVGElement, IconProps>(`,
    )
    .replace(tail, `),\n  { displayName: "${componentName}" },\n);`);
}
