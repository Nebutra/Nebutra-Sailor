"use client";

import { CloudUpload, Trash } from "@nebutra/icons";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DesignMdImport } from "@/components/theme-playground/design-md-import";
import type { ImportedTheme } from "@/components/theme-playground/design-md-types";
import { useAppearance } from "./store";

/**
 * Header action for the theme editor card — opens DESIGN.md import in a popover.
 * Reuses the playground import component, writes the result into the appearance
 * store (applied app-wide + persisted), and surfaces a Remove control while an
 * imported theme is active.
 */
export function ThemeImportButton() {
  const t = useTranslations("settings.appearance.themeEditor");
  const tDesign = useTranslations("settings.appearance.designMd");
  const [state, update] = useAppearance();
  const [open, setOpen] = useState(false);

  function handleImported(theme: ImportedTheme) {
    update({
      importedTheme: { name: theme.name, tokenSet: theme.tokenSet },
      theme: "factory",
    });
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      {state.importedTheme && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={tDesign("remove")}
          onClick={() => update({ importedTheme: null })}
          prefix={<Trash />}
        >
          {tDesign("remove")}
        </Button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button type="button" size="sm" variant="outline" prefix={<CloudUpload />}>
              {t("import")}
            </Button>
          }
        />
        <PopoverContent align="end" className="w-96 p-4">
          <DesignMdImport onImported={handleImported} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
