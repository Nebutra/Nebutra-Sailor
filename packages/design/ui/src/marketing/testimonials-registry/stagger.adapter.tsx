"use client";

import { useMemo } from "react";
import { StaggerTestimonials } from "../stagger-testimonials";
import type { TestimonialsCommonProps } from "./types";

export function StaggerTestimonialsAdapter({
  items,
  height = 600,
  className,
}: TestimonialsCommonProps & { height?: number }) {
  const mapped = useMemo(
    () =>
      items.map((x, i) => ({
        tempId: i,
        testimonial: x.quote,
        by:
          x.title || x.company
            ? `${x.author}${x.title ? `, ${x.title}` : ""}${x.company ? ` at ${x.company}` : ""}`
            : x.author,
        imgSrc:
          x.avatarUrl ??
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=60",
      })),
    [items],
  );

  return <StaggerTestimonials items={mapped} height={height} className={className} />;
}
