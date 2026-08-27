/**
 * Finds declarations that a browser throws away.
 *
 * When var() is substituted into a property whose grammar the resulting value
 * does not satisfy, CSS does not ignore the offending part — the whole
 * declaration becomes invalid at computed-value time and the property falls
 * back to its initial value. Nothing warns. The build passes, the class is in
 * the stylesheet, the element carries it, and it simply has no effect.
 *
 * That shipped: `--btn-default-stroke-gradient: transparent` sat in a
 * background-image layer, so `background-image` was dropped in full and took
 * the solid brand fill in the layer above it with it. Every default Button
 * rendered white text on no background.
 *
 * Static analysis would have to re-implement CSS grammar to catch that. So this
 * asks the engine instead: resolve each var() against the values the stylesheet
 * actually defines, then hand the result to CSS.supports() and see whether the
 * browser would keep it.
 *
 * Usage: node scripts/audit-css-var-types.mjs <built .css> [...]
 */

import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const files = process.argv.slice(2);
if (files.length === 0) {
  process.stderr.write("usage: audit-css-var-types.mjs <file.css> [...]\n");
  process.exit(2);
}

const AUDIT = (css) => {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  const root = getComputedStyle(document.documentElement);

  /** Split on top-level commas, so gradients keep their own argument lists. */
  const splitArgs = (s) => {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === "," && depth === 0) {
        out.push(s.slice(start, i));
        start = i + 1;
      }
    }
    out.push(s.slice(start));
    return out;
  };

  /**
   * Substitute var() the way the engine does: the custom property's value if it
   * has one, otherwise the fallback. A name with neither resolves to nothing,
   * which is itself how a declaration becomes invalid.
   */
  const resolve = (value, missing, local, depth = 0) => {
    if (depth > 24 || !value.includes("var(")) return value;
    const at = value.indexOf("var(");
    let i = at + 4;
    let level = 1;
    while (i < value.length && level > 0) {
      if (value[i] === "(") level++;
      else if (value[i] === ")") level--;
      i++;
    }
    if (level !== 0) return value;

    const inner = value.slice(at + 4, i - 1);
    const [rawName, ...rest] = splitArgs(inner);
    const name = rawName.trim();
    const fallback = rest.length > 0 ? rest.join(",").trim() : null;

    // Rule-local declarations win over :root, because that is where the element
    // would read them. Tailwind depends on this: `shadow-[…]` does not set
    // box-shadow directly, it sets --tw-shadow in the same rule and box-shadow
    // reads it back. Resolving only against :root skips every such utility —
    // which is most of them.
    const defined = (local.get(name) ?? root.getPropertyValue(name)).trim();
    const replacement = defined !== "" ? defined : (fallback ?? "");
    // Nothing at :root and no fallback. Plenty of tokens are legitimately set
    // by a component class or a wrapper element instead, so the stylesheet
    // alone cannot say whether this declaration is broken. Record it and drop
    // the whole finding rather than guess — a report full of maybes is one
    // nobody reads.
    if (replacement === "") missing.add(name);

    return resolve(value.slice(0, at) + replacement + value.slice(i), missing, local, depth + 1);
  };

  const findings = [];
  const seen = new Set();

  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) walk(rule.cssRules);
      const decls = rule.style;
      if (!decls) continue;

      const local = new Map();
      for (const prop of decls) {
        if (prop.startsWith("--")) local.set(prop, decls.getPropertyValue(prop));
      }

      for (const prop of decls) {
        // Custom properties accept anything by definition — unless registered,
        // and a registered property that rejects a value is precisely the
        // graceful outcome this audit wants people to have.
        if (prop.startsWith("--")) continue;

        const raw = decls.getPropertyValue(prop);
        if (!raw.includes("var(")) continue;

        const missing = new Set();
        const resolved = resolve(raw, missing, local).trim();
        if (missing.size > 0) continue;
        if (resolved === "" || resolved.includes("var(")) continue;
        // Every token resolved to a value the stylesheet really defines, and
        // the browser still refuses the result: the value is the wrong type for
        // the property, and the declaration will be discarded at runtime.
        if (CSS.supports(prop, resolved)) continue;

        // Keyed by selector, not by the raw value. Every Tailwind shadow
        // utility declares the identical `box-shadow: var(--tw-shadow), …` and
        // differs only in the rule-local --tw-shadow it reads, so keying on the
        // raw text collapses all of them into whichever one came first.
        const key = `${rule.selectorText}|${prop}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({ selector: rule.selectorText ?? "(at-rule)", prop, raw, resolved });
      }
    }
  };

  walk(style.sheet.cssRules);
  style.remove();
  return findings;
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><html><head></head><body></body></html>");

let total = 0;
for (const file of files) {
  const findings = await page.evaluate(AUDIT, readFileSync(file, "utf8"));
  if (findings.length === 0) continue;
  total += findings.length;
  process.stdout.write(`\n${file}\n`);
  for (const f of findings) {
    process.stdout.write(`  ${f.selector}\n`);
    process.stdout.write(`    ${f.prop}: ${f.raw}\n`);
    process.stdout.write(`    resolves to: ${f.resolved}\n`);
  }
}

await browser.close();
process.stdout.write(total === 0 ? "\nNo dropped declarations.\n" : `\n${total} dropped.\n`);
process.exit(total === 0 ? 0 : 1);
