import { ArrowRight } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Stat item displayed in the card
 */
export interface Stat {
  icon: React.ReactNode;
  label: string;
}

/**
 * AnimatedHikeCard Props
 *
 * @example
 * ```tsx
 * <AnimatedHikeCard
 *   title="Mountain Hike"
 *   images={["/img1.jpg", "/img2.jpg", "/img3.jpg"]}
 *   stats={[
 *     { icon: <Clock className="h-4 w-4" />, label: "~6 Hours" },
 *     { icon: <Mountain className="h-4 w-4" />, label: "8 km" },
 *   ]}
 *   description="A beautiful mountain hiking experience."
 *   href="/hikes/mountain"
 * />
 * ```
 */
export interface AnimatedHikeCardProps {
  /** Card title */
  title: string;
  /** Array of image URLs (3 recommended for best visual effect) */
  images: string[];
  /** Stats to display (icon + label pairs) */
  stats: Stat[];
  /** Card description text */
  description: string;
  /** Link destination */
  href: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AnimatedHikeCard - Interactive card with stacked images that fan out on hover
 *
 * Use cases:
 * - Activity/experience cards (hiking, tours, adventures)
 * - Product showcases with multiple images
 * - Portfolio items with image galleries
 * - Travel destination cards
 */
export const AnimatedHikeCard = React.forwardRef<HTMLAnchorElement, AnimatedHikeCardProps>(
  ({ title, images, stats, description, href, className }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={cn(
          "group relative block w-full max-w-sm cursor-pointer rounded-[var(--radius-2xl)] border bg-card p-6 text-card-foreground shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg lg:max-w-md",
          className,
        )}
        aria-label={`Learn more about ${title}`}
      >
        <div className="flex flex-col">
          {/* Card Header: Title and Arrow */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tighter">{title}</h2>
            <ArrowRight className="h-6 w-6 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
          </div>

          {/* Stacked Images with Hover Animation */}
          <div className="relative mb-6 h-32">
            {images.map((src, index) => (
              <div
                key={index}
                className={cn(
                  "absolute h-full w-[40%] overflow-hidden rounded-[var(--radius-lg)] border-2 border-background shadow-md transition-all duration-300 ease-in-out",
                  "group-hover:translate-x-[var(--tx)] group-hover:rotate-[var(--r)]",
                )}
                style={
                  {
                    transform: `translateX(${index * 32}px)`,
                    "--tx": `${index * 80}px`,
                    "--r": `${index * 5 - 5}deg`,
                    zIndex: images.length - index,
                  } as React.CSSProperties
                }
              >
                <Image
                  src={src}
                  alt={`${title} view ${index + 1}`}
                  className="h-full w-full object-cover"
                  fill
                />
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="mb-4 flex items-center space-x-4 text-sm text-muted-foreground">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center space-x-1.5">
                {stat.icon}
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </a>
    );
  },
);

AnimatedHikeCard.displayName = "AnimatedHikeCard";
