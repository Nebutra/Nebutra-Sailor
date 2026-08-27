"use client";

import type { Icon as LucideIcon } from "@nebutra/icons";
import * as React from "react";
import { useOnClickOutside } from "usehooks-ts";
import { AnimatePresence, motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils/cn";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

export interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
}

const spanVariants = {
  initial: { opacity: 0, transform: "translateX(-4px)" },
  animate: { opacity: 1, transform: "translateX(0px)" },
  exit: { opacity: 0, transform: "translateX(-4px)" },
};

const transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  onChange,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const activeTransition = shouldReduceMotion ? { duration: 0 } : transition;

  useOnClickOutside(outsideClickRef as React.RefObject<HTMLDivElement>, () => {
    setSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index: number) => {
    setSelected(index);
    onChange?.(index);
  };

  const TabSeparator = () => (
    <div className="mx-1 h-[24px] w-[1.2px] bg-border" role="presentation" aria-hidden="true" />
  );

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[var(--radius-2xl)] border border-border bg-background p-1 shadow-sm",
        className,
      )}
      role="tablist"
      aria-label="Navigation tabs"
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <TabSeparator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isSelected = selected === index;
        const tabClassName = cn(
          "relative rounded-[var(--radius-xl)] py-2 text-sm font-medium transition-colors duration-flow",
          "focus-visible:outline-none",
          isSelected
            ? cn("bg-muted px-4", activeColor)
            : "px-2 text-muted-foreground hover:bg-muted hover:text-foreground",
        );

        const tabContent = (
          // biome-ignore lint/correctness/useJsxKeyInIterable: key is on the parent <button>
          <span className="flex items-center gap-2">
            <Icon size={20} aria-hidden="true" />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={activeTransition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        );

        return isSelected ? (
          <button
            type="button"
            key={tab.title}
            onClick={() => handleSelect(index)}
            role="tab"
            aria-selected="true"
            className={tabClassName}
          >
            {tabContent}
          </button>
        ) : (
          <button
            type="button"
            key={tab.title}
            onClick={() => handleSelect(index)}
            role="tab"
            aria-selected="false"
            className={tabClassName}
          >
            {tabContent}
          </button>
        );
      })}
    </div>
  );
}

export type { Separator, Tab, TabItem };
