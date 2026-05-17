import type { Icon as LucideIcon } from "@nebutra/icons";
import {
  Code as Code2,
  Database,
  Message as MessageSquare,
  Plus,
  MagnifyingGlass as Search,
  Workflow,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { getLocale, getTranslations } from "next-intl/server";
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

function formatSessionTime(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Server-rendered "continue where you left off" list for the dashboard.
 *
 * Honesty contract:
 *   - Only shows sessions that actually exist in the database
 *   - Returns null when there are zero sessions; the dashboard should not
 *     fabricate a working queue before the product has real usage data
 *   - Each card links to `/chat?sessionId=X&mode=Y`, restoring full context
 */
export async function RecentSessions() {
  const [auth, locale] = await Promise.all([getAuth().catch(() => null), getLocale()]);

  const orgId = auth?.orgId ?? null;
  const userId = auth?.userId ?? null;
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

  const t = await getTranslations("dashboard.recentSessions");

  return (
    <div className="rounded-[var(--radius-2xl)] border border-neutral-6 bg-neutral-1 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
      <AnimateIn preset="fadeUp">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/40">
              {t("subtitle", { count: sessions.length })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewTransitionLink
              href="/chat/history"
              className="text-xs font-medium text-neutral-10 transition-colors hover:text-neutral-12 dark:text-white/50 dark:hover:text-white"
            >
              {t("viewAll")}
            </ViewTransitionLink>
            <ViewTransitionLink
              href="/chat"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-11 transition-colors hover:text-blue-12 dark:text-blue-9 dark:hover:text-blue-8"
            >
              <Plus className="size-3" aria-hidden="true" />
              {t("newChat")}
            </ViewTransitionLink>
          </div>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="space-y-2">
        {sessions.map((session) => {
          const meta = MODE_META[session.mode] ?? MODE_META.chat;
          const Icon = meta.icon;
          const href = `/chat?sessionId=${encodeURIComponent(session.id)}&mode=${encodeURIComponent(session.mode)}`;
          return (
            <AnimateIn key={session.id} preset="fadeUp">
              <ViewTransitionLink href={href} className="block">
                <div className="flex min-h-16 items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-neutral-5 bg-neutral-1 px-3.5 py-3 transition-colors duration-150 hover:border-neutral-7 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full bg-neutral-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider dark:bg-white/10 ${meta.accent}`}
                    >
                      <Icon className="size-3" aria-hidden="true" />
                      {meta.label}
                    </span>
                    <p className="mt-1 truncate text-sm font-medium text-neutral-12 dark:text-white">
                      {session.title || t("untitled")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] tabular-nums text-neutral-10 dark:text-white/45">
                      {formatSessionTime(session.lastMessageAt, locale)}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-10 dark:text-white/45">
                      {t("messageCount", { count: session.messageCount })}
                    </p>
                  </div>
                </div>
              </ViewTransitionLink>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </div>
  );
}
