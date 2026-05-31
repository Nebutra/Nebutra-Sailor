"use client";

import { Check, Trash } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { DesignMdImport } from "@/components/theme-playground/design-md-import";
import type { ImportedTheme } from "@/components/theme-playground/design-md-types";
import { useAppearance } from "./store";

/**
 * Appearance-page wrapper for DESIGN.md import.
 *
 * Reuses DesignMdImport (the playground component) directly, then writes the
 * result into the appearance store so vars-provider applies it app-wide and
 * it persists across page reloads via localStorage.
 */
export function DesignMdImportSection() {
  const t = useTranslations("settings.appearance.designMd");
  const [state, update] = useAppearance();

  function handleImported(theme: ImportedTheme) {
    update({
      importedTheme: { name: theme.name, tokenSet: theme.tokenSet },
      theme: "default",
    });
  }

  function handleRemove() {
    update({ importedTheme: null });
  }

  return (
    <div className="space-y-4">
      {state.importedTheme && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <Check className="size-3.5 shrink-0 text-success" />
            <span>
              {t("applied")} <span className="font-medium">{state.importedTheme.name}</span>
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={t("remove")}
            onClick={handleRemove}
            prefix={<Trash />}
          >
            {t("remove")}
          </Button>
        </div>
      )}

      <DesignMdImport onImported={handleImported} />
    </div>
  );
}
