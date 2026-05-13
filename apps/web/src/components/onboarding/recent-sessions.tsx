import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { LucideIcon } from "lucide-react";
import { Code2, Database, MessageSquare, Plus, Search, Workflow } from "lucide-react";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

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

/**
 * Server-rendered "continue where you left off" list for the dashboard.
 *
 * Honesty contract:
 *   - Only shows sessions that actually exist in the database
 *   - Returns null when there are zero sessions — empty state should be the
 *     GettingStarted "Open Sailor AI" task, not a fake "Start your first chat"
 *     placeholder dressed up to look like content
 *   - Each card links to `/chat?sessionId=X&mode=Y`, restoring full context
 */
export async function RecentSessions() {
  let orgId: string | null = null;
  let userId: string | null = null;

  try {
    const auth = await getAuth();
    orgId = auth?.orgId ?? null;
    userId = auth?.userId ?? null;
  } catch {
    return null;
  }
  if (!orgId || !userId) return null;

  const sessions = await db.chatSession
    .findMany({
      where: { organizationId: orgId, userId },
      orderBy: { lastMessageAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        mode: true,
        messageCount: true,
        lastMessageAt: true,
      },
    })
    .catch(() => []);

  if (sessions.length === 0) return null;

  return (
    <div>
      <AnimateIn preset="fadeUp">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
              Continue where you left off
            </h2>
            <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/40">
              {sessions.length} recent session{sessions.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewTransitionLink
              href="/chat/history"
              className="text-xs font-medium text-neutral-10 transition-colors hover:text-neutral-12 dark:text-white/50 dark:hover:text-white"
            >
              View all →
            </ViewTransitionLink>
            <ViewTransitionLink
              href="/chat"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-11 transition-colors hover:text-blue-12 dark:text-blue-9 dark:hover:text-blue-8"
            >
              <Plus className="h-3 w-3" />
              New chat
            </ViewTransitionLink>
          </div>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sessions.map((session) => {
          const meta = MODE_META[session.mode] ?? MODE_META.chat;
          const Icon = meta.icon;
          const href = `/chat?sessionId=${encodeURIComponent(session.id)}&mode=${encodeURIComponent(session.mode)}`;
          return (
            <AnimateIn key={session.id} preset="fadeUp">
              <ViewTransitionLink href={href} className="block h-full">
                <div className="flex h-full flex-col rounded-xl border border-neutral-6 bg-neutral-1 p-3.5 transition-all duration-150 hover:border-neutral-8 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:shadow-none">
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
                  <p className="line-clamp-2 text-sm font-medium text-neutral-12 dark:text-white">
                    {session.title || "Untitled session"}
                  </p>
                  <p className="mt-auto pt-2 text-[11px] text-neutral-10 dark:text-white/50">
                    {session.messageCount} message{session.messageCount === 1 ? "" : "s"}
                  </p>
                </div>
              </ViewTransitionLink>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </div>
  );
}
