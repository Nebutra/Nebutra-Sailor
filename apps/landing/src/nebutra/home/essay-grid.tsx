"use client";

import { FilterPills } from "@nebutra/ui/primitives";
import Image from "next/image";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { EssayCardData } from "./essay-feature";

/** The Journal as a grid of covers, optionally filterable by the essays' own tags. */
export function EssayGrid({ posts, filter = false }: { posts: EssayCardData[]; filter?: boolean }) {
  const tags = [...new Set(posts.flatMap((p) => p.tags))].slice(0, 8);
  const [tag, setTag] = useState("all");
  const shown = posts.filter((p) => tag === "all" || p.tags.includes(tag));

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
      <div className="grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="group block">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-muted">
              <Image
                src={p.cover.src}
                alt={p.cover.alt}
                fill
                sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                className="object-cover transition-transform duration-cinematic ease-brand group-hover:scale-[1.02]"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{p.date}</p>
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
