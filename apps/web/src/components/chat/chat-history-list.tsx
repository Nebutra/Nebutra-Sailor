"use client";

import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { ConfirmDialog, toast } from "@nebutra/ui/primitives";
import {
  Code2,
  Database,
  type LucideIcon,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";

const MODE_META: Record<string, { label: string; icon: LucideIcon; accent: string }> = {
  chat: { label: "Chat", icon: MessageSquare, accent: "text-blue-11 dark:text-blue-9" },
  data: { label: "Data", icon: Database, accent: "text-cyan-11 dark:text-cyan-9" },
  workflow: { label: "Workflow", icon: Workflow, accent: "text-green-11 dark:text-green-9" },
  search: { label: "Search", icon: Search, accent: "text-neutral-11 dark:text-white/70" },
  code: { label: "Code", icon: Code2, accent: "text-amber-11 dark:text-amber-9" },
};

const REL_TIME_THRESHOLDS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.345, "week"],
  [12, "month"],
];

function formatRelative(date: Date): string {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let diff = (date.getTime() - Date.now()) / 1000;
  for (const [threshold, unit] of REL_TIME_THRESHOLDS) {
    if (Math.abs(diff) < threshold) {
      return formatter.format(Math.round(diff), unit);
    }
    diff /= threshold;
  }
  return formatter.format(Math.round(diff), "year");
}

export interface ChatHistoryRow {
  id: string;
  title: string;
  mode: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

interface Props {
  initialSessions: ChatHistoryRow[];
}

type TimeBucket = "today" | "yesterday" | "thisWeek" | "thisMonth" | "earlier";

const BUCKET_ORDER: TimeBucket[] = ["today", "yesterday", "thisWeek", "thisMonth", "earlier"];

const BUCKET_LABELS: Record<TimeBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This week",
  thisMonth: "This month",
  earlier: "Earlier",
};

function bucketFor(date: Date): TimeBucket {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(startOfToday);
  startOfMonth.setMonth(startOfMonth.getMonth() - 1);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";
  if (date >= startOfWeek) return "thisWeek";
  if (date >= startOfMonth) return "thisMonth";
  return "earlier";
}

export function ChatHistoryList({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<ChatHistoryRow[]>(initialSessions);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ChatHistoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  // Filter + group by time bucket.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (MODE_META[s.mode]?.label.toLowerCase().includes(q) ?? false),
        )
      : sessions;

    const groups: Record<TimeBucket, ChatHistoryRow[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      earlier: [],
    };
    for (const session of filtered) {
      const bucket = bucketFor(new Date(session.lastMessageAt));
      groups[bucket].push(session);
    }
    return groups;
  }, [sessions, query]);

  const totalMatches = useMemo(
    () => BUCKET_ORDER.reduce((sum, b) => sum + grouped[b].length, 0),
    [grouped],
  );

  async function performDelete(session: ChatHistoryRow) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/chat/sessions/${session.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to delete session");
      }
      startTransition(() => {
        setSessions((current) => current.filter((s) => s.id !== session.id));
      });
      toast.success("Session deleted", {
        description: `"${session.title || "Untitled session"}" was removed.`,
      });
      setPendingDelete(null);
    } catch (err) {
      toast.error("Failed to delete session", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <AnimateIn preset="fadeUp">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-7 bg-neutral-1 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <MessageSquare className="h-8 w-8 text-neutral-9 dark:text-white/30" />
          <div>
            <p className="text-sm font-medium text-neutral-12 dark:text-white">
              No chat history yet
            </p>
            <p className="mt-1 max-w-sm text-xs text-neutral-10 dark:text-white/50">
              Start a conversation with Sailor and it will be saved here automatically.
            </p>
          </div>
          <ViewTransitionLink
            href="/chat"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--brand-gradient)" }}
          >
            <Plus className="h-3 w-3" />
            Start a chat
          </ViewTransitionLink>
        </div>
      </AnimateIn>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-10 dark:text-white/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions by title or mode…"
          aria-label="Search chat history"
          className="w-full rounded-xl border border-neutral-7 bg-neutral-1 py-2 pl-9 pr-3 text-sm text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/40"
        />
        {query && (
          <p className="mt-1.5 text-[11px] text-neutral-10 dark:text-white/40">
            {totalMatches} match{totalMatches === 1 ? "" : "es"} for "{query}"
          </p>
        )}
      </div>

      {/* Empty filter result */}
      {totalMatches === 0 && query && (
        <div className="rounded-xl border border-dashed border-neutral-7 px-6 py-10 text-center dark:border-white/15">
          <Search className="mx-auto h-5 w-5 text-neutral-9 dark:text-white/30" />
          <p className="mt-2 text-sm font-medium text-neutral-12 dark:text-white">
            No sessions match "{query}"
          </p>
          <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/50">
            Try a different keyword or clear the search.
          </p>
        </div>
      )}

      {/* Grouped sections */}
      {BUCKET_ORDER.map((bucket) => {
        const items = grouped[bucket];
        if (items.length === 0) return null;
        return (
          <section key={bucket}>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-10 dark:text-white/40">
              {BUCKET_LABELS[bucket]} · {items.length}
            </h2>
            <AnimateInGroup stagger="fast" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((session) => {
                const meta = MODE_META[session.mode] ?? MODE_META.chat;
                const Icon = meta.icon;
                const href = `/chat?sessionId=${encodeURIComponent(session.id)}&mode=${encodeURIComponent(session.mode)}`;
                return (
                  <AnimateIn key={session.id} preset="fadeUp">
                    <div className="group relative flex h-full flex-col rounded-xl border border-neutral-6 bg-neutral-1 p-4 transition-all duration-150 hover:border-neutral-8 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:shadow-none">
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full bg-neutral-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider dark:bg-white/10 ${meta.accent}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-neutral-10 dark:text-white/40">
                          {formatRelative(new Date(session.lastMessageAt))}
                        </span>
                      </div>

                      <ViewTransitionLink
                        href={href}
                        className="block flex-1 focus-visible:outline-none"
                        aria-label={`Open session: ${session.title}`}
                      >
                        <p className="line-clamp-2 text-sm font-medium text-neutral-12 dark:text-white">
                          {session.title || "Untitled session"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">
                          {session.messageCount} message{session.messageCount === 1 ? "" : "s"}
                        </p>
                      </ViewTransitionLink>

                      <button
                        type="button"
                        onClick={() => setPendingDelete(session)}
                        aria-label={`Delete session: ${session.title}`}
                        className="absolute right-3 top-3 rounded-md p-1 text-neutral-9 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-2 hover:text-red-11 focus-visible:opacity-100 dark:text-white/30 dark:hover:bg-red-2/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </AnimateIn>
                );
              })}
            </AnimateInGroup>
          </section>
        );
      })}

      {/* Branded delete confirmation */}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this session?"
        description={
          pendingDelete
            ? `"${pendingDelete.title || "Untitled session"}" will be permanently removed. This cannot be undone.`
            : undefined
        }
        variant="destructive"
        confirmText="Delete"
        loading={deleting}
        onConfirm={() => {
          if (pendingDelete) void performDelete(pendingDelete);
        }}
      />
    </div>
  );
}
