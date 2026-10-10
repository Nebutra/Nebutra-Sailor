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
import type * as React from "react";
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
 *
 * One bar, one logo position. The bar sits above the drawer, so the mark never
 * moves or disappears; opening the drawer crossfades the centred wordmark into a
 * second one beside the mark, after a fixed gap — the drawer's own top row. The page
 * behind is dimmed by a scrim that fades with the drawer, never cut off. All of
 * it is transform/opacity on the brand duration and easing tokens, and reduced
 * motion drops the glide (`motion-safe`).
 */
const FADE =
  "motion-safe:transition-[transform,opacity] motion-safe:[transition-duration:var(--duration-reveal)] motion-safe:ease-brand";
/** Hover intent: a pointer crossing the mark on its way elsewhere opens nothing. */
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 240;

export function SiteHeader({ brandName, mailto }: { brandName: string; mailto: string }) {
  const pathname = usePathname() ?? "";
  const t = useTranslations("siteShell");
  // A full-viewport tool keeps the bar but gives the screen back to the tool.
  const compact = pageAt(pathname)?.chrome === "tool";
  // "hover" closes when the pointer leaves; "pinned" stays until dismissed.
  const wordmark = compact ? 88 : 112;
  const [open, setOpen] = useState<false | "hover" | "pinned">(false);
  const [searching, setSearching] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
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
  // The bar sits over the drawer's top row, so the pointer crossing the bar on its way
  // down is still inside the drawer's territory: left of the drawer's edge keeps it open.
  const barMove = (event: React.MouseEvent) => {
    if (open !== "hover") return;
    const edge = asideRef.current?.getBoundingClientRect().right ?? 0;
    if (event.clientX <= edge) clear();
    else if (!timer.current) timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
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
        onMouseMove={barMove}
        onMouseLeave={hoverClose}
        className={cn(
          // Opaque, with a hairline: the bar never shows the page sliding under
          // it, and the hero's light starts cleanly below it.
          "sticky top-0 z-50 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-border/80 border-b bg-background px-3 sm:px-5",
          compact ? "h-12" : "h-16",
        )}
      >
        <div
          className="relative flex items-center justify-self-start"
          onMouseEnter={hoverOpen}
          onMouseLeave={() => !open && clear()}
        >
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="lg"
            className="size-10"
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
          {/* Open: the wordmark beside the mark, out of flow so the bar never reflows, one gap (ml-2) after it, fading in with an 8px slide. */}
          <Link
            href={ROUTES.home}
            aria-label={brandName}
            onClick={close}
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            className={cn(
              "absolute inset-y-0 left-full ml-2 flex w-max items-center",
              FADE,
              open ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0",
            )}
          >
            <ThemedLogo size={wordmark} />
          </Link>
        </div>

        {/* Closed: centred. Open: fades out in place (no travel) as the one beside the mark fades in. */}
        <Link
          href={ROUTES.home}
          aria-label={brandName}
          onClick={close}
          tabIndex={open ? -1 : 0}
          aria-hidden={Boolean(open)}
          className={cn(
            "flex items-center justify-center",
            FADE,
            open ? "pointer-events-none scale-[0.98] opacity-0" : "scale-100 opacity-100",
          )}
        >
          {/* The official wordmark, reversed for the void — never the name typed in a font. */}
          <ThemedLogo size={wordmark} />
        </Link>

        <div className="flex items-center justify-end gap-2 sm:gap-4">
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="md"
            className="size-10"
            aria-label={t("nav.searchSite")}
            onClick={() => setSearching(true)}
          >
            <MagnifyingGlass />
          </Button>
        </div>
      </header>

      {/* The drawer: out of the layout entirely, so pages always get the full width.
          The scrim fades with it (hover included) so the page recedes instead of being cut. */}
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:[transition-duration:var(--duration-reveal)] motion-safe:ease-brand",
          open ? "opacity-100" : "opacity-0",
          open === "pinned" ? "" : "pointer-events-none",
        )}
      />
      <aside
        ref={asideRef}
        id="site-drawer"
        aria-label={t("nav.siteNavigation")}
        inert={!open}
        onMouseEnter={() => open === "hover" && clear()}
        onMouseLeave={hoverClose}
        className={cn(
          // z-[45]: under the bar, so the bar is the drawer's top row. pt = bar height.
          // overscroll-contain: scrolling the drawer never scrolls the page behind it (Stripe does the same).
          "fixed inset-y-0 left-0 z-[45] max-w-[100vw] overflow-y-auto overscroll-contain border-r border-border bg-background shadow-ambient-lg",
          compact ? "pt-12" : "pt-16",
          "motion-safe:transition-[transform,box-shadow] motion-safe:[transition-duration:var(--duration-reveal)] motion-safe:ease-brand",
          open ? "translate-x-0" : "-translate-x-full shadow-none",
        )}
      >
        <SiteMenu open={Boolean(open)} pathname={pathname} mailto={mailto} onNavigate={close} />
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
