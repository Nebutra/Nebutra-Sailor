"use client";

import { ChevronLeft, ChevronRight } from "@nebutra/icons";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

const SQRT_5000 = Math.sqrt(5000);

/**
 * Deliberately empty.
 *
 * This held 15 invented testimonials attributed to invented people ("Alex, CEO
 * at TechCorp"), each illustrated with an Unsplash photograph of a real,
 * unrelated person. Any product built on this package that rendered
 * <StaggerTestimonials /> without props published fabricated endorsements —
 * with strangers' faces attached — as its own social proof.
 *
 * There is no honest generic default for a testimonial. Supply real ones or
 * render nothing.
 */
const defaultTestimonials: StaggerTestimonialItem[] = [];

export type StaggerTestimonialItem = {
  tempId: number;
  testimonial: string;
  by: string;
  imgSrc: string;
};

interface TestimonialCardProps {
  position: number;
  testimonial: StaggerTestimonialItem;
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  position,
  testimonial,
  handleMove,
  cardSize,
}) => {
  const isCenter = position === 0;

  // Clicking a card brings it to the centre — the only way to advance the deck.
  // `handleMove(0)` is a no-op, so the centre card keeps the same click semantics
  // it always had, but it is taken out of the tab order rather than left as a tab
  // stop that does nothing. Enter/Space now work because this is a real <button>
  // (same whole-card-as-button shape as patterns/gallery-card.tsx).
  const activate = () => handleMove(position);

  return (
    <button
      type="button"
      tabIndex={isCenter ? -1 : 0}
      aria-current={isCenter ? "true" : undefined}
      aria-label={`Show testimonial from ${testimonial.by}`}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
      className={cn(
        // `block text-left` restates what a <div> gave for free — a real <button>
        // is inline-block and centres its text. Same rendering, real semantics.
        "absolute left-1/2 top-1/2 block cursor-pointer border-2 p-8 text-left transition-[background-color,border-color,box-shadow,color,transform] duration-500 ease-in-out motion-reduce:transition-colors",
        isCenter
          ? "z-10 bg-primary text-primary-foreground border-primary"
          : "z-0 bg-card text-card-foreground border-border hover:border-primary/50",
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath:
          "polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)",
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter ? "0px 8px 0px 4px hsl(var(--border))" : "0px 0px 0px 0px transparent",
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-border"
        style={{
          right: -2,
          top: 48,
          width: SQRT_5000,
          height: 2,
        }}
      />
      {testimonial.imgSrc ? (
        <Image
          src={testimonial.imgSrc}
          alt={`${testimonial.by.split(",")[0]}`}
          className="mb-4 h-14 w-12 bg-muted object-cover object-top"
          style={{
            boxShadow: "3px 3px 0px hsl(var(--background))",
          }}
          width={400}
          height={400}
        />
      ) : (
        <div
          aria-hidden
          className="mb-4 flex h-14 w-12 items-center justify-center bg-muted text-lg font-medium text-muted-foreground"
          style={{ boxShadow: "3px 3px 0px hsl(var(--background))" }}
        >
          {testimonial.by.charAt(0)}
        </div>
      )}
      <h3
        className={cn(
          "text-base sm:text-xl font-medium",
          isCenter ? "text-primary-foreground" : "text-foreground",
        )}
      >
        "{testimonial.testimonial}"
      </h3>
      <p
        className={cn(
          "absolute bottom-8 left-8 right-8 mt-2 text-sm italic",
          isCenter ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        - {testimonial.by}
      </p>
    </button>
  );
};

export interface StaggerTestimonialsProps {
  items?: StaggerTestimonialItem[] | undefined;
  height?: number | undefined;
  className?: string | undefined;
}

export const StaggerTestimonials: React.FC<StaggerTestimonialsProps> = ({
  items,
  height = 600,
  className,
}) => {
  const [cardSize, setCardSize] = useState(365);
  const [testimonialsList, setTestimonialsList] = useState<StaggerTestimonialItem[]>(
    (items ?? defaultTestimonials).map((t, i) => ({
      ...t,
      tempId: t.tempId ?? i,
    })),
  );

  const handleMove = (steps: number) => {
    const newList = [...testimonialsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setTestimonialsList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 365 : 290);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Sync list when external items change
  useEffect(() => {
    if (items) {
      setTestimonialsList(items.map((t, i) => ({ ...t, tempId: t.tempId ?? i })));
    }
  }, [items]);

  // Nothing to show is a valid state now that there is no fabricated fallback —
  // rendering the carousel chrome around zero cards would just look broken.
  if (testimonialsList.length === 0) return null;

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-muted/30", className)}
      style={{ height }}
    >
      {testimonialsList.map((testimonial, index) => {
        const position =
          testimonialsList.length % 2
            ? index - (testimonialsList.length + 1) / 2
            : index - testimonialsList.length / 2;
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          type="button"
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-colors",
            "bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground",
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-colors",
            "bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground",
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
