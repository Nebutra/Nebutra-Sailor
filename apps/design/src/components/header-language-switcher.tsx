"use client";

/**
 * The header instance of the shared switcher, hidden on the home page.
 *
 * The switcher itself lives in @nebutra/theme — it is the same control the
 * marketing site mounts, and neither app owns a copy. What is local is this
 * one rule: the home page mounts the full-size picker directly above the
 * surface it rewrites, and rendering both put two identical eight-button rows
 * within a screen of each other, where the second reads as a broken duplicate
 * rather than a convenience.
 *
 * That rule stays here rather than in the package because it depends on
 * `usePathname` — a Next router hook, and the package must not require a router
 * to render a button.
 */

import { DesignLanguageSwitcher } from "@nebutra/theme/language-switcher";
import { usePathname } from "next/navigation";

export function HeaderLanguageSwitcher() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <DesignLanguageSwitcher variant="compact" />;
}
