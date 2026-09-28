"use client";

import type { ReactNode } from "react";
import { FooterMinimal } from "@/components/landing/FooterMinimal";
import { Navbar } from "@/components/landing/Navbar";
import { usePathname } from "@/i18n/navigation";
import { pageAt } from "@/site-map";
import { PageTransition } from "./page-transition";

/**
 * The frame around every template page: navigation, the page, the footer.
 * Pages never render their own chrome; `site-map.ts` says when a page needs a
 * different frame.
 *
 * The column is at least one screen tall and the page takes the slack
 * (`flex-1` on its root), so a short page still puts the footer at the bottom.
 */
export function SiteChrome({
  children,
  footer = "default",
}: {
  children: ReactNode;
  footer?: "default" | "legal";
}) {
  const chrome = pageAt(usePathname())?.chrome;
  if (chrome === "bare") return children;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navbar forceDarkTheme={chrome === "over-dark"} />
      <PageTransition className="flex flex-1 flex-col">{children}</PageTransition>
      <FooterMinimal variant={footer} />
    </div>
  );
}
