import { brand } from "@nebutra/brand/metadata";
import type { ReactNode } from "react";
import { RailFrame } from "@/nebutra/shell/rail-frame";
import { SiteFooter } from "@/nebutra/shell/site-footer";
import { SiteHeader } from "@/nebutra/shell/site-nav";

/**
 * The frame around every page of the Nebutra site: the a16z-style top bar and
 * hidden navigation drawer (the design system's SidebarNav) and the site footer, on the nebutra-site Brand
 * Package (the root layout puts `data-brand` on <html>).
 *
 * The template builds with site-shell.for-template.tsx instead: the top-nav
 * site chrome. Layouts render <SiteShell> and never pick a frame themselves.
 */
export function SiteShell({
  children,
  footer,
  lang,
}: {
  children: ReactNode;
  /** "none" ends the page on its own content (the status pages); "legal" is the template's. */
  footer?: "default" | "legal" | "none";
  /** The route locale, from the layout's params. Absent (not-found) reads English. */
  lang?: string;
}) {
  const mailto = `mailto:tseka@${brand.domains.landing}`;
  return (
    <RailFrame
      header={<SiteHeader brandName={brand.name} mailto={mailto} />}
      footer={footer === "none" ? null : <SiteFooter lang={lang} />}
    >
      {children}
    </RailFrame>
  );
}
