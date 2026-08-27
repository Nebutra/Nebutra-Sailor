"use client";

import Image from "next/image";

import type * as React from "react";
import { Badge } from "../primitives/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../primitives/carousel";
import { cn } from "../utils/cn";

export interface CarouselSlide {
  /** Slide content or image URL */
  content?: React.ReactNode;
  /** Alt text for image slides */
  alt?: string;
  /** Image URL if using images */
  image?: string;
}

export interface FeatureCarouselProps {
  /** Badge text */
  badge?: string;
  /** Main headline */
  headline?: string;
  /** Description text */
  description?: string;
  /** Carousel slides */
  slides?: CarouselSlide[];
  /** Number of placeholder slides if no slides provided */
  slideCount?: number;
  /** Additional className */
  className?: string;
}

/**
 * FeatureCarousel - Feature section with text and image carousel
 *
 * Two-column layout with feature description on the left
 * and an image carousel on the right.
 *
 * @example
 * ```tsx
 * <FeatureCarousel
 *   badge="Platform"
 *   headline="This is the start of something new"
 *   description="Managing a small business today is already tough..."
 *   slides={[
 *     { image: "/screenshot1.png", alt: "Screenshot 1" },
 *     { image: "/screenshot2.png", alt: "Screenshot 2" },
 *   ]}
 * />
 * ```
 */
export function FeatureCarousel({
  badge = "Platform",
  headline = "This is the start of something new",
  description = "Managing a small business today is already tough. Avoid further complications by ditching outdated, tedious trade methods. Our goal is to streamline SMB trade, making it easier and faster than ever.",
  slides,
  slideCount = 5,
  className,
}: FeatureCarouselProps) {
  const displaySlides: CarouselSlide[] =
    slides ||
    Array.from({ length: slideCount }).map((_, index) => ({
      content: (
        <span className="text-sm text-muted-foreground">Platform Screenshot {index + 1}</span>
      ),
    }));

  return (
    <div className={cn("w-full py-20 lg:py-40", className)}>
      <div className="container mx-auto">
        <div className="grid grid-cols-1 items-end justify-end gap-10 lg:grid-cols-2">
          {/* Text content */}
          <div className="flex flex-col items-start gap-4">
            <div>
              <Badge>{badge}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-left text-xl font-normal tracking-tighter md:text-3xl lg:max-w-xl lg:text-5xl">
                {headline}
              </h2>
              <p className="max-w-xl text-left text-lg leading-relaxed tracking-tight text-muted-foreground lg:max-w-sm">
                {description}
              </p>
            </div>
          </div>

          {/* Carousel */}
          <div className="w-full max-w-full px-6">
            <Carousel>
              <CarouselContent>
                {displaySlides.map((slide, index) => (
                  <CarouselItem key={index}>
                    <div className="flex aspect-video items-center justify-center rounded-[var(--radius-md)] bg-muted p-6">
                      {slide.image ? (
                        <Image
                          src={slide.image}
                          alt={slide.alt || `Slide ${index + 1}`}
                          className="h-full w-full object-cover rounded-[var(--radius-md)]"
                          fill
                        />
                      ) : (
                        slide.content
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </div>
    </div>
  );
}
