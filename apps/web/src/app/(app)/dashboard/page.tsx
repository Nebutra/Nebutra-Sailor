import { redirect } from "next/navigation";

/**
 * Legacy `/dashboard` alias.
 *
 * Post-login defaults and old bookmarks used this path; product home is now
 * `/workspace` → `/startup-os`. Keep a permanent redirect so OAuth returnTo
 * and external links never hard-404.
 */
export default function DashboardAliasPage(): never {
  redirect("/workspace");
}
