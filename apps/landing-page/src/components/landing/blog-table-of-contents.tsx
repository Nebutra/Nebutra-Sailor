"use client";

import type { BlogTocItem } from "@nebutra/blog";
import { ChevronDown, ListOrdered } from "@nebutra/icons";
import { useCallback, useEffect, useMemo, useState } from "react";

type BlogTableOfContentsLabels = {
  title: string;
  current: string;
  progress: string;
  open: string;
};

type BlogTableOfContentsProps = {
  items: BlogTocItem[];
  labels: BlogTableOfContentsLabels;
  variant?: "mobile" | "desktop" | "both";
};

const ACTIVE_OFFSET = 120;

function getScrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (window.scrollY / max) * 100));
}

function getActiveId(items: BlogTocItem[]): string | null {
  let activeId = items[0]?.id ?? null;

  for (const item of items) {
    const element = document.getElementById(item.id);
    if (!element) continue;
    if (element.getBoundingClientRect().top <= ACTIVE_OFFSET) {
      activeId = item.id;
    } else {
      break;
    }
  }

  return activeId;
}

function TocLink({
  item,
  active,
  onNavigate,
}: {
  item: BlogTocItem;
  active: boolean;
  onNavigate: (id: string) => void;
}) {
  const inset = item.depth === 2 ? "pl-3" : item.depth === 3 ? "pl-6" : "pl-9";

  return (
    <a
      href={`#${item.id}`}
      aria-current={active ? "location" : undefined}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(item.id);
      }}
      className={`group relative block py-1.5 pr-1 text-[13px] leading-5 transition-colors ${inset} ${
        active
          ? "font-semibold text-[var(--neutral-12)]"
          : "text-[var(--neutral-9)] hover:text-[var(--neutral-12)]"
      }`}
    >
      <span
        className={`absolute left-[-1px] top-2 h-4 w-px rounded-full transition-colors ${
          active ? "bg-[var(--blue-9)]" : "bg-transparent group-hover:bg-[var(--neutral-7)]"
        }`}
        aria-hidden
      />
      <span className="line-clamp-2">{item.title}</span>
    </a>
  );
}

export function BlogTableOfContents({ items, labels, variant = "both" }: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [activeId, items],
  );

  useEffect(() => {
    if (items.length === 0) return;

    let raf = 0;
    const update = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        setActiveId(getActiveId(items));
        setProgress(getScrollProgress());
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  const handleNavigate = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY - ACTIVE_OFFSET;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    window.history.replaceState(null, "", `#${id}`);
    setActiveId(id);
    setOpen(false);
  }, []);

  if (items.length < 2) return null;
  const showMobile = variant === "mobile" || variant === "both";
  const showDesktop = variant === "desktop" || variant === "both";

  return (
    <>
      {showMobile && (
        <section className="sticky top-16 z-30 mb-8 rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)]/95 p-3 shadow-sm supports-[backdrop-filter]:bg-[var(--neutral-1)]/80 xl:hidden">
          <button
            type="button"
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-1.5 text-left"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ListOrdered className="size-4 shrink-0 text-[var(--neutral-10)]" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-[var(--neutral-10)]">
                  {labels.title}
                </span>
                <span className="block truncate text-sm font-semibold text-[var(--neutral-12)]">
                  {activeItem?.title ?? labels.open}
                </span>
              </span>
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-[var(--neutral-10)] transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          <div
            aria-label={labels.progress}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress)}
            className="mt-3 h-px overflow-hidden rounded-full bg-[var(--neutral-5)]"
            role="progressbar"
          >
            <div
              className="h-full bg-[var(--blue-9)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          {open && (
            <nav
              aria-label={labels.title}
              className="mt-3 max-h-[60vh] space-y-0.5 overflow-y-auto border-l border-[var(--neutral-6)] pl-4 [scrollbar-width:thin]"
            >
              {items.map((item) => (
                <TocLink
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onNavigate={handleNavigate}
                />
              ))}
            </nav>
          )}
        </section>
      )}

      {showDesktop && (
        <aside className="sticky top-28 hidden self-start xl:block">
          <nav
            aria-label={labels.title}
            className="w-[240px] border-l border-[var(--neutral-6)] pl-4"
          >
            <div className="mb-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-9)]">
                <ListOrdered className="size-3.5" aria-hidden />
                {labels.title}
              </div>
            </div>
            <div
              aria-label={labels.progress}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(progress)}
              className="mb-4 h-px overflow-hidden rounded-full bg-[var(--neutral-5)]"
              role="progressbar"
            >
              <div
                className="h-full bg-[var(--blue-9)] transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="max-h-[calc(100vh-14rem)] space-y-0.5 overflow-y-auto pr-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {items.map((item) => (
                <TocLink
                  key={item.id}
                  item={item}
                  active={item.id === activeId}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </nav>
        </aside>
      )}
    </>
  );
}
