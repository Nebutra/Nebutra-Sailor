#!/usr/bin/env node

// CI guard: user-facing English written straight into JSX in the product and
// sign-in apps.
//
// next-intl only translates what goes through `t()`. A string typed into JSX
// renders in English for every locale, and nothing fails — the 2026-10-10 web
// review counted 369 of them across apps/web, apps/auth and apps/idp (the
// settings rail, the sidebar groups, whole pages like /usage). The owner works
// in Chinese; those screens never were.
//
// Counted, per file, after comments are stripped:
//   • JSX text containing a word — `<p>Save changes</p>`
//   • a literal in a copy attribute: aria-label, placeholder, title, alt,
//     label, description, helperText, emptyText, tooltip, confirmText,
//     cancelText — `placeholder="Search projects"`
// Not counted: text that is only punctuation, numbers or symbols; expressions
// (`{t("…")}`); attribute values with no letters.
//
// Escape hatch, for a file whose literals are not UI copy (a dev-only demo, a
// protocol label): a top-level `// @copy-exempt: <reason>` comment.
//
// SHRINK-ONLY ratchet (governance.config.json → hardcodedCopy.allowlist); see
// scripts/lib/jsx-count-ratchet.mjs. Move a string to
// packages/platform/i18n/locales/en.json (plus zh-Hans / zh-Hant) and lower the
// file's count.
//
// Run: node scripts/lint-hardcoded-copy.mjs

import { readFileSync } from "node:fs";
import {
  openingTags,
  runCountRatchet,
  sourceFor,
  topLevelAttributes,
} from "./lib/jsx-count-ratchet.mjs";

const COPY_ATTRIBUTES =
  /(?:^|\s)(?:aria-label|placeholder|title|alt|label|description|helperText|emptyText|emptyTitle|emptyDescription|submitLabel|pendingLabel|loadingLabel|tooltip|confirmText|cancelText|hint)\s*=\s*(["'])([^"']*)\1/g;

/** A run of two or more letters: a word, not a symbol, unit or number. */
const WORD = /\p{L}{2,}/u;

export function countHardcodedCopy(src) {
  let n = 0;
  // JSX text: between the end of a tag and the start of the next one.
  for (const match of src.matchAll(/(?<![=-])>([^<>{}]+)</g)) {
    const text = match[1].trim();
    if (!text || !WORD.test(text)) continue;
    // Code, not JSX text: TypeScript generics and comparisons carry these.
    if (/[;=()&|`]|=>|^\s*[,.:]/.test(text)) continue;
    n++;
  }
  for (const { tag, attrs } of openingTags(src)) {
    if (!tag) continue;
    for (const [, , value] of topLevelAttributes(attrs).matchAll(COPY_ATTRIBUTES)) {
      if (WORD.test(value) && (/\s/.test(value) || /^\p{Lu}/u.test(value))) n++;
    }
  }
  return n;
}

runCountRatchet({
  key: "hardcodedCopy",
  what: "hardcoded UI strings",
  roots: ["apps/web/src", "apps/auth/src", "apps/idp/src"],
  count(file) {
    // The Vite preview app has no message runtime yet: next-compat/intl.ts
    // renders key paths, so its copy cannot move to the catalog until it does.
    if (file.startsWith("apps/web/src/vite-app/")) return 0;
    if (/^\s*\/\/\s*@copy-exempt:/m.test(readFileSync(file, "utf-8"))) return 0;
    return countHardcodedCopy(sourceFor(file));
  },
  fix: [
    "  • Add the string to packages/platform/i18n/locales/en.json (and zh-Hans / zh-Hant)",
    '  • Read it with useTranslations("ns") / await getTranslations("ns") and render t("key")',
    "  • Not UI copy at all? A top-level `// @copy-exempt: <reason>` comment",
  ].join("\n"),
});
