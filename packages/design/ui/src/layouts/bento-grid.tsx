"use client";

import type * as React from "react";
import { cn } from "../utils/cn";

export interface BentoItem {
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Icon element to display */
  icon: React.ReactNode;
  /** Status badge text */
  status?: string;
  /** Array of tag strings */
  tags?: string[];
  /** Meta information (version, count, etc.) */
  meta?: string;
  /** Call-to-action text */
  cta?: string;
  /** Column span (1 or 2) */
  colSpan?: 1 | 2;
  /** Whether to show hover state persistently */
  hasPersistentHover?: boolean;
}

export interface BentoGridProps {
  /** Array of bento items to display */
  items: BentoItem[];
  /** Additional className */
  className?: string;
}

/**
 * BentoGrid - Feature showcase grid layout
 *
 * A responsive grid layout for displaying feature cards with icons,
 * descriptions, tags, and status badges. Supports variable column spans.
 *
 * @example
 * ```tsx
 * <BentoGrid
 *   items={[
 *     {
 *       title: "Analytics",
 *       description: "Real-time metrics",
 *       icon: <TrendingUp className="w-4 h-4" />,
 *       status: "Live",
 *       tags: ["Stats", "AI"],
 *       colSpan: 2,
 *     },
 *     // ...
 *   ]}
 * />
 * ```
 */
export function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-3 p-4 max-w-7xl mx-auto", className)}>
      {items.map((item, index) => (
        <BentoCard key={index} item={item} />
      ))}
    </div>
  );
}

BentoGrid.displayName = "BentoGrid";

interface BentoCardProps {
  item: BentoItem;
}

function BentoCard({ item }: BentoCardProps) {
  return (
    <div
      className={cn(
        "group relative p-4 rounded-[var(--radius-xl)] overflow-hidden transition-all duration-300",
        "border border-[var(--neutral-6)] dark:border-white/10 bg-white dark:bg-black",
        "hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_2px_12px_rgba(255,255,255,0.03)]",
        "hover:-translate-y-0.5 will-change-transform",
        item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
        item.hasPersistentHover && [
          "shadow-[0_2px_12px_rgba(0,0,0,0.03)] -translate-y-0.5",
          "dark:shadow-[0_2px_12px_rgba(255,255,255,0.03)]",
        ],
      )}
    >
      {/* Background pattern */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
      </div>

      <div className="relative flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-[var(--radius-lg)] flex items-center justify-center bg-black/5 dark:bg-white/10 group-hover:bg-gradient-to-br transition-all duration-300">
            {item.icon}
          </div>
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-[var(--radius-lg)] backdrop-blur-sm",
              "bg-black/5 dark:bg-white/10 text-[var(--neutral-10)]",
              "transition-colors duration-300 group-hover:bg-black/10 dark:group-hover:bg-white/20",
            )}
          >
            {item.status || "Active"}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="font-medium text-[var(--neutral-12)] tracking-tight text-[15px]">
            {item.title}
            {item.meta && (
              <span className="ml-2 text-xs text-[var(--neutral-9)] font-normal">{item.meta}</span>
            )}
          </h3>
          <p className="text-sm text-[var(--neutral-10)] leading-snug font-[425]">
            {item.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2 text-xs text-[var(--neutral-9)]">
            {item.tags?.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-[var(--radius-md)] bg-black/5 dark:bg-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/20"
              >
                #{tag}
              </span>
            ))}
          </div>
          <span className="text-xs text-[var(--neutral-9)] opacity-0 group-hover:opacity-100 transition-opacity">
            {item.cta || "Explore →"}
          </span>
        </div>
      </div>

      {/* Border gradient */}
      <div
        className={cn(
          "absolute inset-0 -z-10 rounded-[var(--radius-xl)] p-px bg-gradient-to-br from-transparent via-gray-100/50 to-transparent dark:via-white/10 transition-opacity duration-300",
          item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      />
    </div>
  );
}
