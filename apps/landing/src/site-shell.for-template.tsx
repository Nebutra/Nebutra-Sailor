import type { ReactNode } from "react";
import { SiteChrome } from "@/components/site-shell/site-chrome";

/**
 * The template's frame: the top-nav site chrome. See site-shell.tsx;
 * template-build puts this file in its place.
 */
export function SiteShell({
  children,
  footer = "default",
}: {
  children: ReactNode;
  footer?: "default" | "legal";
}) {
  return <SiteChrome footer={footer}>{children}</SiteChrome>;
}
