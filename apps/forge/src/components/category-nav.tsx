"use client";

import { cn } from "@nebutra/ui/utils";
import { categoryMeta } from "@/lib/category-meta";

/**
 * Sticky category rail under site header (top-16 = h-16).
 * Chips: h-9 + px-4 — not Badge (compact corner labels).
 */
export function CategoryNav({ categories }: { categories: readonly string[] }) {
  return (
    <div className="sticky top-16 z-30 -mx-6 border-b border-[var(--neutral-6)] bg-[var(--neutral-1)]/90 px-6 py-3 backdrop-blur-md">
      <nav
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="工具分类"
      >
        {categories.map((id) => {
          const meta = categoryMeta(id);
          return (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--neutral-6)]",
                "bg-[var(--neutral-1)] px-4 text-sm font-medium text-[var(--neutral-11)]",
                "transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]",
              )}
            >
              {meta.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
