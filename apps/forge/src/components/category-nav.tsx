"use client";

import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";

/**
 * Sticky category rail under site header (top-16 = h-16).
 * Labels from message catalog `categories.<id>.label` (global wheel).
 */
export function CategoryNav({ categories }: { categories: readonly string[] }) {
  const t = useTranslations("categories");
  const tNav = useTranslations("nav");

  return (
    <div className="sticky top-16 z-30 -mx-6 border-b border-[var(--neutral-6)] bg-[var(--neutral-1)]/90 px-6 py-3 backdrop-blur-md">
      <nav
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={tNav("categoriesAria")}
      >
        {categories.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--neutral-6)]",
              "bg-[var(--neutral-1)] px-4 text-sm font-medium text-[var(--neutral-11)]",
              "transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]",
            )}
          >
            {t.has(`${id}.label` as never) ? t(`${id}.label` as never) : id}
          </a>
        ))}
      </nav>
    </div>
  );
}
