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
// `importFromDesignMd` is intentionally NOT exported from the @nebutra/design-sync
// main entry (to avoid eagerly loading the 655 KB @google/design.md alpha lib on
// every import of the package). Instead we use the subpath export
// `@nebutra/design-sync/serialize/from-design-md`, which is:
//   - registered in design-sync/package.json `exports["./serialize/from-design-md"]`
//   - resolved to source via tsconfig paths alias (apps/web/tsconfig.json)
//   - resolved to source via vitest resolve.alias (apps/web/vitest.config.ts)
//
// `serializeToDesignMd` and `serializeToPreviewHtml` are PURE (no alpha lib) and
// are already exported from the main entry, so they are imported normally.

import "server-only";

import { serializeToDesignMd, serializeToPreviewHtml } from "@nebutra/design-sync";
import {
  type ImportReport,
  importFromDesignMd,
} from "@nebutra/design-sync/serialize/from-design-md";
import coreJson from "@nebutra/design-tokens/tokens/core.json" with { type: "json" };
import semanticJson from "@nebutra/design-tokens/tokens/semantic.json" with { type: "json" };
import darkDenseJson from "@nebutra/design-tokens/tokens/themes/dark-dense.json" with {
  type: "json",
};
import minimalJson from "@nebutra/design-tokens/tokens/themes/minimal.json" with { type: "json" };
import nebutraJson from "@nebutra/design-tokens/tokens/themes/nebutra.json" with { type: "json" };
import oceanJson from "@nebutra/design-tokens/tokens/themes/ocean.json" with { type: "json" };
import vibrantJson from "@nebutra/design-tokens/tokens/themes/vibrant.json" with { type: "json" };
import { THEME_REGISTRY } from "@nebutra/theme/registry";

import type { ExportedTheme, ImportedTheme } from "./design-md-types";
import type { ThemeTokenSet } from "./theme-token-data";

export type { ExportedTheme, ImportedTheme };

// ── Theme JSON lookup ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

const THEME_JSON_LOOKUP: Record<string, AnyRecord> = {
  nebutra: nebutraJson,
  "dark-dense": darkDenseJson,
  minimal: minimalJson,
  vibrant: vibrantJson,
  ocean: oceanJson,
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
    { name: "core", relativePath: "core.json", tokens: coreJson as unknown as AnyRecord },
    {
      name: "semantic",
      relativePath: "semantic.json",
      tokens: semanticJson as unknown as AnyRecord,
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
export function exportTokenSetToDesignMd(name: string, themeTokens: AnyRecord): ExportedTheme {
  const sets = [
    { name: "core", relativePath: "core.json", tokens: coreJson as unknown as AnyRecord },
    {
      name: "semantic",
      relativePath: "semantic.json",
      tokens: semanticJson as unknown as AnyRecord,
    },
    { name: "themes/custom", relativePath: "themes/custom.json", tokens: themeTokens },
  ];

  const designMd = serializeToDesignMd(sets, { theme: "themes/custom", name });
  const previewHtml = serializeToPreviewHtml(sets, { theme: "themes/custom", name });

  return { designMd, previewHtml };
}
