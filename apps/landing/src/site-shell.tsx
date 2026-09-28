import { brand } from "@nebutra/brand/metadata";
import type { ReactNode } from "react";
import { RailFrame } from "@/nebutra/shell/rail-frame";
import { SiteFooter } from "@/nebutra/shell/site-footer";
import { SiteMobileNav, SiteNav } from "@/nebutra/shell/site-nav";

/**
 * The frame around every page of the Nebutra site: the a16z-style rail (the
 * design system's SidebarNav) and the site footer, on the nebutra-site Brand
 * Package (the root layout puts `data-brand` on <html>).
 *
 * The template builds with site-shell.for-template.tsx instead: the top-nav
 * site chrome. Layouts render <SiteShell> and never pick a frame themselves.
 */
export function SiteShell({
  children,
}: {
  children: ReactNode;
  /** Only the template's frame has a separate legal footer. */
  footer?: "default" | "legal";
}) {
  const mailto = `mailto:tseka@${brand.domains.landing}`;
  return (
    <RailFrame
      nav={<SiteNav brandName={brand.name} mailto={mailto} />}
      mobileNav={<SiteMobileNav brandName={brand.name} mailto={mailto} />}
      footer={<SiteFooter />}
    >
      {children}
    </RailFrame>
  );
}
