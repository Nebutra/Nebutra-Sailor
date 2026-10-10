#!/usr/bin/env node
/**
 * CI guard: @nebutra/ui renders no new hard-coded English.
 *
 * A shared component's own strings (close buttons, steppers, password
 * reveal, empty states) go through the labels contract —
 * packages/design/ui/src/primitives/ui-labels.tsx: an English default in
 * DEFAULT_UI_LABELS, the app's translation through <UiLabelsProvider>, a
 * per-instance override through the component's prop. A string written
 * straight into the component is English on all 34 locales.
 *
 * Counted: `fooLabel = "Text"` / `label="Text"` / `aria-label="Text"`,
 * `placeholder="Text"`, and `sr-only">Text`. Stories, demos, tests and the
 * catalog are exempt. Shrink-only per file: governance.config.json →
 * uiHardcodedLabels.allowlist (99 strings in 55 files on 2026-10-10).
 */
import { runCountRatchet, sourceFor } from "./lib/jsx-count-ratchet.mjs";

const PATTERNS = [
  /\b\w*[Ll]abel\s*=\s*"[^"{]*[a-z][^"]*"/g,
  /sr-only">[A-Z][a-z]/g,
  /placeholder\s*=\s*"[A-Z][^"]*"/g,
];

runCountRatchet({
  key: "uiHardcodedLabels",
  what: "hard-coded English labels in @nebutra/ui",
  roots: ["packages/design/ui/src"],
  count(file) {
    if (/\.stories\.tsx$|\/catalog\//.test(file)) return 0;
    const src = sourceFor(file);
    let n = 0;
    for (const re of PATTERNS) n += src.match(re)?.length ?? 0;
    return n;
  },
  fix: [
    "  • Add the string to DEFAULT_UI_LABELS (primitives/ui-labels.tsx) and to",
    "    packages/platform/i18n/ui-labels/en.json, then read it with",
    '    useUiLabels("<section>", props.labels) or <UiLabelText section="…" name="…" />.',
  ].join("\n"),
});
