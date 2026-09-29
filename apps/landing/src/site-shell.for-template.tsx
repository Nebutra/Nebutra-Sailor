import type { ReactNode } from "react";
import { StarterChrome } from "@/components/starter/starter-chrome";

/**
 * The template's frame: the starter site's top bar and footer. See
 * site-shell.tsx; template-build puts this file in its place.
 */
export function SiteShell({
  children,
  footer = "default",
}: {
  children: ReactNode;
  footer?: "default" | "legal" | "none";
  /** The route locale; the Nebutra frame's footer reads it. */
  lang?: string;
}) {
  return <StarterChrome footer={footer}>{children}</StarterChrome>;
}
