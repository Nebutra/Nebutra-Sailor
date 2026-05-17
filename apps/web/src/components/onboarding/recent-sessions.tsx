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
 *   - Shows an honest empty state when there are zero sessions; the dashboard
 *     should keep its information architecture stable even before usage data exists
 *   - Each card links to `/chat?sessionId=X&mode=Y`, restoring full context
 */
export async function RecentSessions() {
  const [auth, t, locale] = await Promise.all([
    getAuth().catch(() => null),
    getTranslations("dashboard.recentSessions"),
    getLocale(),
  ]);

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

  return (
    <div className="rounded-2xl border border-neutral-6 bg-neutral-1 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
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
              <Plus className="size-3" />
              {t("newChat")}
            </ViewTransitionLink>
          </div>
        </div>
      </AnimateIn>

      {sessions.length > 0 ? (
        <AnimateInGroup stagger="fast" className="grid gap-3 sm:grid-cols-2">
          {sessions.map((session) => {
            const meta = MODE_META[session.mode] ?? MODE_META.chat;
            const Icon = meta.icon;
            const href = `/chat?sessionId=${encodeURIComponent(session.id)}&mode=${encodeURIComponent(session.mode)}`;
            return (
              <AnimateIn key={session.id} preset="fadeUp">
                <ViewTransitionLink href={href} className="block h-full">
                  <div className="flex h-full flex-col rounded-xl border border-neutral-6 bg-neutral-1 p-3.5 transition-colors duration-150 hover:border-neutral-8 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]">
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full bg-neutral-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider dark:bg-white/10 ${meta.accent}`}
                      >
                        <Icon className="size-3" />
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-neutral-10 dark:text-white/40">
                        {formatSessionTime(session.lastMessageAt, locale)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-neutral-12 dark:text-white">
                      {session.title || t("untitled")}
                    </p>
                    <p className="mt-auto pt-2 text-[11px] text-neutral-10 dark:text-white/50">
                      {t("messageCount", { count: session.messageCount })}
                    </p>
                  </div>
                </ViewTransitionLink>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>
      ) : (
        <AnimateIn preset="fadeUp">
          <div className="rounded-xl border border-dashed border-neutral-6 bg-neutral-2/60 p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="text-sm font-medium text-neutral-12 dark:text-white">{t("emptyTitle")}</p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-10 dark:text-white/50">
              {t("emptyDescription")}
            </p>
            <ViewTransitionLink
              href="/chat"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-neutral-7 bg-neutral-1 px-3 py-2 text-xs font-medium text-neutral-12 transition-colors hover:border-neutral-8 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <Plus className="size-3" />
              {t("newChat")}
            </ViewTransitionLink>
          </div>
        </AnimateIn>
      )}
    </div>
  );
}
