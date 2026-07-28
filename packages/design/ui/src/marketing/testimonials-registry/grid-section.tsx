"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "../../shared/animation/motion";
import { cn } from "../../utils/cn";
import { GridPattern } from "../grid-pattern";
import type { TestimonialsCommonProps } from "./types";

/**
 * Deliberately empty.
 *
 * This held invented testimonials attributed to invented people ("Sarah Chen,
 * Engineering Lead at CloudScale Inc") illustrated with Unsplash photographs of
 * real, unrelated people — and the section description claimed they were "real
 * stories, real impact". Any brand rendering <GridTestimonials /> without items
 * published that as its own social proof.
 */
const defaultTestimonials: {
  quote: string;
  name: string;
  role: string;
  company: string;
  image: string;
}[] = [];

export interface GridTestimonialsProps extends TestimonialsCommonProps {
  title?: string | undefined;
  description?: string | undefined;
  showHeader?: boolean | undefined;
}

export function GridTestimonials({
  items,
  className,
  title = "What Developers Are Saying",
  description = "What teams say after building on the platform.",
  showHeader = true,
}: GridTestimonialsProps) {
  const shouldReduceMotion = useReducedMotion();
  // No fabricated fallback exists any more, so an empty list means render nothing.
  if (items.length === 0) return null;
  // Map TestimonialItem to internal format, or use defaults
  const testimonials =
    items.length > 0
      ? items.map((item) => ({
          name: item.author,
          role: item.title || "",
          company: item.company || "",
          quote: item.quote,
          image: item.avatarUrl ?? "",
        }))
      : defaultTestimonials;

  return (
    <section className={cn("relative w-full pt-10 pb-20 px-4", className)}>
      {/* Background decorations */}
      <div aria-hidden className="absolute inset-0 isolate z-0 contain-strict pointer-events-none">
        <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsl(var(--foreground)/0.06)_0,hsla(0,0%,55%,0.02)_50%,hsl(var(--foreground)/0.01)_80%)] absolute top-0 left-0 h-[320px] w-[140px] -translate-y-[87.5px] -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--foreground)/0.04)_0,hsl(var(--foreground)/0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[320px] w-[60px] translate-x-[5%] -translate-y-1/2 -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--foreground)/0.04)_0,hsl(var(--foreground)/0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[320px] w-[60px] -translate-y-[87.5px] -rotate-45 rounded-full" />
      </div>

      <div className="mx-auto max-w-[var(--container-content)] space-y-8">
        {showHeader && (
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg">{description}</p>
          </div>
        )}

        <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(({ name, role, company, quote, image }, index) => (
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { filter: "blur(4px)", translateY: -8, opacity: 0 }
              }
              whileInView={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { filter: "blur(0px)", translateY: 0, opacity: 1 }
              }
              viewport={{ once: true }}
              transition={
                shouldReduceMotion ? { duration: 0 } : { delay: 0.1 * index + 0.1, duration: 0.8 }
              }
              key={index}
              className="border-foreground/25 relative grid grid-cols-[auto_1fr] gap-x-3 overflow-hidden border border-dashed p-4"
            >
              {/* Grid pattern overlay */}
              <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
                <div className="from-foreground/5 to-foreground/2 absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
                  <GridPattern
                    width={25}
                    height={25}
                    x={-12}
                    y={4}
                    strokeDasharray="3"
                    className="stroke-foreground/20 absolute inset-0 h-full w-full mix-blend-overlay"
                  />
                </div>
              </div>

              {/* Avatar — omitted rather than substituted. The fallback used to
                  be a stock photograph of an unrelated person. */}
              {image ? (
                <Image
                  alt={name}
                  src={image}
                  className="size-9 rounded-full object-cover"
                  width={400}
                  height={400}
                />
              ) : (
                <div
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground"
                >
                  {name.charAt(0)}
                </div>
              )}

              {/* Content */}
              <div>
                <div className="-mt-0.5 -space-y-0.5">
                  <p className="text-sm md:text-base font-medium">{name}</p>
                  <span className="text-muted-foreground block text-xs font-light tracking-tight">
                    {role}
                    {company && ` at ${company}`}
                  </span>
                </div>
                <blockquote className="mt-3">
                  <p className="text-foreground text-sm font-light tracking-wide">{quote}</p>
                </blockquote>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
