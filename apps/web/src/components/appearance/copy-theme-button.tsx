"use client";

import { Check, Copy } from "@nebutra/icons";
import { DEFAULT_THEME, listThemesAsLegacyEntries } from "@nebutra/theme/registry";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { exportTokenSetAction } from "@/components/theme-playground/actions";
import { getTokenSet } from "@/components/theme-playground/theme-token-data";
import { useAppearance } from "./store";

const DEFAULT_ID = "default";

/**
 * Header action — serializes the currently-active theme to DESIGN.md and copies
 * it to the clipboard. Works for the full registry catalog and custom imports
 * (resolves DTCG token groups client-side, serializes via a server action).
 */
export function CopyThemeButton() {
  const t = useTranslations("settings.appearance.themeEditor");
  const tPreset = useTranslations("settings.appearance.themePreset");
  const [state] = useAppearance();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  function resolveTheme(): { name: string; tokens: Record<string, unknown> } | null {
    if (state.importedTheme) {
      return {
        name: state.importedTheme.name,
        tokens: state.importedTheme.tokenSet as unknown as Record<string, unknown>,
      };
    }
    const isDefault = !state.theme || state.theme === DEFAULT_ID;
    const themeId = isDefault ? DEFAULT_THEME : state.theme;
    const tokens = getTokenSet(themeId);
    if (!tokens) return null;
    const registry = listThemesAsLegacyEntries().find((theme) => theme.id === themeId);
    const name = isDefault ? tPreset("default") : (registry?.name ?? themeId);
    return { name, tokens: tokens as unknown as Record<string, unknown> };
  }

  function handleCopy() {
    const resolved = resolveTheme();
    if (!resolved) {
      setError(true);
      return;
    }
    setError(false);
    startTransition(async () => {
      const res = await exportTokenSetAction(resolved.name, resolved.tokens);
      if (!res.ok) {
        setError(true);
        return;
      }
      try {
        await navigator.clipboard.writeText(res.designMd);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleCopy}
      prefix={copied ? <Check className="text-success" /> : <Copy />}
    >
      {copied ? t("copied") : error ? t("copyError") : t("copy")}
    </Button>
  );
}
