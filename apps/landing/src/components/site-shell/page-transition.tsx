"use client";

import { cn } from "@nebutra/ui/utils";
import { type ReactNode, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * The page moves when the page changes; the frame around it does not.
 *
 * Every sidebar click used to be a hard cut. Now the incoming page rises in
 * (`.site-page-enter` in globals.css, on the motion tokens) while the rail and
 * top navigation hold still, and the rail's selection glides to its new row
 * (SidebarNav) — both on the live DOM, at the same moment.
 *
 * Not a view transition: while one runs, the browser shows snapshots of the
 * page instead of the page, so the rail's glide would play unseen behind them,
 * and a named layer is painted over the rows it passes. An entrance animation
 * on the page itself has neither problem.
 *
 * Only on navigation — the first paint is the page at rest, complete, never
 * waiting on an animation. Reduced motion turns it off in CSS. Both frames (the
 * Nebutra rail and the template's top nav) wrap their page in this.
 */
export function PageTransition({
  children,
  className = "flex-1",
}: {
  children: ReactNode;
  /** The page wrapper's own layout in its frame. */
  className?: string;
}) {
  const pathname = usePathname();
  // Decided while rendering, not in an effect: an effect would let the new page
  // paint once at rest and then restart it from invisible — a flash. The ref
  // only ever flips to true, so re-rendering the same path changes nothing.
  const landedOn = useRef(pathname);
  const moved = useRef(false);
  if (pathname !== landedOn.current) moved.current = true;
  const navigated = moved.current;

  return (
    <div key={pathname} className={cn(className, navigated && "site-page-enter")}>
      {children}
    </div>
  );
}
