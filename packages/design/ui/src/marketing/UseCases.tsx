/**
 * UseCases - Use Cases / Solutions Section
 *
 * Showcase different use cases, target audiences, or solutions.
 */

"use client";

import { CheckCircle as CheckCircle2, ChevronLeft, ChevronRight } from "@nebutra/icons";
import * as React from "react";
import { AnimatePresence, domAnimation, LazyMotion, m } from "../shared/animation/motion";
import { cn } from "../utils";
import type { UseCase, UseCasesProps } from "./types";

const EMPTY_USE_CASES: UseCase[] = [];

function getBenefitKey(caseId: string, benefit: string) {
  return `${caseId}-${benefit}`;
}

interface UseCaseCardProps {
  item: UseCase;
  className?: string;
}

interface UseCaseTabsNavProps {
  items: UseCase[];
  selectedTab: string;
  onSelect: (id: string) => void;
}

interface UseCaseBenefitsProps {
  item: UseCase;
}

interface UseCaseGridProps {
  items: UseCase[];
}

interface UseCaseCarouselItemsProps {
  items: UseCase[];
}

function getSelectedCaseId(items: UseCase[], activeTab: string) {
  for (const item of items) {
    if (item.id === activeTab) {
      return activeTab;
    }
  }

  return items[0]?.id ?? "";
}

function getActiveCase(items: UseCase[], selectedTab: string) {
  for (const item of items) {
    if (item.id === selectedTab) {
      return item;
    }
  }

  return items[0];
}

function UseCaseCard({ item, className }: UseCaseCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[var(--radius-2xl)] border border-[var(--neutral-4)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-[var(--neutral-2)]",
        className,
      )}
    >
      {item.icon && (
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--brand-3)] text-[var(--brand-11)] ring-1 ring-[var(--brand-5)]">
          <div className="size-5 rounded-full bg-current" />
        </div>
      )}
      <h3 className="mb-2 text-xl font-semibold text-[var(--neutral-12)]">{item.title}</h3>
      <p className="mb-4 text-sm font-medium text-[var(--brand-11)]">{item.audience}</p>
      <p className="mb-6 flex-1 text-base leading-relaxed text-[var(--neutral-11)]">
        {item.description}
      </p>

      {item.benefits && item.benefits.length > 0 && (
        <ul className="mb-6 flex flex-col gap-3">
          {item.benefits.map((benefit) => (
            <li
              key={getBenefitKey(item.id, benefit)}
              className="flex items-start gap-3 text-sm text-[var(--neutral-11)]"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-9)]" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {item.href && (
        <a
          href={item.href}
          className="group mt-auto inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-11)] transition-colors hover:text-[var(--brand-12)]"
        >
          View {item.title} details
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      )}
    </div>
  );
}

function UseCaseTabsNav({ items, selectedTab, onSelect }: UseCaseTabsNavProps) {
  return (
    <>
      {items.map((caseItem) => {
        const isActive = selectedTab === caseItem.id;
        return (
          <button
            type="button"
            key={caseItem.id}
            onClick={() => onSelect(caseItem.id)}
            className={cn(
              "relative flex flex-col items-start px-6 py-4 rounded-[var(--radius-xl)] text-left transition-colors whitespace-nowrap lg:whitespace-normal outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)]",
              isActive
                ? "text-[var(--brand-12)]"
                : "text-[var(--neutral-11)] hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]",
            )}
          >
            {isActive && (
              <m.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-white dark:bg-[var(--neutral-2)] rounded-[var(--radius-xl)] border border-[var(--neutral-4)] shadow-sm -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="font-semibold text-lg">{caseItem.title}</span>
            <span className="text-sm mt-1 opacity-80 hidden lg:block">{caseItem.audience}</span>
          </button>
        );
      })}
    </>
  );
}

function UseCaseBenefits({ item }: UseCaseBenefitsProps) {
  if (!item.benefits || item.benefits.length === 0) {
    return null;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-10">
      {item.benefits.map((benefit) => (
        <div key={getBenefitKey(item.id, benefit)} className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-9)] mt-0.5" />
          <span className="text-[var(--neutral-12)] font-medium leading-snug">{benefit}</span>
        </div>
      ))}
    </div>
  );
}

function UseCaseGrid({ items }: UseCaseGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {items.map((caseItem) => (
        <UseCaseCard key={caseItem.id} item={caseItem} />
      ))}
    </div>
  );
}

function UseCaseCarouselItems({ items }: UseCaseCarouselItemsProps) {
  return (
    <>
      {items.map((caseItem) => (
        <div
          key={caseItem.id}
          className="flex-[0_0_90%] md:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 snap-start"
        >
          <UseCaseCard item={caseItem} />
        </div>
      ))}
    </>
  );
}

export function UseCases(props: UseCasesProps) {
  const {
    locale: _locale = "en",
    layout = "tabs",
    title = "Built for every workflow",
    subtitle = "Discover how Nebutra adapts to your specific engineering and operational requirements.",
    className,
    id,
    density = "normal",
  } = props;
  const caseItems = props.useCases ?? EMPTY_USE_CASES;
  const [activeTab, setActiveTab] = React.useState(() => caseItems[0]?.id ?? "");
  const carouselTrackRef = React.useRef<HTMLDivElement | null>(null);
  const selectedTab = getSelectedCaseId(caseItems, activeTab);
  const activeCase = getActiveCase(caseItems, selectedTab);

  function scrollCarousel(direction: "previous" | "next") {
    const track = carouselTrackRef.current;
    if (!track) {
      return;
    }

    track.scrollBy({
      left: direction === "previous" ? -track.clientWidth : track.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <LazyMotion features={domAnimation}>
      <section
        id={id}
        className={cn(
          "overflow-hidden py-24",
          density === "compact" ? "py-16" : density === "spacious" ? "py-32" : "py-24",
          className,
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            {title && (
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--neutral-12)] mb-4">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-[var(--neutral-11)]">{subtitle}</p>}
          </div>

          {/* Use Cases Layout: Tabs */}
          {layout === "tabs" && activeCase && (
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
              {/* Tab Navigation */}
              <div className="w-full lg:w-1/3 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar shrink-0">
                <UseCaseTabsNav
                  items={caseItems}
                  selectedTab={selectedTab}
                  onSelect={setActiveTab}
                />
              </div>

              {/* Tab Content */}
              <div className="w-full lg:w-2/3 min-h-[400px] relative">
                <AnimatePresence mode="wait">
                  <m.div
                    key={activeCase.id}
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                    transition={{ duration: 0.3 }}
                    className="flex h-full flex-col rounded-[var(--radius-2xl)] border border-[var(--neutral-4)] bg-[var(--neutral-1)] p-8 shadow-md dark:bg-[var(--neutral-2)] sm:p-12"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      {activeCase.icon && (
                        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--brand-9)] text-white shadow-sm ring-4 ring-[var(--brand-3)]">
                          <div className="h-5 w-5 rounded-[var(--radius-sm)] bg-white/80" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-[var(--neutral-12)]">
                          {activeCase.title}
                        </h3>
                        <p className="text-sm font-medium text-[var(--brand-11)]">
                          {activeCase.audience}
                        </p>
                      </div>
                    </div>

                    <p className="text-lg text-[var(--neutral-11)] leading-relaxed mb-8">
                      {activeCase.description}
                    </p>

                    <UseCaseBenefits item={activeCase} />

                    <div className="flex-1" />

                    {activeCase.href && (
                      <div className="pt-6 mt-auto border-t border-[var(--neutral-4)]">
                        <a
                          href={activeCase.href}
                          className="inline-flex items-center justify-center rounded-[var(--radius-lg)] bg-[var(--neutral-12)] px-6 py-3 text-sm font-semibold text-[var(--neutral-1)] shadow-sm hover:bg-[var(--neutral-11)] transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                        >
                          Explore {activeCase.title} solution
                        </a>
                      </div>
                    )}
                  </m.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Use Cases Layout: Grid or Cards */}
          {(layout === "grid" || layout === "cards") && <UseCaseGrid items={caseItems} />}

          {/* Use Cases Layout: Carousel */}
          {layout === "carousel" && (
            <div className="relative group/carousel">
              <div className="overflow-hidden pb-8">
                <div
                  className="flex gap-6 -ml-4 overflow-x-auto scroll-smooth pl-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  ref={carouselTrackRef}
                >
                  <UseCaseCarouselItems items={caseItems} />
                </div>
              </div>

              {/* Carousel Controls */}
              <div className="flex justify-center gap-3 mt-4">
                <button
                  type="button"
                  className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--neutral-5)] bg-white dark:bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:text-[var(--neutral-12)] hover:border-[var(--neutral-7)] transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)]"
                  onClick={() => scrollCarousel("previous")}
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--neutral-5)] bg-white dark:bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:text-[var(--neutral-12)] hover:border-[var(--neutral-7)] transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)]"
                  onClick={() => scrollCarousel("next")}
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </LazyMotion>
  );
}

UseCases.displayName = "UseCases";
