"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { SiteMapTranslator } from "@/nebutra/i18n";
import { SECTIONS, SITE_MAP } from "@/site-map";

/** Every live, static page in the site map, grouped by section. */
export function SiteSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("siteShell");
  const tMap = useTranslations("siteMap") as unknown as SiteMapTranslator;
  const router = useRouter();
  const pages = SITE_MAP.filter((p) => p.status === "live" && !p.path.includes("["));
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("nav.searchPages")} />
      <CommandList>
        <CommandEmpty>{t("nav.noMatch")}</CommandEmpty>
        {SECTIONS.map((section) => {
          const inSection = pages.filter((p) => p.section === section.id);
          if (inSection.length === 0) return null;
          return (
            <CommandGroup key={section.id} heading={tMap(`sections.${section.id}.title`)}>
              {inSection.map((page) => {
                const title = tMap(`pages.${page.key}.title`);
                return (
                  <CommandItem
                    key={page.path}
                    value={`${title} ${page.path}`}
                    onSelect={() => {
                      onOpenChange(false);
                      router.push(page.path);
                    }}
                  >
                    {title}
                    <span className="ml-auto text-xs text-muted-foreground">{page.path}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
