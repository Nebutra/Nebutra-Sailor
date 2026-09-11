import type { ReactNode } from "react";

/**
 * The grid every list of work uses: stack on a phone, pair on a tablet, three across on a desktop.
 *
 * It existed twice — once inline in the launcher and once in the projects page, the second without
 * any breakpoints at all. A responsive posture that holds on one surface and not the next is not a
 * posture; it is whichever file the author had open.
 */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
