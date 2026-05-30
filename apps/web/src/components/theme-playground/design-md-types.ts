/**
 * Shared plain-data interfaces for the DESIGN.md import/export pipeline.
 *
 * This file has NO server-only imports and NO @nebutra/design-sync dependency.
 * Both client components and server code import from here so the type definitions
 * are kept in a single place without creating a bundling boundary violation.
 */

import type { ThemeTokenSet } from "./theme-token-data";

export interface ImportReport {
  /** DTCG paths that were present in the DESIGN.md but have no mapping in the bridge. */
  unmapped: string[];
  /** Required token keys absent from the DESIGN.md (e.g. "color.ring"). */
  missingRequired: string[];
  /** Non-fatal advisory messages from the parser. */
  warnings: string[];
}

export interface ImportedTheme {
  /**
   * { color, radius, fontFamily } DTCG leaves — directly renderable via
   * getPreviewStyleFromTokenSet.
   */
  tokenSet: ThemeTokenSet;
  report: ImportReport;
  /**
   * Human-readable name derived from DESIGN.md front-matter (strips "themes/"
   * prefix). Falls back to "imported".
   */
  name: string;
}

export interface ExportedTheme {
  /** DESIGN.md serialisation of the theme token sets. */
  designMd: string;
  /** Standalone HTML preview page for the exported theme. */
  previewHtml: string;
}
