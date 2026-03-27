"use client";

import { DiceBearAvatar } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useState } from "react";

export interface TestimonialItem {
  id: number;
  quote: string;
  author: string;
  role: string;
  seed: string;
}

interface UniqueTestimonialsProps {
  testimonials: TestimonialItem[];
}

export function UniqueTestimonial({ testimonials }: UniqueTestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedQuote, setDisplayedQuote] = useState(testimonials[0].quote);
  const [displayedRole, setDisplayedRole] = useState(testimonials[0].role);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    if (index === activeIndex || isAnimating) return;
    setIsAnimating(true);

    setTimeout(() => {
      setDisplayedQuote(testimonials[index].quote);
      setDisplayedRole(testimonials[index].role);
      setActiveIndex(index);
      setTimeout(() => setIsAnimating(false), 400);
    }, 200);
  };

  return (
    <div className="flex w-full flex-col items-center gap-10 py-16 text-foreground">
      {/* Quote Container */}
      <div className="relative px-8">
        <span className="absolute -left-2 -top-6 text-7xl font-serif text-foreground/[0.06] select-none pointer-events-none">
          "
        </span>

        <p
          className={cn(
            "text-2xl md:text-3xl font-light text-center max-w-2xl leading-relaxed transition-all duration-400 ease-out italic",
            isAnimating ? "opacity-0 blur-sm scale-[0.98]" : "opacity-100 blur-0 scale-100",
          )}
        >
          {displayedQuote}
        </p>

        <span className="absolute -right-2 -bottom-8 text-7xl font-serif text-foreground/[0.06] select-none pointer-events-none">
          "
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 mt-2">
        {/* Role text */}
        <p
          className={cn(
            "text-xs text-muted-foreground tracking-[0.2em] uppercase transition-all duration-500 ease-out",
            isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
          )}
        >
          {displayedRole}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {testimonials.map((testimonial, index) => {
            const isActive = activeIndex === index;
            const isHovered = hoveredIndex === index && !isActive;
            const showName = isActive || isHovered;

            return (
              <button
                key={testimonial.id}
                onClick={() => handleSelect(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "relative flex items-center gap-0 rounded-full cursor-pointer",
                  "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border border-transparent",
                  isActive
                    ? "bg-foreground shadow-lg border-foreground/10"
                    : "bg-transparent hover:bg-muted/80 border-border/10",
                  showName ? "pr-4 pl-2 py-2" : "p-1",
                )}
              >
                {/* Avatar with smooth ring animation */}
                <div className="relative flex-shrink-0 flex items-center justify-center">
                  <DiceBearAvatar
                    seed={testimonial.seed}
                    avatarStyle="notionists-neutral"
                    size="sm"
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-full",
                      "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] bg-background/50",
                      isActive ? "ring-2 ring-background/30" : "ring-0",
                      !isActive && "hover:scale-105",
                    )}
                  />
                </div>

                <div
                  className={cn(
                    "grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    showName
                      ? "grid-cols-[1fr] opacity-100 ml-3"
                      : "grid-cols-[0fr] opacity-0 ml-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <span
                      className={cn(
                        "text-sm font-bold whitespace-nowrap block",
                        "transition-colors duration-300",
                        isActive ? "text-background" : "text-foreground",
                      )}
                    >
                      {testimonial.author}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
