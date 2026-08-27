"use client";

import { Bell, ChevronRight } from "@nebutra/icons";
import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover";
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
  feature: "bg-[hsl(var(--primary))] text-white",
  fix: "bg-[var(--status-success)] text-white",
  breaking: "bg-[var(--status-danger)] text-white",
  improvement: "bg-[var(--status-warning)] text-white",
  security: "bg-[var(--status-danger)] text-white",
  experimental: "bg-[var(--neutral-8)] text-foreground",
};

const getTagColor = (tag?: string) => {
  if (!tag) return "bg-[var(--neutral-7)] text-foreground";
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

  const unreadCount = getUnreadCount(entries, lastSeenVersion);
  const recentEntries = entries.slice(0, 5);
  const latestVersion = recentEntries[0]?.version ?? null;

  // Any close path — outside click, Escape, or following "View all updates" —
  // means the panel has been seen. Popover owns dismissal, so this is the single
  // place that has to know it.
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && latestVersion) setLastSeenVersion(latestVersion);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label="View changelog"
        className={cn(
          "relative inline-flex items-center justify-center rounded-[var(--radius-lg)] p-2 transition-colors hover:bg-muted",
          className,
        )}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-danger)] text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-80 overflow-hidden rounded-[var(--radius-lg)] border-border bg-white p-0 shadow-lg"
      >
        <div className="bg-gradient-to-r from-[var(--blue-3)] to-[var(--cyan-3)] px-4 py-3">
          <h3 className="font-semibold text-foreground">What's New</h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {recentEntries.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No updates available
            </div>
          ) : (
            recentEntries.map((entry) => (
              <a
                key={entry.version}
                href={entry.url}
                className="block border-b border-border px-4 py-3 transition-colors hover:bg-muted"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
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
                <p className="mb-1 text-sm font-medium text-foreground">{entry.title}</p>
                <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{entry.excerpt}</p>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </a>
            ))
          )}
        </div>

        <a
          href={changelogUrl}
          onClick={() => handleOpenChange(false)}
          className="flex items-center justify-between border-t border-border bg-background px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
        >
          <span>View all updates</span>
          <ChevronRight className="h-4 w-4" />
        </a>
      </PopoverContent>
    </Popover>
  );
}
