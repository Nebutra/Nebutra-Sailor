import { redirect } from "next/navigation";

/**
 * Legacy `/dashboard` alias.
 *
 * Post-login defaults and old bookmarks used this path; product home is now
 * `/workspace`, which lands on Startup OS or Connectors depending on the
 * prototype flag. Keep a permanent redirect so OAuth returnTo and external
 * links never hard-404.
 */
export default function DashboardAliasPage(): never {
  redirect("/workspace");
}
