import {
  ArrowRight,
  Check,
  type Icon as LucideIcon,
  Connection as Plug,
  ShieldCheck,
  Users,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { DashboardPanel } from "@nebutra/ui/patterns";
import { getTranslations } from "next-intl/server";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

interface OnboardingTask {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  done: boolean;
}

interface OrgState {
  members: number;
  apiKeys: number;
  integrations: number;
}

/**
 * Reads the real onboarding state for the org.
 * Each query is wrapped so a failed table read degrades to "not done"
 * for that task instead of breaking the whole component.
 */
async function readOrgState(orgId: string): Promise<OrgState> {
  const [members, apiKeys, integrations] = await Promise.all([
    db.organizationMember.count({ where: { organizationId: orgId } }).catch(() => 0),
    db.aPIKey.count({ where: { tenantId: orgId } }).catch(() => 0),
    db.integration.count({ where: { tenantId: orgId, isActive: true } }).catch(() => 0),
  ]);
  return { members, apiKeys, integrations };
}

/**
 * Server-rendered onboarding checklist.
 *
 * Honesty contract:
 *   - Each task's done state is derived from REAL database counts, never inferred
 *   - Tasks without a measurable signal (e.g. "Start an AI session") are excluded
 *     until persistence exists, rather than always showing as todo
 *   - Returns null when:
 *       · auth fails / no orgId resolvable
 *       · all measurable tasks are complete (do not clutter the dashboard)
 */
export async function GettingStarted() {
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

  const [state, t] = await Promise.all([
    readOrgState(orgId),
    getTranslations("dashboard.gettingStarted"),
  ]);

  const tasks: OnboardingTask[] = [
    {
      id: "team",
      label: t("tasks.team.label"),
      description: t("tasks.team.description"),
      href: "/settings/team",
      icon: Users,
      done: state.members > 1,
    },
    {
      id: "api",
      label: t("tasks.api.label"),
      description: t("tasks.api.description"),
      href: "/settings/api-keys",
      icon: ShieldCheck,
      done: state.apiKeys > 0,
    },
    {
      id: "integration",
      label: t("tasks.integration.label"),
      description: t("tasks.integration.description"),
      href: "/integrations",
      icon: Plug,
      done: state.integrations > 0,
    },
  ];

  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  // All tasks complete → hide entirely. Power users don't need this clutter.
  if (doneCount === total) return null;

  const percent = Math.round((doneCount / total) * 100);

  return (
    <DashboardPanel
      data-tour-id="getting-started"
      title={t("title")}
      description={t("description", { done: doneCount, total })}
      meta={
        <div className="flex shrink-0 items-center gap-2">
          <progress className="sr-only" value={percent} max={100} aria-label={t("progressLabel")} />
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-3" aria-hidden="true">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%`, background: "var(--brand-gradient)" }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-neutral-11">{percent}%</span>
        </div>
      }
    >
      <AnimateInGroup
        stagger="fast"
        className="divide-y divide-neutral-5/80 overflow-hidden rounded-[var(--radius-md)] border border-neutral-5/80 bg-neutral-2/60"
      >
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <AnimateIn key={task.id} preset="fadeUp">
              <ViewTransitionLink
                href={task.href}
                aria-label={
                  task.done ? `${task.label} (complete)` : `${task.label} — ${task.description}`
                }
                className={`group flex items-start gap-3 px-3 py-3 transition-colors duration-150 ${
                  task.done
                    ? "bg-green-2/35 hover:bg-green-2/55 dark:bg-green-2/10 dark:hover:bg-green-2/20"
                    : "hover:bg-neutral-3/70"
                }`}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                    task.done
                      ? "bg-green-3 text-green-11 dark:bg-green-3/30 dark:text-green-9"
                      : "bg-neutral-2 text-neutral-11"
                  }`}
                >
                  {task.done ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Icon className="size-3.5" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm font-medium ${
                        task.done ? "text-green-12 dark:text-green-9" : "text-neutral-12"
                      }`}
                    >
                      {task.label}
                    </p>
                    <ArrowRight
                      className={`size-3.5 shrink-0 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-60 ${
                        task.done ? "text-green-11 dark:text-green-9" : "text-neutral-11"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-10">{task.description}</p>
                </div>
              </ViewTransitionLink>
            </AnimateIn>
          );
        })}
      </AnimateInGroup>
    </DashboardPanel>
  );
}
