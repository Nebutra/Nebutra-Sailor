/**
 * Server-only: imports @nebutra/design-sync (transitively the alpha @google/design.md).
 * Import this ONLY from server actions, never from a client component.
 *
 * The `import "server-only"` below is build-time enforced: Next.js will throw at
 * bundle time if this module is imported from a Client Component. Under vitest the
 * `server-only` module is aliased to `src/test/server-only.shim.ts` (an empty
 * export) so tests run without hitting the guard.
 */

// ── Import specifier adaptation note ─────────────────────────────────────────
// `importFromDesignMd` stays off the @nebutra/design-sync root export to avoid
// eagerly loading the 655 KB @google/design.md alpha lib on every package import.
// App code reaches it through the stable one-level `design-md` public subpath,
// which keeps UI governance dependency boundaries intact.

import "server-only";

import { serializeToDesignMd, serializeToPreviewHtml } from "@nebutra/design-sync";
import { importFromDesignMd } from "@nebutra/design-sync/design-md";
import { BASE_TOKEN_SETS, THEME_TOKEN_SETS } from "@nebutra/design-tokens/themes";
import { THEME_REGISTRY } from "@nebutra/theme/registry";

import type { ExportedTheme, ImportedTheme } from "./design-md-types";
import type { ThemeTokenSet } from "./theme-token-data";

export type { ExportedTheme, ImportedTheme };

// ── Theme JSON lookup ─────────────────────────────────────────────────────────

type DesignTokenTree = Parameters<typeof serializeToDesignMd>[0][number]["tokens"];

function toDesignTokenTree(tokens: unknown): DesignTokenTree {
  return tokens as DesignTokenTree;
}

const THEME_JSON_LOOKUP: Record<string, DesignTokenTree> = {
  nebutra: toDesignTokenTree(THEME_TOKEN_SETS.nebutra),
  "dark-dense": toDesignTokenTree(THEME_TOKEN_SETS["dark-dense"]),
  minimal: toDesignTokenTree(THEME_TOKEN_SETS.minimal),
  vibrant: toDesignTokenTree(THEME_TOKEN_SETS.vibrant),
  ocean: toDesignTokenTree(THEME_TOKEN_SETS.ocean),
};

// ── importDesignMdToThemeTokens ───────────────────────────────────────────────

/**
 * Parse a DESIGN.md string and return a ThemeTokenSet ready for
 * getPreviewStyleFromTokenSet, plus the full ImportReport.
 *
 * Propagates any Error from @google/design.md — the caller (server action) wraps it.
 */
export function importDesignMdToThemeTokens(content: string): ImportedTheme {
  const result = importFromDesignMd(content);

  // Derive a user-facing name from set.name (which is "themes/<slug>").
  // Strip the "themes/" prefix; fall back to "Imported" if somehow absent.
  const rawName = result.set.name ?? "";
  const name = rawName.startsWith("themes/")
    ? rawName.slice("themes/".length)
    : rawName || "imported";

  return {
    tokenSet: result.set.tokens as unknown as ThemeTokenSet,
    report: result.report,
    name,
  };
}

// ── exportThemeToDesignMd ─────────────────────────────────────────────────────

/**
 * Export a built-in theme to DESIGN.md + preview HTML.
 *
 * @param themeId - One of the 5 registry theme IDs (nebutra, dark-dense,
 *                  minimal, vibrant, ocean).
 * @throws Error for an unknown themeId (clear message includes the ID).
 */
export function exportThemeToDesignMd(themeId: string): ExportedTheme {
  const themeJson = THEME_JSON_LOOKUP[themeId];
  if (themeJson === undefined) {
    throw new Error(
      `[design-md-bridge] Unknown themeId: "${themeId}". ` +
        `Must be one of: ${Object.keys(THEME_JSON_LOOKUP).join(", ")}.`,
    );
  }

  const registryEntry = THEME_REGISTRY.themes.find((t) => t.id === themeId);
  const name = registryEntry?.name ?? themeId;

  const sets = [
    { name: "core", relativePath: "core.json", tokens: toDesignTokenTree(BASE_TOKEN_SETS.core) },
    {
      name: "semantic",
      relativePath: "semantic.json",
      tokens: toDesignTokenTree(BASE_TOKEN_SETS.semantic),
    },
    {
      name: `themes/${themeId}`,
      relativePath: `themes/${themeId}.json`,
      tokens: themeJson,
    },
  ];

  const designMd = serializeToDesignMd(sets, { theme: `themes/${themeId}`, name });
  const previewHtml = serializeToPreviewHtml(sets, { theme: `themes/${themeId}`, name });

  return { designMd, previewHtml };
}

// ── exportTokenSetToDesignMd ──────────────────────────────────────────────────

/**
 * Export an ARBITRARY theme token set (any of the 78 registry themes, or a
 * user-imported DESIGN.md theme) to DESIGN.md + preview HTML.
 *
 * Unlike exportThemeToDesignMd — which is limited to the 5 themes hard-imported
 * into THEME_JSON_LOOKUP — this takes the already-resolved DTCG token groups
 * directly from the caller, so the appearance "Copy theme" action works for the
 * full theme catalog plus custom imports.
 *
 * @param name  user-facing theme name (front-matter `name`)
 * @param themeTokens  DTCG token groups (color, radius, fontFamily, …)
 */
export function exportTokenSetToDesignMd(name: string, themeTokens: ThemeTokenSet): ExportedTheme {
  const sets = [
    { name: "core", relativePath: "core.json", tokens: toDesignTokenTree(BASE_TOKEN_SETS.core) },
    {
      name: "semantic",
      relativePath: "semantic.json",
      tokens: toDesignTokenTree(BASE_TOKEN_SETS.semantic),
    },
    {
      name: "themes/custom",
      relativePath: "themes/custom.json",
      tokens: toDesignTokenTree(themeTokens),
    },
  ];

  const designMd = serializeToDesignMd(sets, { theme: "themes/custom", name });
  const previewHtml = serializeToPreviewHtml(sets, { theme: "themes/custom", name });

  return { designMd, previewHtml };
}
