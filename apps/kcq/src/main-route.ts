export type KcqRoute = "workbench" | "profile";

export function getKcqRoute(pathname: string): KcqRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === "/settings/profile" ? "profile" : "workbench";
}
