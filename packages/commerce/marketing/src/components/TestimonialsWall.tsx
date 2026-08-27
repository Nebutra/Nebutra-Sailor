"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useMemo } from "react";
import { TESTIMONIAL_SOURCE_ICONS, TESTIMONIAL_SOURCE_NAMES } from "../config";
import type { Testimonial, TestimonialSource, TestimonialsWallProps } from "../types";

// ============================================
// Rating Stars
// ============================================

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg
          aria-hidden="true"
          key={`full-${i}`}
          className="h-4 w-4 text-yellow-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-yellow-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half-star)"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg
          aria-hidden="true"
          key={`empty-${i}`}
          className="h-4 w-4 text-gray-300"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ============================================
// Source Badge
// ============================================

function SourceBadge({ source, sourceUrl }: { source: TestimonialSource; sourceUrl?: string }) {
  const icon = TESTIMONIAL_SOURCE_ICONS[source];
  const name = TESTIMONIAL_SOURCE_NAMES[source];

  const content = (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
      style={{
        backgroundColor: "var(--marketing-canvas-subtle)",
        color: "var(--marketing-fg-muted)",
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{name}</span>
    </span>
  );

  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80"
      >
        {content}
      </a>
    );
  }

  return content;
}

// ============================================
// Testimonial Card
// ============================================

interface TestimonialCardProps {
  testimonial: Testimonial;
  showSourceIcon?: boolean;
  showRating?: boolean;
}

function TestimonialCard({
  testimonial,
  showSourceIcon = true,
  showRating = true,
}: TestimonialCardProps) {
  const {
    authorName,
    authorRole,
    authorCompany,
    authorAvatar,
    content,
    rating,
    source,
    sourceUrl,
    date,
    featured,
  } = testimonial;

  return (
    <div
      className={clsx(
        "flex flex-col rounded-xl p-5 transition-shadow",
        featured && "ring-2 ring-[var(--marketing-accent-emphasis)]/50",
      )}
      style={{
        backgroundColor: "var(--marketing-card-bg)",
        border: "1px solid var(--marketing-card-border)",
        boxShadow: "var(--marketing-card-shadow)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--marketing-card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--marketing-card-shadow)";
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {authorAvatar ? (
            <Image
              src={authorAvatar}
              alt={authorName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background:
                  "linear-gradient(135deg, var(--marketing-accent-fg), var(--marketing-ph-primary))",
                color: "var(--marketing-fg-on-emphasis)",
              }}
            >
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold" style={{ color: "var(--marketing-fg-default)" }}>
              {authorName}
            </p>
            {(authorRole || authorCompany) && (
              <p className="text-sm" style={{ color: "var(--marketing-fg-muted)" }}>
                {authorRole}
                {authorRole && authorCompany && " at "}
                {authorCompany}
              </p>
            )}
          </div>
        </div>

        {showSourceIcon && <SourceBadge source={source} sourceUrl={sourceUrl} />}
      </div>

      {/* Rating */}
      {showRating && rating && (
        <div className="mb-3">
          <RatingStars rating={rating} />
        </div>
      )}

      {/* Content */}
      <blockquote className="flex-1" style={{ color: "var(--marketing-fg-muted)" }}>
        <p className="leading-relaxed">&ldquo;{content}&rdquo;</p>
      </blockquote>

      {/* Footer */}
      {date && (
        <p className="mt-4 text-xs" style={{ color: "var(--marketing-fg-subtle)" }}>
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

// ============================================
// Grid Layout
// ============================================

function TestimonialsGrid({
  testimonials,
  columns = 3,
  showSourceIcons,
  showRatings,
}: {
  testimonials: Testimonial[];
  columns: 1 | 2 | 3 | 4;
  showSourceIcons?: boolean;
  showRatings?: boolean;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={clsx("grid gap-6", gridCols[columns])}>
      {testimonials.map((testimonial) => (
        <TestimonialCard
          key={testimonial.id}
          testimonial={testimonial}
          showSourceIcon={showSourceIcons}
          showRating={showRatings}
        />
      ))}
    </div>
  );
}

// ============================================
// Masonry Layout
// ============================================

function TestimonialsMasonry({
  testimonials,
  columns = 3,
  showSourceIcons,
  showRatings,
}: {
  testimonials: Testimonial[];
  columns: 1 | 2 | 3 | 4;
  showSourceIcons?: boolean;
  showRatings?: boolean;
}) {
  // Distribute testimonials into columns for masonry effect
  const columnedTestimonials = useMemo(() => {
    const cols: Testimonial[][] = Array.from({ length: columns }, () => []);
    testimonials.forEach((t, i) => {
      cols[i % columns].push(t);
    });
    return cols;
  }, [testimonials, columns]);

  const colWidths = {
    1: "w-full",
    2: "w-full md:w-1/2",
    3: "w-full md:w-1/2 lg:w-1/3",
    4: "w-full md:w-1/2 lg:w-1/3 xl:w-1/4",
  };

  return (
    <div className="flex flex-wrap gap-6">
      {columnedTestimonials.map((colTestimonials, colIndex) => (
        <div key={colIndex} className={clsx("flex flex-col gap-6", colWidths[columns])}>
          {colTestimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              showSourceIcon={showSourceIcons}
              showRating={showRatings}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Marquee Layout
// ============================================

function TestimonialsMarquee({
  testimonials,
  showSourceIcons,
  showRatings,
  scrollSpeed = "normal",
}: {
  testimonials: Testimonial[];
  showSourceIcons?: boolean;
  showRatings?: boolean;
  scrollSpeed?: "slow" | "normal" | "fast";
}) {
  const duration = {
    slow: "60s",
    normal: "40s",
    fast: "20s",
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex animate-marquee gap-6"
        style={{
          animationDuration: duration[scrollSpeed],
        }}
      >
        {/* Double the testimonials for seamless loop */}
        {[...testimonials, ...testimonials].map((testimonial, index) => (
          <div key={`${testimonial.id}-${index}`} className="w-80 flex-shrink-0">
            <TestimonialCard
              testimonial={testimonial}
              showSourceIcon={showSourceIcons}
              showRating={showRatings}
            />
          </div>
        ))}
      </div>

      {/* Gradient overlays */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20"
        style={{
          background: "linear-gradient(to right, var(--marketing-canvas-default), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20"
        style={{
          background: "linear-gradient(to left, var(--marketing-canvas-default), transparent)",
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee {
              animation: marquee linear infinite;
            }
          `,
        }}
      />
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function TestimonialsWall({
  testimonials,
  variant = "grid",
  columns = 3,
  showSourceIcons = true,
  showRatings = true,
  autoScroll = true,
  scrollSpeed = "normal",
  maxItems,
  filterSource,
  className,
}: TestimonialsWallProps) {
  // Filter and limit testimonials
  const filteredTestimonials = useMemo(() => {
    let result = testimonials;

    // Filter by source
    if (filterSource && filterSource.length > 0) {
      result = result.filter((t) => filterSource.includes(t.source));
    }

    // Limit items
    if (maxItems && maxItems > 0) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [testimonials, filterSource, maxItems]);

  if (filteredTestimonials.length === 0) {
    return null;
  }

  return (
    <div className={clsx("testimonials-wall", className)}>
      {variant === "grid" && (
        <TestimonialsGrid
          testimonials={filteredTestimonials}
          columns={columns}
          showSourceIcons={showSourceIcons}
          showRatings={showRatings}
        />
      )}

      {variant === "masonry" && (
        <TestimonialsMasonry
          testimonials={filteredTestimonials}
          columns={columns}
          showSourceIcons={showSourceIcons}
          showRatings={showRatings}
        />
      )}

      {variant === "marquee" && (
        <TestimonialsMarquee
          testimonials={filteredTestimonials}
          showSourceIcons={showSourceIcons}
          showRatings={showRatings}
          scrollSpeed={autoScroll ? scrollSpeed : "slow"}
        />
      )}

      {variant === "carousel" && (
        // For carousel, fall back to grid for now (can be enhanced with Swiper/Embla)
        <TestimonialsGrid
          testimonials={filteredTestimonials}
          columns={columns}
          showSourceIcons={showSourceIcons}
          showRatings={showRatings}
        />
      )}
    </div>
  );
}

// Export sub-components
export { RatingStars, SourceBadge, TestimonialCard };

export default TestimonialsWall;
