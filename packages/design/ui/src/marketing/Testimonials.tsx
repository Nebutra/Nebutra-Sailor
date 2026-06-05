"use client";

import { cva } from "class-variance-authority";
import Image from "next/image";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { Testimonial, TestimonialsProps } from "./types";

const EMPTY_TESTIMONIALS: Testimonial[] = [];
const RATING_STARS = [1, 2, 3, 4, 5] as const;

const testimonialsVariants = cva("w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", {
  variants: {
    density: {
      compact: "py-12",
      normal: "py-16 md:py-24",
      spacious: "py-24 md:py-32",
    },
  },
  defaultVariants: {
    density: "normal",
  },
});

const cardVariants = cva(
  "relative flex flex-col p-6 md:p-8 rounded-[var(--radius-3xl)] transition-[background-color,border-color,box-shadow,transform] h-full",
  {
    variants: {
      cardStyle: {
        solid: "bg-[var(--neutral-2)] border border-[var(--neutral-6)] shadow-sm",
        glassmorphism: "bg-white/5 backdrop-blur-md border border-white/10 text-white",
        minimal: "bg-transparent border-none p-0",
      },
    },
    defaultVariants: {
      cardStyle: "solid",
    },
  },
);

interface TestimonialCardProps {
  testimonial: Testimonial;
  cardStyle?: "solid" | "glassmorphism" | "minimal";
  className?: string;
}

function TestimonialCard({ testimonial, cardStyle = "solid", className }: TestimonialCardProps) {
  const rating = testimonial.rating ?? 0;

  return (
    <figure className={cn(cardVariants({ cardStyle }), className)}>
      {rating > 0 && (
        <div className="flex gap-0.5 mb-4 text-[var(--orange-9)]">
          {RATING_STARS.map((star) => (
            <svg
              key={star}
              aria-hidden="true"
              className={cn("w-4 h-4", star <= rating ? "fill-current" : "fill-[var(--neutral-4)]")}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      <blockquote
        className={cn(
          "flex-1 text-base leading-relaxed font-medium",
          cardStyle === "glassmorphism" ? "text-white/90" : "text-[var(--neutral-12)]",
        )}
      >
        "{testimonial.quote}"
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-4">
        {testimonial.author.avatar ? (
          <Image
            src={testimonial.author.avatar}
            alt={testimonial.author.name}
            width={40}
            height={40}
            sizes="40px"
            className="w-10 h-10 rounded-full object-cover bg-[var(--neutral-3)]"
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[var(--neutral-4)] flex items-center justify-center font-semibold text-[var(--neutral-11)] text-xs">
            {testimonial.author.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col text-sm">
          <span
            className={cn(
              "font-semibold",
              cardStyle === "glassmorphism" ? "text-white" : "text-[var(--neutral-12)]",
            )}
          >
            {testimonial.author.name}
          </span>
          <span
            className={cn(
              cardStyle === "glassmorphism" ? "text-white/70" : "text-[var(--neutral-11)]",
            )}
          >
            {testimonial.author.title}, {testimonial.author.company}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}

export function Testimonials({
  locale: _locale = "en",
  testimonials = EMPTY_TESTIMONIALS,
  layout = "carousel",
  autoRotate: _autoRotate = true,
  title,
  subtitle,
  className,
  id,
  density = "normal",
}: TestimonialsProps) {
  return (
    <section id={id} className={cn(testimonialsVariants({ density }), className)}>
      <AnimateIn preset="fadeUp">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center gap-4 text-center">
          {title && (
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--neutral-12)]">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-lg text-[var(--neutral-11)]">{subtitle}</p>}
        </div>
      </AnimateIn>

      <div className="w-full">
        {layout === "carousel" && (
          <AnimateIn preset="fadeUp" delay={0.1}>
            {/* CSS Scroll Snap Native Carousel */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="flex-none w-[85vw] sm:w-[400px] snap-center shrink-0 first:pl-4 sm:first:pl-0 last:pr-4 sm:last:pr-0"
                >
                  <TestimonialCard testimonial={testimonial} />
                </div>
              ))}
            </div>
          </AnimateIn>
        )}

        {layout === "grid" && (
          <AnimateInGroup stagger="normal">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {testimonials.map((testimonial) => (
                <AnimateIn key={testimonial.id} preset="fadeUp">
                  <TestimonialCard testimonial={testimonial} />
                </AnimateIn>
              ))}
            </div>
          </AnimateInGroup>
        )}

        {layout === "masonry" && (
          <AnimateInGroup stagger="normal">
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 lg:gap-8 space-y-6 lg:space-y-8">
              {testimonials.map((testimonial) => (
                <AnimateIn key={testimonial.id} preset="fadeUp" className="break-inside-avoid">
                  <TestimonialCard testimonial={testimonial} />
                </AnimateIn>
              ))}
            </div>
          </AnimateInGroup>
        )}

        {layout === "single" && testimonials[0] && (
          <AnimateIn preset="fadeUp" delay={0.1}>
            <div className="max-w-4xl mx-auto text-center">
              <TestimonialCard
                testimonial={testimonials[0]}
                cardStyle="minimal"
                className="items-center"
              />
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}

Testimonials.displayName = "Testimonials";
