"use client";

import { useMemo } from "react";
import { StaggerTestimonials } from "../stagger-testimonials";
import type { TestimonialsCommonProps } from "./types";

export function StaggerTestimonialsAdapter({
  items,
  height = 600,
  className,
}: TestimonialsCommonProps & { height?: number | undefined }) {
  const mapped = useMemo(
    () =>
      items.map((x, i) => ({
        tempId: i,
        testimonial: x.quote,
        by:
          x.title || x.company
            ? `${x.author}${x.title ? `, ${x.title}` : ""}${x.company ? ` at ${x.company}` : ""}`
            : x.author,
        // No stock-photo fallback: a real testimonial without an avatar must
        // not borrow an unrelated person's face.
        imgSrc: x.avatarUrl ?? "",
      })),
    [items],
  );

  return <StaggerTestimonials items={mapped} height={height} className={className} />;
}
