"use client";

import { ArrowUpRight } from "@nebutra/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BlogImage } from "./blog-image";

export type NewsRailSlide = {
  id: string;
  href: string;
  title: string;
  category: string | null;
  imageUrl: string;
  imageAlt: string;
  fallbackImageUrl: string;
  fallbackImageAlt: string;
  imageBlurDataURL?: string;
};

const ROTATE_MS = 4500;

/**
 * Sticky auto-rotating cover carousel for the newsroom's right column.
 * Pins while the news table scrolls past (so it "rails" alongside the list),
 * cross-fades through recent article covers, pauses on hover/focus, and stays
 * static under prefers-reduced-motion (dots remain for manual control).
 */
export function NewsRailCarousel({ slides, isZh }: { slides: NewsRailSlide[]; isZh: boolean }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((index) => (index + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused, slides.length]);

  if (slides.length === 0) return null;
  const current = slides[Math.min(active, slides.length - 1)] ?? slides[0];

  return (
    <div
      className="sticky top-24"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <section aria-roledescription="carousel" aria-label={isZh ? "最新动态" : "Latest stories"}>
        <Link
          href={current.href}
          aria-label={current.title}
          className="group relative block aspect-[3/4] overflow-hidden rounded-[var(--radius-xl)] border border-border bg-muted outline-none"
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              aria-hidden={index !== active}
              className="absolute inset-0 [transition-duration:var(--motion-duration-reveal)] [transition-property:opacity] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none"
              style={{ opacity: index === active ? 1 : 0 }}
            >
              <BlogImage
                src={slide.imageUrl}
                alt={slide.imageAlt}
                fallbackSrc={slide.fallbackImageUrl}
                fallbackAlt={slide.fallbackImageAlt}
                blurDataURL={slide.imageBlurDataURL}
                fill
                sizes="288px"
                className="object-cover [transition-duration:var(--motion-duration-flow)] [transition-property:transform] [transition-timing-function:var(--ease-out)] group-hover:scale-[1.02] motion-reduce:transition-none"
              />
            </div>
          ))}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-4">
            {current.category && (
              <p className="text-xs font-medium text-white/80">{current.category}</p>
            )}
            <p className="mt-1 inline-flex items-start gap-1.5 text-sm font-semibold leading-snug text-white">
              <span className="line-clamp-2">{current.title}</span>
              <ArrowUpRight
                className="mt-0.5 size-3.5 shrink-0 [transition-property:transform] [transition-duration:var(--motion-duration-flow)] [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </p>
          </div>
        </Link>

        {slides.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            {slides.map((slide, index) => {
              const isActive = index === active;
              return (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={isZh ? `第 ${index + 1} 张` : `Slide ${index + 1}`}
                  aria-current={isActive}
                  onClick={() => setActive(index)}
                  className={`h-1.5 rounded-full [transition-property:width,background-color] [transition-duration:var(--motion-duration-flow)] [transition-timing-function:var(--ease-out)] motion-reduce:transition-none ${
                    isActive
                      ? "w-5 bg-[hsl(var(--primary))]"
                      : "w-1.5 bg-[hsl(var(--border))] hover:bg-[hsl(var(--muted-foreground))]"
                  }`}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
