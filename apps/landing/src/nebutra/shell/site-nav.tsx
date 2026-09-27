"use client";

import { Logo, Logomark } from "@nebutra/brand";
import {
  BookOpen,
  Box,
  Buildings,
  Envelope,
  Menu,
  SidebarLeft,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES, SECTION_PATH } from "@/nebutra/routes";
import { SECTIONS, type SectionId } from "@/site-map";

/**
 * The rail, on the design system's SidebarNav: sections and their order come
 * from the site map, each with its icon, and it collapses to icons only.
 */
const ICONS: Partial<Record<SectionId, SidebarNavIcon>> = {
  journal: BookOpen,
  sailor: TerminalWindow,
  sleptons: Users,
  building: Box,
  company: Buildings,
};

const STORE = "nebutra-site-rail-collapsed";

/** The rail's content, shared by the desktop rail and the phone sheet. */
function railSections(pathname: string): SidebarNavSection[] {
  return [
    {
      id: "site",
      items: SECTIONS.filter((s) => s.nav).map((s) => ({
        id: s.id,
        label: s.title.en,
        href: SECTION_PATH[s.id],
        icon: ICONS[s.id],
        isActive: pathname.includes(SECTION_PATH[s.id]),
      })),
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

export function SiteNav({ brandName, mailto }: { brandName: string; mailto: string }) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);

  // A per-viewer convenience: remember the choice, never depend on it.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORE) === "1");
    } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORE, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const sections = railSections(pathname);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 border-r border-border transition-[width] duration-flow ease-brand lg:block",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <SidebarNav
        navLabel="Site"
        collapsed={collapsed}
        sections={sections}
        renderLink={railLink}
        footerItems={railFooter(mailto)}
        header={
          collapsed ? (
            // Collapsed: the mark is the expand control — it shows the sidebar
            // glyph on hover and focus, one control instead of two.
            <Button
              type="button"
              variant="ghost"
              shape="square"
              iconSize="lg"
              onClick={toggle}
              aria-label="Expand navigation"
              className="group relative"
            >
              <span className="transition-opacity duration-micro group-hover:opacity-0 group-focus-visible:opacity-0">
                <Logomark variant="mono" size={22} inverted />
              </span>
              <SidebarLeft className="absolute size-4 -scale-x-100 text-foreground opacity-0 transition-opacity duration-micro group-hover:opacity-100 group-focus-visible:opacity-100" />
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-2 py-1.5 pl-3">
              <Link href={ROUTES.home} aria-label={brandName} className="flex items-center">
                {/* The official wordmark, reversed for the void — never the name typed in a font. */}
                <Logo variant="en" size={104} inverted />
              </Link>
              <Button
                type="button"
                variant="ghost"
                shape="square"
                iconSize="md"
                onClick={toggle}
                aria-label="Collapse navigation"
                className="text-muted-foreground hover:text-foreground"
              >
                <SidebarLeft />
              </Button>
            </div>
          )
        }
        className="h-dvh"
      />
    </aside>
  );
}

/**
 * Below lg the rail is hidden, so phones get a top bar: the wordmark and a
 * menu that opens the same rail in a sheet — same sections, same footer item.
 */
export function SiteMobileNav({ brandName, mailto }: { brandName: string; mailto: string }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  // Close once a destination is reached.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the path is the trigger.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-border border-b bg-background/85 px-4 backdrop-blur-xl lg:hidden">
      <Link href={ROUTES.home} aria-label={brandName} className="flex items-center">
        <Logo variant="en" size={92} inverted />
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            shape="square"
            iconSize="md"
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" closeLabel="Close navigation" className="p-0">
          <SheetTitle className="sr-only">{brandName}</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
          <SidebarNav
            navLabel="Site"
            sections={railSections(pathname)}
            renderLink={railLink}
            footerItems={railFooter(mailto)}
            header={
              <div className="py-1.5 pl-3">
                <Logo variant="en" size={104} inverted />
              </div>
            }
            className="h-full"
          />
        </SheetContent>
      </Sheet>
    </header>
  );
}
