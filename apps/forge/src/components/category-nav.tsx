"use client";

import { Badge } from "@nebutra/ui/primitives";
import { categoryMeta } from "@/lib/category-meta";

export function CategoryNav({ categories }: { categories: readonly string[] }) {
  return (
    <div className="sticky top-[3.75rem] z-30 -mx-1 overflow-x-auto px-1 py-2 backdrop-blur-sm">
      <div className="flex min-w-max gap-2">
        {categories.map((id) => {
          const meta = categoryMeta(id);
          return (
            <a key={id} href={`#${id}`} className="inline-flex">
              <Badge
                variant="outline"
                className="cursor-pointer px-3 py-1 text-xs font-medium hover:bg-accent"
              >
                {meta.label}
              </Badge>
            </a>
          );
        })}
      </div>
    </div>
  );
}
