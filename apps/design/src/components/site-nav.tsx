"use client";

/**
 * The persistent index of the whole system.
 *
 * Before this existed the site had five links in a header, so every page was
 * reached from a top-level list and no page told you what else the system
 * contained. The sidebar puts the full inventory — every foundation page and
 * every documented export — on screen at all times, and marks where you are.
 *
 * The tree is built on the server from the same registry the pages read and
 * passed down as data. Nothing here is hand-maintained: a component that gains
 * a page appears in this list on the next build.
 *
 * The design-language control sits at the top of the rail. It is the site's
 * signature — the one thing no other docs site has — so it is placed where the
 * eye lands first on every page, the same place every time, instead of being a
 * row of pills in the header on some pages and a picker in the content on one.
 *
 * Narrow screens get the same tree in a sheet, opened from the header, and the
 * language control in the page bar under it — still one control, still in one
 * place for that layout.
 */

import { Menu } from "@nebutra/icons";
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { LanguageSwitcher } from "@/components/language-switcher";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavSection {
  id: string;
  label: string;
  /** Shown after the label — the count is the point, not decoration. */
  meta?: string;
  /** 2 nests the section under the one before it (the library's groups). */
  level?: 1 | 2;
  items: NavItem[];
}

function Section({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const nested = section.level === 2;
  return (
    <div className={cn("flex flex-col", nested ? "pt-4" : "pt-6 first:pt-0")}>
      <div className="flex items-baseline justify-between gap-2 px-2.5 pb-1.5">
        <span
          className={cn(
            "font-medium",
            nested ? "text-muted-foreground text-xs" : "text-foreground text-ui",
          )}
        >
          {section.label}
        </span>
        {section.meta ? (
          <span className="text-2xs text-muted-foreground tabular-nums">{section.meta}</span>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-px p-0">
        {section.items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center rounded-[var(--radius-sm)] px-2.5 py-1.5 text-ui no-underline transition-colors duration-micro",
                  // The current page carries ink, a tint and a 2px ink rule on its
                  // leading edge: three cues, so it reads in any language,
                  // including the ones whose hover tint is barely off-canvas.
                  // Weight stays put — a bolder label would reflow the row.
                  active
                    ? "bg-accent text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                href={item.href}
                {...(onNavigate ? { onClick: onNavigate } : {})}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Tree({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = usePathname();
  return (
    <>
      {sections.map((section) => (
        <Section key={section.id} onNavigate={onNavigate} pathname={pathname} section={section} />
      ))}
    </>
  );
}

/** Desktop rail. Sticky: the inventory is what you navigate by. */
export function SiteNav({ sections }: { sections: NavSection[] }) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col border-border border-r lg:flex">
      <div className="px-3 pt-5 pb-2">
        <LanguageSwitcher shortcut variant="sidebar" />
      </div>
      <nav
        aria-label="Design system"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-12"
      >
        <Tree sections={sections} />
      </nav>
    </aside>
  );
}

/** The same tree in a sheet, for viewports too narrow for the rail. */
export function SiteNavSheet({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="-ml-1 text-muted-foreground lg:hidden"
          iconSize="sm"
          shape="square"
          variant="ghost"
        >
          <Menu aria-hidden className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0" side="left">
        <SheetTitle className="px-5 pt-5 pb-3 text-sm">Design system</SheetTitle>
        <nav aria-label="Design system" className="min-h-0 flex-1 overflow-y-auto px-3 pb-10">
          <Tree onNavigate={close} sections={sections} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Narrow-screen page bar: where you are, and the language control. Sticky under
 * the header so switching never needs a scroll back to the top.
 */
export function MobilePageBar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const here = React.useMemo(() => {
    for (const section of sections) {
      const item = section.items.find((entry) => entry.href === pathname);
      if (item) return { section: section.label, label: item.label };
    }
    return null;
  }, [pathname, sections]);

  return (
    <div className="sticky top-14 z-20 flex h-12 items-center justify-between gap-3 border-border border-b bg-background/80 px-4 backdrop-blur-md md:px-6 lg:hidden">
      <p className="m-0 min-w-0 truncate text-ui">
        {here ? (
          <>
            <span className="text-muted-foreground">{here.section}</span>
            <span aria-hidden className="px-1.5 text-muted-foreground">
              /
            </span>
            <span className="font-medium text-foreground">{here.label}</span>
          </>
        ) : (
          <span className="font-medium text-foreground">
            {pathname === "/" ? "Home" : "Overview"}
          </span>
        )}
      </p>
      <LanguageSwitcher variant="bar" />
    </div>
  );
}
