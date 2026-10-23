#!/usr/bin/env node

// CI guard: a `transition-[…transform…]` list must also name the individual
// transform properties the element animates.
//
// Tailwind v4 moved translate-*, scale-* and rotate-* onto the CSS `translate`,
// `scale` and `rotate` properties. A list that names only `transform` no longer
// covers them, so the move happens in one frame while colour and opacity still
// ease. On 2026-10-23 the Toggle thumb jumped instead of sliding, and the
// BentoGrid and AnimatedHikeCard hovers jumped the same way.
//
// Counted: a className expression (string or `{cn(…)}`) whose arbitrary
// transition list names `transform`, while a state-variant utility in the same
// expression (hover:, group-hover:, peer-checked:, …) sets translate, scale or
// rotate and the list does not name that property. `transition-transform`
// already covers all four. A utility on a parent that targets a child
// (`[&>span]:translate-x-…`) is out of reach of a per-element check.
//
// Run: node scripts/lint-transition-properties.mjs

import { relative } from "node:path";
import { listSourceFiles, sourceFor } from "./lib/jsx-count-ratchet.mjs";

const TRANSITION_LIST = /(?:^|[\s"'`])transition-\[([^\]]+)\]/g;
const PROPERTY_UTILITY = /^-?(translate|scale|rotate)(?:-|$)/;
// Variants that pick a direction, not a state: nothing changes at runtime.
const STATIC_VARIANTS = new Set(["rtl", "ltr", "print"]);
const SCREEN = /^(?:sm|md|lg|xl|2xl|max-\w+|min-\[.+\])$/;

// Splits `lg:group-hover:[&>a]:scale-75` into ["lg","group-hover","[&>a]","scale-75"].
function segments(token) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (c === ":" && depth === 0) {
      parts.push(token.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(token.slice(start));
  return parts;
}

export function missingTransitionProperties(classText) {
  const listed = new Set();
  let transformOnly = false;
  for (const m of classText.matchAll(TRANSITION_LIST)) {
    const props = m[1].split(",").map((p) => p.trim());
    for (const p of props) listed.add(p);
    if (props.includes("transform")) transformOnly = true;
  }
  if (!transformOnly) return [];

  const missing = [];
  for (const token of classText.split(/[\s"'`,()]+/)) {
    const parts = segments(token);
    if (parts.length < 2) continue;
    const variants = parts.slice(0, -1).map((v) => v.replace(/^!/, ""));
    if (variants.every((v) => STATIC_VARIANTS.has(v) || SCREEN.test(v))) continue;
    const prop = parts.at(-1).replace(/^!/, "").match(PROPERTY_UTILITY)?.[1];
    if (prop && !listed.has(prop) && !missing.includes(prop)) missing.push(prop);
  }
  return missing;
}

// Each className value: a quoted string, or a balanced `{…}` expression.
export function classExpressions(source) {
  const out = [];
  const attr = /className=/g;
  let m;
  while ((m = attr.exec(source))) {
    const start = m.index + m[0].length;
    const open = source[start];
    let end = start + 1;
    if (open === '"' || open === "'") {
      end = source.indexOf(open, start + 1) + 1;
    } else if (open === "{") {
      let depth = 0;
      for (; end <= source.length; end++) {
        const c = source[end - 1];
        if (c === "{") depth++;
        else if (c === "}" && --depth === 0) break;
      }
    } else continue;
    out.push({ index: m.index, text: source.slice(start, end) });
  }
  return out;
}

function main() {
  const files = listSourceFiles(["apps", "packages"], { extensions: [".tsx"] });
  const violations = [];
  for (const file of files) {
    const source = sourceFor(file);
    for (const { index, text } of classExpressions(source)) {
      const missing = missingTransitionProperties(text);
      if (missing.length === 0) continue;
      const line = source.slice(0, index).split("\n").length;
      violations.push(`  ${relative(process.cwd(), file)}:${line}  add ${missing.join(", ")}`);
    }
  }
  if (violations.length === 0) {
    console.log("✓ transition lists name translate/scale/rotate where they animate");
    return;
  }
  console.error(
    `✗ ${violations.length} transition list(s) name \`transform\` but not the property that moves (Tailwind v4: translate/scale/rotate are separate properties):`,
  );
  console.error(violations.join("\n"));
  console.error(
    "Fix: add the property to the list, e.g. transition-[opacity,transform,translate].",
  );
  process.exit(1);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();
