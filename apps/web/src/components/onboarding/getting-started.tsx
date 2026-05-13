import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import {
  ArrowRight,
  Check,
  type LucideIcon,
  MessageSquare,
  Plug,
  ShieldCheck,
  Users,
} from "lucide-react";
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
  chatSessions: number;
}

/**
 * Reads the real onboarding state for the org.
 * Each query is wrapped so a failed table read degrades to "not done"
 * for that task instead of breaking the whole component.
 */
async function readOrgState(orgId: string, userId: string): Promise<OrgState> {
  const [members, apiKeys, integrations, chatSessions] = await Promise.all([
    db.organizationMember.count({ where: { organizationId: orgId } }).catch(() => 0),
    db.aPIKey.count({ where: { organizationId: orgId } }).catch(() => 0),
    db.integration.count({ where: { organizationId: orgId, isActive: true } }).catch(() => 0),
    db.chatSession.count({ where: { organizationId: orgId, userId } }).catch(() => 0),
  ]);
  return { members, apiKeys, integrations, chatSessions };
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

  const state = await readOrgState(orgId, userId);

  const tasks: OnboardingTask[] = [
    {
      id: "team",
      label: "Invite a teammate",
      description: "Bring at least one collaborator into your workspace.",
      href: "/settings/team",
      icon: Users,
      done: state.members > 1,
    },
    {
      id: "api",
      label: "Generate an API key",
      description: "Programmatic access to your workspace endpoints.",
      href: "/settings/api-keys",
      icon: ShieldCheck,
      done: state.apiKeys > 0,
    },
    {
      id: "integration",
      label: "Connect an integration",
      description: "Stripe, Slack, webhooks, queues, and more.",
      href: "/integrations",
      icon: Plug,
      done: state.integrations > 0,
    },
    {
      id: "ai",
      label: "Open Sailor AI",
      description: "Try chat, data, or workflow mode.",
      href: "/chat",
      icon: MessageSquare,
      // Sessions persisted via ChatSession table — real done signal now.
      done: state.chatSessions > 0,
    },
  ];

  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  // All tasks complete → hide entirely. Power users don't need this clutter.
  if (doneCount === total) return null;

  const percent = Math.round((doneCount / total) * 100);

  return (
    <div>
      <AnimateIn preset="fadeUp">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
              Getting Started
            </h2>
            <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/40">
              {doneCount} of {total} complete · finish setup to unlock the full workspace
            </p>
          </div>

          {/* Progress ring summary */}
          <div className="flex shrink-0 items-center gap-2">
            <div
              className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-3 dark:bg-white/10"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Setup progress"
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, background: "var(--brand-gradient)" }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-neutral-11 dark:text-white/60">
              {percent}%
            </span>
          </div>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid gap-2 sm:grid-cols-2">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <AnimateIn key={task.id} preset="fadeUp">
              <ViewTransitionLink
                href={task.href}
                aria-label={
                  task.done ? `${task.label} (complete)` : `${task.label} — ${task.description}`
                }
                className={`group flex items-start gap-3 rounded-xl border p-3.5 transition-colors duration-150 ${
                  task.done
                    ? "border-green-6 bg-green-2/40 hover:bg-green-2/60 dark:border-green-7/50 dark:bg-green-2/10 dark:hover:bg-green-2/20"
                    : "border-neutral-6 bg-neutral-1 hover:border-neutral-8 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    task.done
                      ? "bg-green-3 text-green-11 dark:bg-green-3/30 dark:text-green-9"
                      : "bg-neutral-2 text-neutral-11 dark:bg-white/10 dark:text-white/60"
                  }`}
                >
                  {task.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm font-medium ${
                        task.done
                          ? "text-green-12 dark:text-green-9"
                          : "text-neutral-12 dark:text-white"
                      }`}
                    >
                      {task.label}
                    </p>
                    <ArrowRight
                      className={`h-3.5 w-3.5 shrink-0 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-60 ${
                        task.done
                          ? "text-green-11 dark:text-green-9"
                          : "text-neutral-11 dark:text-white/70"
                      }`}
                    />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-10 dark:text-white/50">
                    {task.description}
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
