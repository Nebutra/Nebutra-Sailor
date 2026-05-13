/**
 * UseCases - Use Cases / Solutions Section
 *
 * Showcase different use cases, target audiences, or solutions.
 */

"use client";

import { CheckCircle as CheckCircle2, ChevronLeft, ChevronRight } from "@nebutra/icons";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { cn } from "../utils";
import type { UseCase, UseCasesProps } from "./types";

export function UseCases({
  locale: _locale = "en",
  layout = "tabs",
  useCases = [],
  title = "Built for every workflow",
  subtitle = "Discover how Nebutra adapts to your specific engineering and operational requirements.",
  className,
  id,
  density = "normal",
}: UseCasesProps) {
  const [activeTab, setActiveTab] = useState(useCases[0]?.id || "");
  const activeUseCase = useCases.find((u) => u.id === activeTab) || useCases[0];

  // Embla Carousel Setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Shared Card component to DRY the grid and carousel
  const UseCaseCard = ({ useCase, className }: { useCase: UseCase; className?: string }) => (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl border border-[var(--neutral-4)] bg-white dark:bg-[var(--neutral-2)] p-6 shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
    >
      {useCase.icon && (
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-lg bg-[var(--brand-3)] text-[var(--brand-11)] ring-1 ring-[var(--brand-5)]">
          {/* We assume useCase.icon is a react node or fallback dot */}
          <div className="size-5 rounded-full bg-current" />
        </div>
      )}
      <h3 className="text-xl font-semibold text-[var(--neutral-12)] mb-2">{useCase.title}</h3>
      <p className="text-sm font-medium text-[var(--brand-11)] mb-4">{useCase.audience}</p>
      <p className="text-[var(--neutral-11)] mb-6 flex-1 text-base leading-relaxed">
        {useCase.description}
      </p>

      {useCase.benefits && useCase.benefits.length > 0 && (
        <ul className="mb-6 space-y-3">
          {useCase.benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[var(--neutral-11)]">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-9)]" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {useCase.href && (
        <a
          href={useCase.href}
          className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-11)] hover:text-[var(--brand-12)] transition-colors group"
        >
          Learn more{" "}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      )}
    </div>
  );

  return (
    <section
      id={id}
      className={cn(
        "py-24 overflow-hidden",
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
        {layout === "tabs" && useCases.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
            {/* Tab Navigation */}
            <div className="w-full lg:w-1/3 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar shrink-0">
              {useCases.map((useCase) => {
                const isActive = activeTab === useCase.id;
                return (
                  <button
                    type="button"
                    key={useCase.id}
                    onClick={() => setActiveTab(useCase.id)}
                    className={cn(
                      "relative flex flex-col items-start px-6 py-4 rounded-xl text-left transition-colors whitespace-nowrap lg:whitespace-normal outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)]",
                      isActive
                        ? "text-[var(--brand-12)]"
                        : "text-[var(--neutral-11)] hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabBackground"
                        className="absolute inset-0 bg-white dark:bg-[var(--neutral-2)] rounded-xl border border-[var(--neutral-4)] shadow-sm -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="font-semibold text-lg">{useCase.title}</span>
                    <span className="text-sm mt-1 opacity-80 hidden lg:block">
                      {useCase.audience}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="w-full lg:w-2/3 min-h-[400px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeUseCase.id}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-[var(--neutral-4)] bg-[var(--neutral-1)] dark:bg-black p-8 sm:p-12 shadow-md flex flex-col h-full"
                >
                  <div className="flex items-center gap-4 mb-6">
                    {activeUseCase.icon && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--brand-9)] text-white shadow-sm ring-4 ring-[var(--brand-3)]">
                        <div className="h-5 w-5 rounded-sm bg-white/80" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold text-[var(--neutral-12)]">
                        {activeUseCase.title}
                      </h3>
                      <p className="text-sm font-medium text-[var(--brand-11)]">
                        {activeUseCase.audience}
                      </p>
                    </div>
                  </div>

                  <p className="text-lg text-[var(--neutral-11)] leading-relaxed mb-8">
                    {activeUseCase.description}
                  </p>

                  {activeUseCase.benefits && activeUseCase.benefits.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-4 mb-10">
                      {activeUseCase.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-9)] mt-0.5" />
                          <span className="text-[var(--neutral-12)] font-medium leading-snug">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1" />

                  {activeUseCase.href && (
                    <div className="pt-6 mt-auto border-t border-[var(--neutral-4)]">
                      <a
                        href={activeUseCase.href}
                        className="inline-flex items-center justify-center rounded-lg bg-[var(--neutral-12)] px-6 py-3 text-sm font-semibold text-[var(--neutral-1)] shadow-sm hover:bg-[var(--neutral-11)] transition-all hover:-translate-y-0.5"
                      >
                        Explore {activeUseCase.title} solution
                      </a>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Use Cases Layout: Grid or Cards */}
        {(layout === "grid" || layout === "cards") && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {useCases.map((useCase) => (
              <UseCaseCard key={useCase.id} useCase={useCase} />
            ))}
          </div>
        )}

        {/* Use Cases Layout: Carousel */}
        {layout === "carousel" && (
          <div className="relative group/carousel">
            <div className="overflow-hidden pb-8" ref={emblaRef}>
              <div className="flex gap-6 -ml-4 pl-4">
                {useCases.map((useCase) => (
                  <div
                    key={useCase.id}
                    className="flex-[0_0_90%] md:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0"
                  >
                    <UseCaseCard useCase={useCase} />
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel Controls */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                type="button"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--neutral-5)] bg-white dark:bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:text-[var(--neutral-12)] hover:border-[var(--neutral-7)] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)]"
                onClick={scrollPrev}
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--neutral-5)] bg-white dark:bg-[var(--neutral-3)] text-[var(--neutral-11)] hover:text-[var(--neutral-12)] hover:border-[var(--neutral-7)] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-9)]"
                onClick={scrollNext}
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

UseCases.displayName = "UseCases";
