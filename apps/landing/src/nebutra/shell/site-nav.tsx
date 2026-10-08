"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import {
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { SiteMapTranslator } from "@/nebutra/i18n";
import { ROUTES } from "@/nebutra/routes";
import { SiteMenu } from "@/nebutra/shell/site-menu";
import { ThemedLogo, ThemedLogomark } from "@/nebutra/shell/themed-logo";
import { pageAt, SECTIONS, SITE_MAP } from "@/site-map";

/**
 * a16z-style chrome: a thin top bar — the mono mark top-left opens the
 * navigation, the wordmark sits centred, search sits top-right — and a
 * navigation drawer that is fully hidden until asked for. Hovering the mark
 * slides the drawer out; leaving it slides it back. A click pins it open,
 * which is also how touch screens and keyboards reach it.
 */
/** Hover intent: a pointer crossing the mark on its way elsewhere opens nothing. */
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 240;

export function SiteHeader({ brandName, mailto }: { brandName: string; mailto: string }) {
  const pathname = usePathname() ?? "";
  const t = useTranslations("siteShell");
  const pricing = useTranslations("nav");
  // A full-viewport tool keeps the bar but gives the screen back to the tool.
  const compact = pageAt(pathname)?.chrome === "tool";
  // "hover" closes when the pointer leaves; "pinned" stays until dismissed.
  const [open, setOpen] = useState<false | "hover" | "pinned">(false);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const hoverOpen = () => {
    clear();
    if (open) return;
    timer.current = setTimeout(() => setOpen("hover"), OPEN_DELAY_MS);
  };
  const hoverClose = () => {
    clear();
    if (open !== "hover") return;
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const close = useCallback(() => {
    clear();
    setOpen(false);
  }, [clear]);

  // A destination reached closes the drawer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the path is the trigger.
  useEffect(() => close(), [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearching((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => clear, [clear]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-background/85 px-3 backdrop-blur-xl sm:px-5",
          compact ? "h-12 border-border/80 border-b" : "h-16",
        )}
      >
        <div className="flex items-center" onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="lg"
            aria-label={open ? t("nav.closeNavigation") : t("nav.openNavigation")}
            aria-expanded={Boolean(open)}
            aria-controls="site-drawer"
            onClick={() => {
              clear();
              setOpen((o) => (o === "pinned" ? false : "pinned"));
            }}
          >
            <ThemedLogomark size={compact ? 20 : 24} />
          </Button>
        </div>

        <Link
          href={ROUTES.home}
          aria-label={brandName}
          className="flex items-center justify-center"
        >
          {/* The official wordmark, reversed for the void — never the name typed in a font. */}
          <ThemedLogo size={compact ? 88 : 112} />
        </Link>

        <div className="flex items-center justify-end gap-2 sm:gap-4">
          <Link
            href="/pricing#product-pricing"
            className="text-sm font-medium text-foreground hover:underline"
          >
            {pricing("pricing")}
          </Link>
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="md"
            aria-label={t("nav.searchSite")}
            onClick={() => setSearching(true)}
          >
            <MagnifyingGlass />
          </Button>
        </div>
      </header>

      {/* The drawer: out of the layout entirely, so pages always get the full width. */}
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 motion-safe:transition-opacity motion-safe:duration-flow",
          open === "pinned" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id="site-drawer"
        aria-label={t("nav.siteNavigation")}
        inert={!open}
        onMouseEnter={() => open === "hover" && clear()}
        onMouseLeave={hoverClose}
        className={cn(
          // overscroll-contain: scrolling the drawer never scrolls the page behind it (Stripe does the same).
          "fixed inset-y-0 left-0 z-50 max-w-[100vw] overflow-y-auto overscroll-contain border-r border-border bg-background shadow-ambient-lg",
          "motion-safe:transition-transform motion-safe:duration-flow motion-safe:ease-brand",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SiteMenu
          open={Boolean(open)}
          pathname={pathname}
          mailto={mailto}
          onNavigate={close}
          onClose={close}
        />
      </aside>

      <SiteSearch open={searching} onOpenChange={setSearching} />
    </>
  );
}

/** Every live, static page in the site map, grouped by section. */
function SiteSearch({
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
