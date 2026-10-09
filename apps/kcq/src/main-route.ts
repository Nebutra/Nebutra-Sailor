/** Routes of the authenticated app (index.html). Public pages have their own entry: src/public/. */
export type KcqRoute = "root" | "workbench" | "profile";

/** The workbench path; `/` redirects here (nginx in production, main.ts in dev). */
export const APP_PATH = "/app";

export function getKcqRoute(pathname: string): KcqRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") return "root";
  return normalized === "/settings/profile" ? "profile" : "workbench";
}
