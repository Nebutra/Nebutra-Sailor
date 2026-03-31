"use client";

import { cva } from "class-variance-authority";
import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../primitives/accordion";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { FAQProps } from "./types";

const faqVariants = cva("w-full mx-auto", {
  variants: {
    layout: {
      accordion: "max-w-3xl",
      "two-column": "grid md:grid-cols-2 gap-8 max-w-5xl",
      cards: "grid sm:grid-cols-2 gap-6 max-w-5xl",
    },
    density: {
      compact: "mt-8 space-y-4",
      normal: "mt-12 space-y-8",
      spacious: "mt-16 space-y-12",
    },
  },
  defaultVariants: {
    layout: "accordion",
    density: "normal",
  },
});

export function FAQ({
  locale: _locale = "en",
  items = [],
  showCategories = false,
  layout = "accordion",
  title,
  subtitle,
  className,
  id,
  density = "normal",
}: FAQProps) {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const cats = new Set(items.map((item) => item.category).filter(Boolean) as string[]);
    return Array.from(cats);
  }, [items]);

  const filteredItems = React.useMemo(() => {
    if (!activeCategory) return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  return (
    <section id={id} className={cn("py-16 md:py-24", className)} data-density={density}>
      <AnimateIn preset="fadeUp">
        <div className="flex flex-col items-center text-center space-y-4 mb-10">
          {title && (
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--neutral-12)]">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-lg text-[var(--neutral-11)] max-w-2xl">{subtitle}</p>}
        </div>
      </AnimateIn>

      {showCategories && categories.length > 0 && (
        <AnimateIn preset="fadeUp" delay={0.1}>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-7)]",
                activeCategory === null
                  ? "bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                  : "bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)] hover:text-[var(--neutral-12)]",
              )}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-7)]",
                  activeCategory === category
                    ? "bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                    : "bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:bg-[var(--neutral-4)] hover:text-[var(--neutral-12)]",
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </AnimateIn>
      )}

      <AnimateInGroup stagger="normal">
        <div className={cn(faqVariants({ layout, density }))}>
          {layout === "accordion" ? (
            <Accordion>
              {filteredItems.map((item, index) => (
                <AnimateIn key={index} preset="fadeUp">
                  <AccordionItem value={`item-${index}`} className="border-[var(--neutral-6)]">
                    <AccordionTrigger className="text-[var(--neutral-12)] hover:text-[var(--neutral-11)] text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[var(--neutral-11)]">
                      <div
                        className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </AnimateIn>
              ))}
            </Accordion>
          ) : (
            filteredItems.map((item, index) => (
              <AnimateIn key={index} preset="fadeUp">
                <div
                  className={cn(
                    "flex flex-col space-y-3 h-full",
                    layout === "cards"
                      ? "p-6 rounded-2xl bg-[var(--neutral-2)] border border-[var(--neutral-6)] transition-colors hover:border-[var(--neutral-7)]"
                      : "",
                  )}
                >
                  <h3 className="font-semibold text-base text-[var(--neutral-12)]">
                    {item.question}
                  </h3>
                  <div
                    className="prose prose-neutral dark:prose-invert max-w-none text-sm text-[var(--neutral-11)]"
                    dangerouslySetInnerHTML={{ __html: item.answer }}
                  />
                </div>
              </AnimateIn>
            ))
          )}
        </div>
      </AnimateInGroup>
    </section>
  );
}

FAQ.displayName = "FAQ";
