import type { ReactNode } from "react";

/**
 * Page width frames — single place for layout max-width + horizontal padding.
 * Server-safe (no client-only cn).
 *
 * - wide: 1400 catalogs / grids
 * - content: ~64rem docs / console pages
 * - text: ~48rem tool detail / reading
 */
export function PageFrame({
  children,
  width = "wide",
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  width?: "wide" | "content" | "text";
  className?: string;
  as?: "div" | "section" | "article";
}) {
  const max = width === "wide" ? "max-w-[1400px]" : width === "content" ? "max-w-6xl" : "max-w-3xl";

  const classes = ["mx-auto w-full px-6", max, className].filter(Boolean).join(" ");

  return <Tag className={classes}>{children}</Tag>;
}
