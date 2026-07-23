"use client";

import { cn } from "@nebutra/ui/utils";
import { categoryMeta } from "@/lib/category-meta";

/**
 * Category jump chips — not Badge (Badge md = h-6 px-2.5, text hugs border).
 * Comfortable hit target + horizontal padding for Chinese labels.
 */
export function CategoryNav({ categories }: { categories: readonly string[] }) {
  return (
    <div className="sticky top-16 z-30 -mx-1 overflow-x-auto px-1 py-2 backdrop-blur-sm">
      <nav className="flex min-w-max gap-2" aria-label="工具分类">
        {categories.map((id) => {
          const meta = categoryMeta(id);
          return (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                "inline-flex h-9 items-center rounded-full border border-border",
                "bg-background px-4 text-sm font-medium text-muted-foreground",
                "transition-colors hover:border-border hover:bg-muted hover:text-foreground",
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
