"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { pageAt } from "@/site-map";
import { StarterFooter } from "./starter-footer";
import { StarterNav } from "./starter-nav";

/**
 * The frame around every page of the starter site: the top bar, the page, the
 * footer. Pages render content only; a page site-map.ts marks `chrome: "bare"`
 * draws its own frame; one marked `chrome: "no-footer"` ends without the footer.
 */
export function StarterChrome({
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
      <StarterNav />
      {children}
      {chrome === "no-footer" ? null : <StarterFooter variant={footer} />}
    </div>
  );
}
