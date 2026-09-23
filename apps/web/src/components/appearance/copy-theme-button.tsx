"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { exportThemeAction, exportTokenSetAction } from "@/components/theme-playground/actions";
import { isFactoryLanguageId, useAppearance } from "./store";

/**
 * Header action — serializes the currently-active design language to DESIGN.md
 * and copies it to the clipboard. Works for LANGUAGE_REGISTRY entries and custom
 * imports (resolves DTCG token groups client-side, serializes via a server action).
 */
export function CopyThemeButton() {
  const t = useTranslations("settings.appearance.themeEditor");
  const [state] = useAppearance();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  /**
   * Both branches serialize through the canonical bridge: a built-in theme by
   * id (`exportThemeAction` — factory, the mode sets and every design language,
   * the latter off the light SSOT as its base), a custom import by its own
   * token set. The old path read `getTokenSet`, which only knew light/dark, so
   * copying factory or a design language failed.
   */
  function handleCopy() {
    setError(false);
    startTransition(async () => {
      let designMd: string;
      if (state.importedTheme) {
        const res = await exportTokenSetAction(
          state.importedTheme.name,
          state.importedTheme.tokenSet as unknown as Record<string, unknown>,
        );
        if (!res.ok) {
          setError(true);
          return;
        }
        designMd = res.designMd;
      } else {
        const themeId = isFactoryLanguageId(state.theme) ? "factory" : state.theme;
        const res = await exportThemeAction(themeId);
        if (!res.ok) {
          setError(true);
          return;
        }
        designMd = res.export.designMd;
      }
      try {
        await navigator.clipboard.writeText(designMd);
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
