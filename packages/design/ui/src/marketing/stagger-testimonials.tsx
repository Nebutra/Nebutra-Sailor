"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

const SQRT_5000 = Math.sqrt(5000);

// Repo-specific mock data for Nebutra-Sailor
const defaultTestimonials = [
  {
    tempId: 0,
    testimonial: "We ship 5x faster with Nebutra Sailor's monorepo and Turborepo pipelines.",
    by: "Alex, CEO at TechCorp",
    imgSrc:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 1,
    testimonial: "Multi-tenant auth with Clerk Orgs + Supabase RLS worked out of the box.",
    by: "Dan, CTO at SecureNet",
    imgSrc:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 2,
    testimonial: "Design system with Primer tokens keeps all our apps perfectly consistent.",
    by: "Stephanie, COO at InnovateCo",
    imgSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 3,
    testimonial: "Inngest workflows replaced our cron zoo—deploys are finally predictable.",
    by: "Marie, CFO at FuturePlanning",
    imgSrc:
      "https://images.unsplash.com/photo-1546527868-ccb7ee7dfa6a?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 4,
    testimonial: "Stripe billing integration took days, not weeks.",
    by: "Andre, Head of Design at CreativeSolutions",
    imgSrc:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 5,
    testimonial: "Rate limiting + cache packages saved us months of infra work.",
    by: "Jeremy, Product Manager at TimeWise",
    imgSrc:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 6,
    testimonial: "Vercel AI SDK + our Python AI service made building AI-native features trivial.",
    by: "Pam, Marketing Director at BrandBuilders",
    imgSrc:
      "https://images.unsplash.com/photo-1541753866388-0b3c701627d3?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 7,
    testimonial: "Observability with Sentry + OpenTelemetry is wired from day one.",
    by: "Daniel, Data Scientist at AnalyticsPro",
    imgSrc:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 8,
    testimonial: "shadcn structure made our marketing pages fly.",
    by: "Fernando, UX Designer at UserFirst",
    imgSrc:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=60",
  },
  {
    tempId: 9,
    testimonial: "We migrated 5 years ago and never looked back.",
    by: "Andy, DevOps Engineer at CloudMasters",
    imgSrc:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=60",
  },
];

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

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out",
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
    </div>
  );
};

export interface StaggerTestimonialsProps {
  items?: StaggerTestimonialItem[];
  height?: number;
  className?: string;
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
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
