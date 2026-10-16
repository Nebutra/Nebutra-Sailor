"use client";

import { Rss } from "@nebutra/icons";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";

/** Header subscribe control: the feeds this instance serves. */
export function SubscribeMenu({
  label,
  slug,
  atom,
  rss,
}: {
  label: string;
  slug: string;
  atom: string;
  rss: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <ul>
          {[
            { href: `/api/v1/pages/${slug}/feed.atom`, text: atom },
            { href: `/api/v1/pages/${slug}/feed.rss`, text: rss },
          ].map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Rss aria-hidden className="size-4 text-muted-foreground" />
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
