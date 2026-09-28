"use client";

import { Logo, Logomark } from "@nebutra/brand";
import {
  BookOpen,
  Box,
  Buildings,
  Envelope,
  MagnifyingGlass,
  TerminalWindow,
  Users,
} from "@nebutra/icons";
import {
  SidebarNav,
  type SidebarNavIcon,
  type SidebarNavItem,
  type SidebarNavRenderLinkProps,
  type SidebarNavSection,
} from "@nebutra/ui/patterns";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { ROUTES, SECTION_PATH } from "@/nebutra/routes";
import { pageAt, SECTIONS, SERVED_PAGES, type SectionId, SITE_MAP } from "@/site-map";

/**
 * a16z-style chrome: a thin top bar — the mono mark top-left opens the
 * navigation, the wordmark sits centred, search sits top-right — and a
 * navigation drawer that is fully hidden until asked for. Hovering the mark
 * slides the drawer out; leaving it slides it back. A click pins it open,
 * which is also how touch screens and keyboards reach it.
 */
const ICONS: Partial<Record<SectionId, SidebarNavIcon>> = {
  journal: BookOpen,
  sailor: TerminalWindow,
  sleptons: Users,
  building: Box,
  company: Buildings,
};

/** Hover intent: a pointer crossing the mark on its way elsewhere opens nothing. */
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 240;

const within = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

/**
 * The rail's content, shared by the desktop rail and the phone sheet. A
 * section with pages marked `rail` in the site map opens into them, its own
 * index first; the section holding the current page starts open.
 */
function railSections(pathname: string): SidebarNavSection[] {
  const here = pageAt(pathname)?.section;
  return [
    {
      id: "site",
      items: SECTIONS.filter((s) => s.nav).map((s) => {
        const pages = SERVED_PAGES.filter((p) => p.section === s.id && p.rail);
        const item: SidebarNavItem = {
          id: s.id,
          label: s.title.en,
          href: SECTION_PATH[s.id],
          icon: ICONS[s.id],
          isActive: here === s.id,
        };
        if (pages.length === 0) return item;
        const children: SidebarNavItem[] = [
          {
            id: `${s.id}-index`,
            label: "Overview",
            href: SECTION_PATH[s.id],
            isActive: pathname === SECTION_PATH[s.id],
          },
          ...pages.map((p) => ({
            id: p.path,
            label: p.title.en,
            href: p.path,
            isActive: within(pathname, p.path),
          })),
        ];
        return { ...item, children };
      }),
    },
  ];
}

const railFooter = (mailto: string): SidebarNavItem[] => [
  { id: "founder", label: "Write to the founder", href: mailto, icon: Envelope },
];

function railLink({ href, children, className, onClick, ...aria }: SidebarNavRenderLinkProps) {
  return href.startsWith("mailto:") ? (
    <a href={href} className={className} onClick={onClick} {...aria}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className} onClick={onClick} {...aria}>
      {children}
    </Link>
  );
}

export function SiteHeader({ brandName, mailto }: { brandName: string; mailto: string }) {
  const pathname = usePathname() ?? "";
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
  }, []);

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

  useEffect(() => clear, []);

  return (
    <>
      <header className="sticky top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center bg-background/85 px-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center" onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="lg"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={Boolean(open)}
            aria-controls="site-drawer"
            onClick={() => {
              clear();
              setOpen((o) => (o === "pinned" ? false : "pinned"));
            }}
          >
            <Logomark variant="mono" size={24} inverted />
          </Button>
        </div>

        <Link
          href={ROUTES.home}
          aria-label={brandName}
          className="flex items-center justify-center"
        >
          {/* The official wordmark, reversed for the void — never the name typed in a font. */}
          <Logo variant="en" size={112} inverted />
        </Link>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="md"
            aria-label="Search the site"
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
          "fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-flow",
          open === "pinned" ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id="site-drawer"
        aria-label="Site navigation"
        inert={!open}
        onMouseEnter={() => open === "hover" && clear()}
        onMouseLeave={hoverClose}
        className={cn(
          // overscroll-contain: scrolling the drawer never scrolls the page behind it (Stripe does the same).
          "fixed inset-y-0 left-0 z-50 w-64 overscroll-contain border-r border-border bg-background shadow-ambient-lg",
          "motion-safe:transition-transform motion-safe:duration-flow motion-safe:ease-brand",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarNav
          navLabel="Site"
          sections={railSections(pathname)}
          renderLink={railLink}
          footerItems={railFooter(mailto)}
          header={
            <div className="flex h-16 items-center pl-3">
              <Link href={ROUTES.home} aria-label={brandName} onClick={close}>
                <Logo variant="en" size={104} inverted />
              </Link>
            </div>
          }
          className="h-dvh"
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
  const router = useRouter();
  const pages = SITE_MAP.filter((p) => p.status === "live" && !p.path.includes("["));
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages" />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>
        {SECTIONS.map((section) => {
          const inSection = pages.filter((p) => p.section === section.id);
          if (inSection.length === 0) return null;
          return (
            <CommandGroup key={section.id} heading={section.title.en}>
              {inSection.map((page) => (
                <CommandItem
                  key={page.path}
                  value={`${page.title.en} ${page.title.zh} ${page.path}`}
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(page.path);
                  }}
                >
                  {page.title.en}
                  <span className="ml-auto text-xs text-muted-foreground">{page.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
