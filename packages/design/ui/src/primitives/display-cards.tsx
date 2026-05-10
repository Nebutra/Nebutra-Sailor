"use client";

import { Sparkles } from "lucide-react";
import type * as React from "react";
import { cn } from "../utils/cn";

export interface DisplayCardProps {
  /** Additional className */
  className?: string;
  /** Icon element */
  icon?: React.ReactNode;
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Date or timestamp */
  date?: string;
  /** Icon color className */
  iconClassName?: string;
  /** Title color className */
  titleClassName?: string;
}

/**
 * DisplayCard - Single skewed card with icon, title, description
 */
function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  titleClassName = "text-blue-500",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-[var(--radius-xl)] border-2 bg-muted/70 backdrop-blur-sm px-4 py-3 transition-all duration-700",
        "after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-background after:to-transparent after:content-['']",
        "hover:border-white/20 hover:bg-muted",
        "[&>*]:flex [&>*]:items-center [&>*]:gap-2",
        className,
      )}
    >
      <div>
        <span className="relative inline-block rounded-full bg-blue-800 p-1">{icon}</span>
        <p className={cn("text-lg font-medium", titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-lg">{description}</p>
      <p className="text-muted-foreground">{date}</p>
    </div>
  );
}

export interface DisplayCardsProps {
  /** Array of card props. Uses default stacked cards if not provided. */
  cards?: DisplayCardProps[];
  /** Additional className for container */
  className?: string;
}

const DEFAULT_CARDS: DisplayCardProps[] = [
  {
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-[var(--radius-xl)] before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    className:
      "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-[var(--radius-xl)] before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
  },
];

/**
 * DisplayCards - Stacked card display with hover effects
 *
 * A decorative component showing multiple cards stacked on top of each other
 * with skew effect. Cards animate on hover revealing content underneath.
 *
 * @example
 * ```tsx
 * <DisplayCards
 *   cards={[
 *     { title: "Featured", description: "Amazing content", date: "Today" },
 *     { title: "Popular", description: "Trending now", date: "Yesterday" },
 *     { title: "New", description: "Latest updates", date: "Just now" },
 *   ]}
 * />
 * ```
 */
export function DisplayCards({ cards, className }: DisplayCardsProps) {
  const displayCards = cards || DEFAULT_CARDS;

  return (
    <div
      className={cn(
        "grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700",
        className,
      )}
    >
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}

DisplayCards.displayName = "DisplayCards";
