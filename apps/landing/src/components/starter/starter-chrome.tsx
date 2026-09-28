"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { pageAt } from "@/site-map";
import { StarterFooter } from "./starter-footer";
import { StarterNav } from "./starter-nav";

/**
 * The frame around every page of the starter site: the top bar, the page, the
 * footer. Pages render content only; a page site-map.ts marks `chrome: "bare"`
 * draws its own frame.
 */
export function StarterChrome({
  children,
  footer = "default",
}: {
  children: ReactNode;
  footer?: "default" | "legal";
}) {
  if (pageAt(usePathname())?.chrome === "bare") return children;
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <StarterNav />
      {children}
      <StarterFooter variant={footer} />
    </div>
  );
}
