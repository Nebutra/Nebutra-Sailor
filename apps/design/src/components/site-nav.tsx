"use client";

/**
 * The persistent index of the whole system.
 *
 * Before this existed the site had five links in a header, so every page was
 * reached from a top-level list and no page told you what else the system
 * contained. That is what makes a design system read as a set of documents
 * rather than as one product: you are never *inside* it, you are always at an
 * index of it. The sidebar puts the full inventory — every foundation page and
 * every documented export — on screen at all times, and marks where you are.
 *
 * The tree is built on the server from the same registry the pages read and
 * passed down as data. Nothing here is hand-maintained: a component that gains
 * a page appears in this list on the next build.
 */

import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavSection {
  id: string;
  label: string;
  /** Shown after the label — the count is the point, not decoration. */
  meta?: string;
  items: NavItem[];
}

function Section({ section, pathname }: { section: NavSection; pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2 px-2 pt-5 pb-1">
        <span className="font-medium text-[11px] text-foreground uppercase tracking-wider">
          {section.label}
        </span>
        {section.meta ? (
          <span className="text-[10px] text-muted-foreground tabular-nums">{section.meta}</span>
        ) : null}
      </div>
      {section.items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-[var(--radius-sm)] px-2 py-[5px] text-[13px] no-underline transition-colors duration-micro",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SiteNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Design system"
      /* Sticky rather than page-scrolled: the inventory is what you navigate
         by, and a list that scrolls away with the article stops being one. */
      className="sticky top-16 hidden max-h-[calc(100vh-5rem)] flex-col overflow-y-auto pr-4 pb-16 lg:flex"
    >
      {sections.map((section) => (
        <Section key={section.id} pathname={pathname} section={section} />
      ))}
    </nav>
  );
}

/**
 * The same tree as a horizontal strip, for viewports too narrow for the
 * sidebar. It keeps the section headings — a flat run of ninety links with no
 * grouping is worse than the five-link header it replaces.
 */
export function SiteNavCompact({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Design system" className="lg:hidden">
      <div className="-mx-6 flex gap-5 overflow-x-auto px-6 pb-1">
        {sections.map((section) => (
          <div className="flex shrink-0 items-baseline gap-2.5" key={section.id}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {section.label}
            </span>
            {section.items.slice(0, 6).map((item) => (
              <Link
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap text-[13px] no-underline transition-colors",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
