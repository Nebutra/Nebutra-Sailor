"use client";

import { cva } from "class-variance-authority";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../primitives/accordion";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { FAQItem, FAQProps } from "./types";

const EMPTY_FAQ_ITEMS: FAQItem[] = [];

const faqVariants = cva("w-full mx-auto", {
  variants: {
    layout: {
      accordion: "max-w-3xl flex flex-col",
      "two-column": "grid md:grid-cols-2 gap-8 max-w-5xl",
      cards: "grid sm:grid-cols-2 gap-6 max-w-5xl",
    },
    density: {
      compact: "mt-8 gap-4",
      normal: "mt-12 gap-8",
      spacious: "mt-16 gap-12",
    },
  },
  defaultVariants: {
    layout: "accordion",
    density: "normal",
  },
});

function getFAQCategories(items: FAQItem[]) {
  const categories: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.category || seen.has(item.category)) {
      continue;
    }

    seen.add(item.category);
    categories.push(item.category);
  }

  return categories;
}

function getFAQItemKey(item: FAQItem) {
  return [item.category ?? "general", item.question, item.answer].join("::");
}

export function FAQ({
  locale: _locale = "en",
  items = EMPTY_FAQ_ITEMS,
  showCategories = false,
  layout = "accordion",
  title,
  subtitle,
  className,
  id,
  density = "normal",
}: FAQProps) {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  const categories = getFAQCategories(items);
  const filteredItems = activeCategory
    ? items.filter((item) => item.category === activeCategory)
    : items;

  return (
    <section id={id} className={cn("py-16 md:py-24", className)} data-density={density}>
      <AnimateIn preset="fadeUp">
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
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
              {filteredItems.map((item) => (
                <AnimateIn key={getFAQItemKey(item)} preset="fadeUp">
                  <AccordionItem value={getFAQItemKey(item)} className="border-[var(--neutral-6)]">
                    <AccordionTrigger className="text-[var(--neutral-12)] hover:text-[var(--neutral-11)] text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[var(--neutral-11)]">
                      <ReactMarkdown className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed">
                        {item.answer}
                      </ReactMarkdown>
                    </AccordionContent>
                  </AccordionItem>
                </AnimateIn>
              ))}
            </Accordion>
          ) : (
            filteredItems.map((item) => (
              <AnimateIn key={getFAQItemKey(item)} preset="fadeUp">
                <div
                  className={cn(
                    "flex h-full flex-col gap-3",
                    layout === "cards"
                      ? "p-6 rounded-[var(--radius-2xl)] bg-[var(--neutral-2)] border border-[var(--neutral-6)] transition-colors hover:border-[var(--neutral-7)]"
                      : "",
                  )}
                >
                  <h3 className="font-semibold text-base text-[var(--neutral-12)]">
                    {item.question}
                  </h3>
                  <ReactMarkdown className="prose prose-neutral dark:prose-invert max-w-none text-sm text-[var(--neutral-11)]">
                    {item.answer}
                  </ReactMarkdown>
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
