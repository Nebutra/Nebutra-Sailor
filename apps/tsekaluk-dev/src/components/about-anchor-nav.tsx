"use client";

import { cn } from "@nebutra/ui/utils";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
}

export function AboutAnchorNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(section.id);
        },
        { rootMargin: "-15% 0px -70% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      for (const o of observers) o.disconnect();
    };
  }, [sections]);

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-16 z-20 mb-16 -mx-8 px-8 py-3 bg-background/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/50"
    >
      <ul className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              className={cn(
                "text-[10px] font-mono tracking-widest uppercase transition-colors duration-200",
                active === section.id
                  ? "text-[var(--color-accent)]"
                  : "text-gray-400 hover:text-foreground",
              )}
            >
              {section.label.replace(/^\/\s*/, "")}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
