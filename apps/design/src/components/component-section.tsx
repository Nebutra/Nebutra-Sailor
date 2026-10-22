/**
 * One numbered section of a component page.
 *
 * Same DOM contract as the token pages' Section — `section[id] > h2` — because
 * the on-this-page rail reads headings out of the rendered article. It is
 * restated here rather than imported so the component pages do not depend on
 * another route group's private folder.
 *
 * The heading stays a direct child of the section, so the rail can read it. The
 * body — note and content — comes in through AnimateIn once it scrolls into
 * view: every section on every page enters the same way, and reduced motion
 * falls back to a fade inside the primitive.
 */

import { AnimateIn } from "@nebutra/ui/components";
import type { ReactNode } from "react";

/** Full-bleed band inside the article column: the hairline runs rail to rail. */
export const BAND = "-mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12";

export function sectionSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ComponentSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  const id = sectionSlug(title);

  return (
    <section className={`${BAND} scroll-mt-20 border-hairline border-t py-12`} id={id}>
      <h2
        className="m-0 text-balance text-2xl text-foreground leading-heading tracking-heading"
        id={`${id}-heading`}
      >
        {title}
      </h2>
      <AnimateIn inView preset="fadeUp">
        {note ? (
          <div className="mt-3 mb-8 max-w-3xl space-y-3 text-base text-neutral-11 [&_p]:m-0">
            {note}
          </div>
        ) : (
          <div className="mb-8" />
        )}
        {children}
      </AnimateIn>
    </section>
  );
}
