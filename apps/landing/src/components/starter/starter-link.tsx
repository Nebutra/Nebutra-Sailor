import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { appHref } from "./starter-copy";

/**
 * A link from src/content/site.ts: a site path goes through the locale-aware
 * router, a product-app path ("app:/…") is a plain link to the app.
 */
export function StarterLink({
  href,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  const app = appHref(href);
  if (app) return <a href={app} {...props} />;
  return <Link href={href} {...props} />;
}
