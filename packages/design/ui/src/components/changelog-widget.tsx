"use client";

import { Bell, ChevronRight } from "@nebutra/icons";
import * as React from "react";
import { useEffectEvent } from "react";
import { cn } from "../utils";

export interface ChangelogEntry {
  version: string;
  title: string;
  date: string;
  tag?: string;
  tagColor?: string;
  excerpt: string;
  url: string;
}

export interface ChangelogWidgetProps {
  entries: ChangelogEntry[];
  changelogUrl?: string;
  className?: string;
}

const TAG_COLOR_MAP: Record<string, string> = {
  feature: "bg-[var(--cyan-9)] text-white",
  fix: "bg-[var(--status-success)] text-white",
  breaking: "bg-[var(--status-danger)] text-white",
  improvement: "bg-[var(--status-warning)] text-white",
  security: "bg-[var(--status-danger)] text-white",
  experimental: "bg-[var(--neutral-8)] text-[var(--neutral-12)]",
};

const getTagColor = (tag?: string) => {
  if (!tag) return "bg-[var(--neutral-7)] text-[var(--neutral-12)]";
  return TAG_COLOR_MAP[tag.toLowerCase()] || TAG_COLOR_MAP.feature;
};

const getUnreadCount = (entries: ChangelogEntry[], lastSeenVersion: string | null) => {
  if (!lastSeenVersion) return entries.length;
  const lastSeenIndex = entries.findIndex((entry) => entry.version === lastSeenVersion);
  return lastSeenIndex === -1 ? entries.length : lastSeenIndex;
};

export function ChangelogWidget({
  entries,
  changelogUrl = "/changelog",
  className,
}: ChangelogWidgetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [lastSeenVersion, setLastSeenVersion] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = getUnreadCount(entries, lastSeenVersion);
  const recentEntries = entries.slice(0, 5);
  const latestVersion = recentEntries[0]?.version ?? null;

  const closeAndMarkSeen = () => {
    setIsOpen(false);
    if (latestVersion) setLastSeenVersion(latestVersion);
  };

  const closeFromDocumentEvent = useEffectEvent(() => {
    closeAndMarkSeen();
  });

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFromDocumentEvent();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeFromDocumentEvent();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        aria-label="View changelog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative inline-flex items-center justify-center rounded-[var(--radius-lg)] p-2 transition-colors hover:bg-[var(--neutral-3)]"
      >
        <Bell className="h-5 w-5 text-[var(--neutral-11)]" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-danger)] text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)] bg-white shadow-lg transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-200">
          <div className="bg-gradient-to-r from-[var(--blue-3)] to-[var(--cyan-3)] px-4 py-3">
            <h3 className="font-semibold text-[var(--neutral-12)]">What's New</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recentEntries.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--neutral-11)]">
                No updates available
              </div>
            ) : (
              recentEntries.map((entry) => (
                <a
                  key={entry.version}
                  href={entry.url}
                  className="block border-b border-[var(--neutral-6)] px-4 py-3 transition-colors hover:bg-[var(--neutral-2)]"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--blue-9)]">
                        v{entry.version}
                      </span>
                      {entry.tag && (
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-medium",
                            getTagColor(entry.tag),
                          )}
                        >
                          {entry.tag}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mb-1 text-sm font-medium text-[var(--neutral-12)]">{entry.title}</p>
                  <p className="mb-2 line-clamp-2 text-xs text-[var(--neutral-11)]">
                    {entry.excerpt}
                  </p>
                  <span className="text-xs text-[var(--neutral-10)]">{entry.date}</span>
                </a>
              ))
            )}
          </div>

          <a
            href={changelogUrl}
            onClick={closeAndMarkSeen}
            className="flex items-center justify-between border-t border-[var(--neutral-6)] bg-[var(--neutral-1)] px-4 py-3 text-sm font-medium text-[var(--blue-9)] transition-colors hover:bg-[var(--neutral-2)]"
          >
            <span>View all updates</span>
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
