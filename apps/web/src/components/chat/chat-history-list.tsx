"use client";

import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
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
import { useState, useTransition } from "react";
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

export function ChatHistoryList({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<ChatHistoryRow[]>(initialSessions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleDelete(session: ChatHistoryRow) {
    const confirmed =
      typeof window !== "undefined" &&
      window.confirm(`Delete "${session.title || "Untitled session"}"? This cannot be undone.`);
    if (!confirmed) return;

    setBusyId(session.id);
    setError(null);
    try {
      const res = await fetch(`/api/chat/sessions/${session.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to delete session");
      }
      startTransition(() => {
        setSessions((current) => current.filter((s) => s.id !== session.id));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setBusyId(null);
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
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-6 bg-red-2 px-3 py-2 text-sm text-red-11">
          {error}
        </div>
      )}

      <AnimateInGroup stagger="fast" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => {
          const meta = MODE_META[session.mode] ?? MODE_META.chat;
          const Icon = meta.icon;
          const href = `/chat?sessionId=${encodeURIComponent(session.id)}&mode=${encodeURIComponent(session.mode)}`;
          const isBusy = busyId === session.id;
          return (
            <AnimateIn key={session.id} preset="fadeUp">
              <div
                className={`group relative flex h-full flex-col rounded-xl border border-neutral-6 bg-neutral-1 p-4 transition-all duration-150 hover:border-neutral-8 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:shadow-none ${
                  isBusy ? "opacity-50" : ""
                }`}
              >
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
                  onClick={() => handleDelete(session)}
                  disabled={isBusy}
                  aria-label={`Delete session: ${session.title}`}
                  className="absolute right-3 top-3 rounded-md p-1 text-neutral-9 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-2 hover:text-red-11 focus-visible:opacity-100 disabled:cursor-not-allowed dark:text-white/30 dark:hover:bg-red-2/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </div>
  );
}
