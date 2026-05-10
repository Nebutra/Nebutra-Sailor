"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { useOnClickOutside } from "usehooks-ts";
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

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring" as const, bounce: 0, duration: 0.6 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  onChange,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null);

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
          "relative rounded-[var(--radius-xl)] py-2 text-sm font-medium transition-colors duration-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isSelected
            ? cn("bg-muted", activeColor)
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        );

        const tabContent = (
          // biome-ignore lint/correctness/useJsxKeyInIterable: key is on the parent <button>
          <motion.span
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            transition={transition}
            className="flex items-center"
          >
            <Icon size={20} aria-hidden="true" />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
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
