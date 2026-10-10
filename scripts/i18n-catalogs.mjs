/**
 * The message catalogs that ship UI strings — the single source of truth for
 * every i18n tool in this repo.
 *
 * This file exists because the two halves of i18n governance had drifted apart:
 * translation was catalog-driven and covered four apps, while verification was
 * hardcoded to apps/landing. A catalog could therefore be filled automatically
 * and still drift silently, which is exactly how Forge shipped 702 English
 * strings into a Chinese product surface with nothing failing.
 *
 * The rules every catalog follows are in scripts/lib/i18n-catalog.mjs.
 *
 * Add a catalog here and both `pnpm i18n:translate` and `pnpm i18n:check` pick
 * it up. There is no second list to remember.
 */

import { TARGET_LOCALES } from "./lib/i18n-registry.mjs";

/**
 * Locales every product catalog ships — derived from PRODUCT_LANGUAGES, never
 * hand-listed. A hand list here once lost cs, ro and hu, and nothing noticed.
 */
export const GLOBAL_TARGETS = TARGET_LOCALES;

/**
 * `authoredLocales` are written by a person and never machine-translated, not
 * even when their English changes (they are reported stale instead).
 * `styleGuide` lines are appended to the translator prompt for that catalog.
 */
export const CATALOGS = [
  {
    id: "landing",
    messagesDir: "apps/landing/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Public marketing site",
  },
  {
    id: "web",
    messagesDir: "packages/platform/i18n/locales",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Dashboard / authenticated product (shared @nebutra/i18n)",
  },
  {
    id: "forge",
    messagesDir: "apps/forge/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    // Tool titles are NOT here: those live bilingually on the registry
    // definitions (design doc §6.10), not in this catalog.
    description: "Forge online tool station",
  },
  {
    id: "boot-log",
    messagesDir: "packages/platform/i18n/boot-log",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Auth-center boot-log archive (editorial prose, not UI strings)",
    // English and Simplified Chinese are hand-authored; the rest are translated
    // from the English.
    authoredLocales: ["zh-Hans"],
    // Editorial prose, not UI copy — and the default prompt says "product UI
    // translator", which is why it behaved like one: a first pass mixed
    // Japanese 敬体 and 常体 inside a single archive and carried an inline
    // citation the English should never have had. Declared here so every
    // future pass inherits it without anyone remembering to.
    styleGuide: [
      "This is an archive of historical records, not UI copy. Register: a dry archivist stating facts. Never encouraging, never explanatory.",
      "Translate what is written. Do NOT add sources, attributions, hedges, connectives, or any clause explaining why the record matters.",
      "The last sentence of each entry is a deliberate flat statement of outcome. Do not soften it, do not add a concluding connective, do not turn it into a lesson.",
      "Use ONE register consistently across every string. For Japanese use 常体 (だ・である), never 敬体 (です・ます). For Korean use 해라체/평서형, not 해요체.",
      "Keep proper nouns, product names and quoted machine text exactly as they appear in the English.",
    ],
  },
  {
    id: "ui",
    messagesDir: "packages/platform/i18n/ui-labels",
    source: "en",
    targets: GLOBAL_TARGETS,
    // en.json mirrors DEFAULT_UI_LABELS in @nebutra/ui (primitives/ui-labels.tsx);
    // tests/architecture/i18n-contract.test.ts keeps them equal.
    description: "@nebutra/ui component labels (close buttons, colour picker, data table…)",
  },
  {
    id: "router",
    messagesDir: "apps/router/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Router API marketplace",
  },
];

/** Look a catalog up by id, or throw with the valid ids listed. */
export function catalogById(id) {
  const found = CATALOGS.find((c) => c.id === id);
  if (!found) {
    throw new Error(`Unknown catalog '${id}'. Known: ${CATALOGS.map((c) => c.id).join(", ")}`);
  }
  return found;
}

/** Glob patterns for every catalog's message files — for hook globs and CI paths. */
export function catalogGlobs() {
  return CATALOGS.map((c) => `${c.messagesDir}/*.json`);
}
