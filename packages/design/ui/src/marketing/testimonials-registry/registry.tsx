"use client";

import { cn } from "../../utils/cn";
import { GridTestimonials } from "./grid-section";
import { Marquee3DTestimonials } from "./marquee3d";
import { StaggerTestimonialsAdapter } from "./stagger.adapter";
import type { TestimonialsCommonProps, TestimonialsVariant } from "./types";

export type TestimonialsRegistryProps = TestimonialsCommonProps & {
  variant?: TestimonialsVariant;
  /** Title for grid variant */
  title?: string;
  /** Description for grid variant */
  description?: string;
  /** Show header for grid variant */
  showHeader?: boolean;
};

export function TestimonialsRegistry({
  variant = "stagger",
  items,
  className,
  height,
  title,
  description,
  showHeader,
}: TestimonialsRegistryProps) {
  switch (variant) {
    case "stagger":
      return <StaggerTestimonialsAdapter items={items} className={cn(className)} height={height} />;
    case "marquee3d":
      return (
        <Marquee3DTestimonials items={items} className={cn(className)} height={height ?? 384} />
      );
    case "grid":
      return (
        <GridTestimonials
          items={items}
          className={cn(className)}
          title={title}
          description={description}
          showHeader={showHeader}
        />
      );
    default:
      return <StaggerTestimonialsAdapter items={items} className={cn(className)} height={height} />;
  }
}
