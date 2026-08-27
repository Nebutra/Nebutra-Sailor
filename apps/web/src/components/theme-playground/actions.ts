"use server";

import {
  exportThemeToDesignMd,
  exportTokenSetToDesignMd,
  importDesignMdToThemeTokens,
} from "./design-md-bridge";
import type { ExportedTheme, ImportedTheme } from "./design-md-types";

export async function importDesignMdAction(
  content: string,
): Promise<{ ok: true; theme: ImportedTheme } | { ok: false; error: string }> {
  try {
    const theme = importDesignMdToThemeTokens(content);
    return { ok: true, theme };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function exportThemeAction(
  themeId: string,
): Promise<{ ok: true; export: ExportedTheme } | { ok: false; error: string }> {
  try {
    const exported = exportThemeToDesignMd(themeId);
    return { ok: true, export: exported };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Export an already-resolved theme token set (any registry theme or a custom
 * import) to DESIGN.md. Powers the appearance "Copy theme" action, which needs
 * to serialize the full catalog — not only the 5 hard-imported built-ins.
 */
export async function exportTokenSetAction(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  themeTokens: Record<string, any>,
): Promise<{ ok: true; designMd: string } | { ok: false; error: string }> {
  try {
    const exported = exportTokenSetToDesignMd(name, themeTokens);
    return { ok: true, designMd: exported.designMd };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
