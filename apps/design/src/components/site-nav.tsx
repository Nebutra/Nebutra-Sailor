"use client";

/**
 * The persistent index of the whole system.
 *
 * Before this existed the site had five links in a header, so every page was
 * reached from a top-level list and no page told you what else the system
 * contained. The sidebar puts the full inventory — every foundation page and
 * every documented export — on screen at all times, and marks where you are.
 *
 * The site has four groups — Design, Develop, Ecosystem, Resources — and the
 * rail shows the pages of the group the current URL belongs to; the header tabs
 * (`TopNav`) move between groups. The home page has no rail: it is the front
 * door, and the tabs are its navigation.
 *
 * The tree is built on the server from the same registry the pages read and
 * passed down as data. Nothing here is hand-maintained: a component that gains
 * a page appears in this list on the next build.
 *
 * The design-language control is not here: it is the last crumb of the header
 * breadcrumb, on every layout, so the rail starts directly at the inventory.
 *
 * Narrow screens get the same tree in a sheet, opened from the header, with the
 * four groups as tabs above it — the header tabs are hidden at that width.
 */

import { ArrowUpRight, Menu } from "@nebutra/icons";
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { groupForPath, NAV_GROUPS, type NavGroupId } from "@/lib/nav-groups";

export interface NavItem {
  href: string;
  label: string;
  /** Words that find it in the palette without being its name. */
  keywords?: string;
  /** Not a page of this app: a plain file (llms.txt) or another site. */
  kind?: "file" | "external";
}

export interface NavSection {
  id: string;
  /** The top-level group whose rail shows it; "map" is the home-page menu. */
  group: NavGroupId | "map";
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
    <div className={cn("flex flex-col", nested ? "pt-5" : "pt-8 first:pt-0")}>
      <div className="flex h-8 items-center justify-between gap-2 px-3">
        <span
          className={cn(
            "font-medium",
            nested ? "text-muted-foreground text-xs" : "text-foreground text-sm",
          )}
        >
          {section.label}
        </span>
        {section.meta ? (
          <span className="text-muted-foreground text-xs tabular-nums">{section.meta}</span>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {section.items.map((item) => {
          const active = pathname === item.href;
          const className = cn(
            // Geist's rail: 14px items in the secondary ink (not the
            // tertiary grey — a whole column of 45% grey is what made the
            // old rail read washed out), a 6px tinted row and full ink
            // for the current page. Colour only: weight would reflow it.
            "flex h-8 items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 text-sm no-underline transition-colors duration-micro",
            active
              ? "bg-muted text-foreground"
              : "text-neutral-11 hover:bg-muted hover:text-foreground",
          );
          return (
            <li key={item.href}>
              {item.kind ? (
                // Not routed by the app, so a plain anchor: a Link would
                // prefetch it as a page.
                <a
                  className={className}
                  href={item.href}
                  {...(item.kind === "external" ? { rel: "noreferrer", target: "_blank" } : {})}
                >
                  <span className="truncate">{item.label}</span>
                  <ArrowUpRight aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                </a>
              ) : (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={className}
                  href={item.href}
                  {...(onNavigate ? { onClick: onNavigate } : {})}
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The sections the rail shows for a URL: its group's, or the site map. */
function sectionsFor(sections: NavSection[], pathname: string): NavSection[] {
  const group = groupForPath(pathname);
  return sections.filter((section) => section.group === (group?.id ?? "map"));
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
      {sectionsFor(sections, pathname).map((section) => (
        <Section key={section.id} onNavigate={onNavigate} pathname={pathname} section={section} />
      ))}
    </>
  );
}

/** The four groups as header tabs, from `lg` up; narrower screens use the sheet. */
export function TopNav() {
  const active = groupForPath(usePathname())?.id;
  return (
    <nav aria-label="Sections" className="ml-4 hidden items-center gap-0.5 lg:flex">
      {NAV_GROUPS.map((group) => (
        <Link
          aria-current={group.id === active ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center rounded-[var(--radius-md)] px-3 text-sm no-underline transition-colors duration-micro",
            group.id === active
              ? "bg-muted text-foreground"
              : "text-neutral-11 hover:bg-muted hover:text-foreground",
          )}
          href={group.href}
          key={group.id}
        >
          {group.label}
        </Link>
      ))}
    </nav>
  );
}

/** Desktop rail. Sticky: the inventory is what you navigate by. */
export function SiteNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  // The home page is the front door, not a place inside one group.
  if (!groupForPath(pathname)) return null;
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col border-hairline border-r lg:flex">
      <nav
        aria-label="Design system"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-8 pb-12"
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
  const active = groupForPath(usePathname())?.id;
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
        <SheetTitle className="px-7 pt-6 pb-4 text-sm">Design system</SheetTitle>
        <nav aria-label="Sections" className="grid grid-cols-2 gap-2 px-4 pb-4">
          {NAV_GROUPS.map((group) => (
            <Link
              aria-current={group.id === active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center justify-center rounded-[var(--radius-md)] text-sm no-underline transition-colors duration-micro",
                group.id === active
                  ? "bg-muted text-foreground"
                  : "text-neutral-11 hover:bg-muted hover:text-foreground",
              )}
              href={group.href}
              key={group.id}
              onClick={close}
            >
              {group.label}
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Design system"
          className="min-h-0 flex-1 overflow-y-auto border-hairline border-t px-4 pt-4 pb-10"
        >
          <Tree onNavigate={close} sections={sections} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Narrow-screen page bar: where you are. Sticky under the header, which carries
 * the language control on every width.
 */
export function MobilePageBar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const here = React.useMemo(() => {
    const group = groupForPath(pathname);
    if (!group) return null;
    const item = sectionsFor(sections, pathname)
      .flatMap((section) => section.items)
      .find((entry) => entry.href === pathname);
    return { section: group.label, label: item?.label ?? "Overview" };
  }, [pathname, sections]);

  return (
    <div className="sticky top-16 z-20 flex h-12 items-center justify-between gap-3 border-hairline border-b bg-background/80 px-4 backdrop-blur-md md:px-6 lg:hidden">
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
          <span className="font-medium text-foreground">Home</span>
        )}
      </p>
    </div>
  );
}
