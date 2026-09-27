import { Heading } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The site's two composition pieces. Everything visual below them is a design
 * system wheel (Heading, Safari, Grid, GitHubCalendar, AnimatedList …); these
 * only fix the page's rhythm so every page opens and breathes the same way.
 */

/** How every page and major block opens: one heading, one plain lead, the Chinese line. */
export function Intro({
  title,
  lead,
  cn: zh,
  level = 2,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  cn?: string;
  level?: 1 | 2;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <Heading level={level} display>
        {title}
      </Heading>
      {zh ? <p className="mt-4 font-heading text-xl text-secondary-foreground">{zh}</p> : null}
      {lead ? <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{lead}</p> : null}
    </div>
  );
}

/** A band of the page: Linear's rhythm, hairline above, the site gutter. */
export function Band({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("border-t border-border px-8 py-24 xl:px-16", className)}>
      {children}
    </section>
  );
}

/** "See all" at the foot of a teaser block. */
export function More({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-10 inline-flex items-center gap-2 text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground"
    >
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}
