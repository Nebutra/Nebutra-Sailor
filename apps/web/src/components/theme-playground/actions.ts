"use server";

import { exportThemeToDesignMd, importDesignMdToThemeTokens } from "./design-md-bridge";
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
