"use client";

import { FilterPills } from "@nebutra/ui/primitives";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { EssayCardData } from "./essay-feature";

/**
 * FLIP the cards a filter keeps: each slides from where it was to where it now
 * sits, so the reader sees which essays stayed and where they went instead of a
 * hard re-shuffle. WAAPI on transform only (Medium, the landing ease); cards a
 * filter adds simply appear. Reduced motion: the grid just changes.
 */
function useFlip(key: string) {
  const grid = useRef<HTMLDivElement>(null);
  const before = useRef(new Map<string, { x: number; y: number }>());
  // Page coordinates, so scrolling between two filters is not read as movement.
  const at = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY };
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: the filter is the trigger.
  useLayoutEffect(() => {
    const node = grid.current;
    if (!node) return;
    const cards = Array.from(node.querySelectorAll<HTMLElement>("[data-flip]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      for (const card of cards) {
        const was = before.current.get(card.dataset.flip ?? "");
        if (!was) continue;
        const now = at(card);
        const dx = was.x - now.x;
        const dy = was.y - now.y;
        if (!dx && !dy) continue;
        card.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
          { duration: 400, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
    }
    before.current = new Map(cards.map((c) => [c.dataset.flip ?? "", at(c)]));
  }, [key]);
  return grid;
}

/** The Journal as a grid of covers, optionally filterable by the essays' own tags. */
export function EssayGrid({ posts, filter = false }: { posts: EssayCardData[]; filter?: boolean }) {
  const tags = [...new Set(posts.flatMap((p) => p.tags))].slice(0, 8);
  const [tag, setTag] = useState("all");
  const shown = posts.filter((p) => tag === "all" || p.tags.includes(tag));
  const grid = useFlip(tag);

  return (
    <div>
      {filter && tags.length > 1 ? (
        <FilterPills
          variant="subtle"
          value={tag}
          onValueChange={setTag}
          options={[{ value: "all", label: "All" }, ...tags.map((t) => ({ value: t, label: t }))]}
          className="mb-10"
        />
      ) : null}
      <div ref={grid} className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} data-flip={p.slug} className="group block">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-muted">
              <Image
                src={p.cover.src}
                alt={p.cover.alt}
                fill
                sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                className="object-cover motion-safe:transition-transform motion-safe:duration-reveal motion-safe:ease-brand group-hover:scale-[1.02]"
              />
            </div>
            <p className="mt-4 text-sm tabular-nums text-muted-foreground">{p.date}</p>
            <p className="mt-2 font-heading text-xl font-medium text-foreground text-balance">
              {p.title}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
