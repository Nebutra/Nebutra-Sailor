"use client";

/**
 * On-this-page, read out of the rendered article.
 *
 * The colour page is sixteen screens tall and had no way through it but the
 * scrollbar. A table of contents is the obvious fix, and the obvious way to
 * build it — pass each page's sections in as data — is the wrong one: it puts
 * the list and the headings in two places, and they drift the first time
 * somebody renames a section without remembering there is a second copy.
 *
 * So it reads the DOM. Every `Section` gives its heading an id derived from its
 * own title, this finds them after mount, and a page with fewer than two
 * sections renders no rail at all rather than a list of one.
 */

import { cn } from "@nebutra/ui/utils";
import { usePathname } from "next/navigation";
import * as React from "react";

interface Heading {
  id: string;
  text: string;
}

export function PageToc() {
  const pathname = usePathname();
  const [headings, setHeadings] = React.useState<Heading[]>([]);
  const [active, setActive] = React.useState<string>("");

  // Keyed on pathname: the app router keeps this mounted across routes, so a
  // one-shot read on mount would leave the previous page's sections in the rail.
  React.useEffect(() => {
    const found = [...document.querySelectorAll<HTMLElement>("main section[id] > h2")].map(
      (node) => ({
        id: node.parentElement?.id ?? "",
        text: node.textContent?.trim() ?? "",
      }),
    );
    const usable = found.filter((heading) => heading.id && heading.text);
    setHeadings(usable);
    setActive(usable[0]?.id ?? "");
  }, [pathname]);

  React.useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      // Top-weighted: a section counts as current once its heading is near the
      // top of the viewport, not when its tail happens to still be on screen.
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const heading of headings) {
      const node = document.getElementById(heading.id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="On this page"
      className="sticky top-16 hidden max-h-[calc(100vh-5rem)] flex-col overflow-y-auto pb-16 xl:flex"
    >
      <span className="px-2 pb-2 font-medium text-[11px] text-foreground uppercase tracking-wider">
        On this page
      </span>
      {headings.map((heading) => (
        <a
          className={cn(
            "rounded-[var(--radius-sm)] px-2 py-[5px] text-[13px] no-underline transition-colors duration-micro",
            active === heading.id
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          href={`#${heading.id}`}
          key={heading.id}
        >
          {heading.text}
        </a>
      ))}
    </nav>
  );
}
