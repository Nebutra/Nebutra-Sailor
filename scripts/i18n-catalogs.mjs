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
 * Add a catalog here and both `pnpm i18n:translate` and `pnpm i18n:check` pick
 * it up. There is no second list to remember.
 */

/** Locales every product catalog ships. */
export const GLOBAL_TARGETS = [
  "ar",
  "bn",
  "da",
  "de",
  "el",
  "es",
  "fa",
  "fi",
  "fr",
  "he",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "ms",
  "nl",
  "no",
  "pl",
  "pt",
  "ru",
  "sv",
  "sw",
  "th",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh-Hans",
  "zh-Hant",
];

/**
 * Locales whose translations are enforced, not merely reported.
 *
 * These are the languages a human actually reads the product in today. For the
 * rest, an English fallback is an honest interim state; for these it is a bug.
 */
export const ENFORCED_LOCALES = [
  "de",
  "es",
  "fr",
  "ja",
  "ko",
  "zh-Hans",
  "zh-Hant",
  "zh", // legacy stem, if a catalog still carries one
];

export const CATALOGS = [
  {
    id: "landing",
    messagesDir: "apps/landing/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Public marketing site",
    // Above-the-fold marketing copy: identical-to-EN here is a regression.
    // `nav` and `footer` are advisory — they are dominated by short link
    // labels (Blog, FAQ, npm, DPA, Docs) that B2B SaaS keeps in English.
    criticalNamespaces: [
      "hero",
      "cta",
      "logoStrip",
      "monorepoTree",
      "stats",
      "metadata",
      "features",
      "comingSoon",
    ],
    advisoryNamespaces: ["nav", "footer", "landing"],
  },
  {
    id: "web",
    messagesDir: "packages/platform/i18n/locales",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Dashboard / authenticated product (shared @nebutra/i18n)",
    criticalNamespaces: [],
    advisoryNamespaces: [],
  },
  {
    id: "forge",
    messagesDir: "apps/forge/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Forge online tool station",
    // `runners.*` is the field labels of every tool workspace — the strings a
    // user is looking at while doing the work. `categories` and `home` are the
    // browse surface. Tool titles are NOT here: those live bilingually on the
    // registry definitions (design doc §6.10), not in this catalog.
    criticalNamespaces: ["runners", "categories", "home", "tool", "roots"],
    advisoryNamespaces: ["nav", "footer", "meta", "search", "auth"],
  },
  {
    id: "router",
    messagesDir: "apps/router/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Router API marketplace",
    criticalNamespaces: [],
    advisoryNamespaces: [],
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
