import { Heading } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { MaskedHeadline } from "@/shared/animation/masked-headline";

/**
 * The site's two composition pieces. Everything visual below them is a design
 * system wheel (Heading, Safari, Grid, GitHubCalendar, AnimatedList …); these
 * only fix the page's rhythm so every page opens and breathes the same way.
 */

/**
 * How every page and major block opens: one heading, one plain lead, the
 * Chinese line. A page's own heading (level 1) is the site's one signature
 * motion: its words rise out of their masks on first paint (MaskedHeadline).
 */
export function Intro({
  title,
  lead,
  cn: zh,
  level = 2,
  lang = "en",
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  cn?: string;
  level?: 1 | 2;
  /** The route locale; it decides how a level-1 heading breaks into words. */
  lang?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <Heading level={level} display>
        {level === 1 ? <MaskedHeadline locale={lang}>{title}</MaskedHeadline> : title}
      </Heading>
      {zh ? <p className="mt-4 font-heading text-xl text-secondary-foreground">{zh}</p> : null}
      {lead ? <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{lead}</p> : null}
    </div>
  );
}

/**
 * A band of the page: hairline above, the site gutter, and one rhythm for every
 * section — 224px between one band's content and the next at desktop widths
 * (112 + 112), 128px on a phone. Anchored bands clear the sticky 64px bar.
 */
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
    <section
      id={id}
      className={cn("scroll-mt-16 border-t border-border px-8 py-16 md:py-28 xl:px-16", className)}
    >
      {children}
    </section>
  );
}

/** "See all" at the foot of a teaser block. */
export function More({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-10 inline-flex min-h-10 items-center gap-2 text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground"
    >
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}
