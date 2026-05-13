import { API_CALLS, getMetering } from "@nebutra/metering";
import { Sparkles } from "lucide-react";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { getTenantContext } from "@/lib/auth";

const PROMOTE_UPGRADE_PLANS = new Set(["free", "trial", "starter"]);

function formatPlanLabel(plan: string) {
  return plan
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

interface QuotaSnapshot {
  used: number;
  limit: number;
  percent: number;
}

/**
 * Read the monthly API_CALLS quota for the tenant.
 * Returns null when:
 *   - metering provider is not configured (memory in dev, no creds)
 *   - no quota has been set for the tenant
 *   - any underlying error
 * Callers must render an honest fallback when this returns null —
 * we do not display fake numbers.
 */
async function readApiQuota(tenantId: string): Promise<QuotaSnapshot | null> {
  try {
    const metering = await getMetering();
    const quota = await metering.getQuota(tenantId, API_CALLS.id, "monthly");
    if (!quota || quota.limit <= 0) return null;
    const used = Math.max(0, quota.used ?? 0);
    const percent = Math.min(100, Math.round((used / quota.limit) * 100));
    return { used, limit: quota.limit, percent };
  } catch {
    return null;
  }
}

/**
 * Server-rendered plan badge for the shell header.
 * Honesty contract:
 *   - Always shows plan label when auth is available
 *   - Shows real quota when metering returns a quota; never invents numbers
 *   - Shows Upgrade CTA only when plan is in PROMOTE_UPGRADE_PLANS
 *   - Returns null on auth failure (shell stays clean)
 */
export async function PlanBadge() {
  let plan = "free";
  let tenantId: string | null = null;

  try {
    const tenant = await getTenantContext();
    if (tenant?.plan) plan = String(tenant.plan).toLowerCase();
    tenantId = tenant?.tenantId ?? null;
  } catch {
    return null;
  }

  const quota = tenantId ? await readApiQuota(tenantId) : null;
  const shouldPromoteUpgrade = PROMOTE_UPGRADE_PLANS.has(plan);
  const planLabel = formatPlanLabel(plan);

  // Dot color reflects usage pressure when quota is known.
  const dotClass = quota
    ? quota.percent >= 90
      ? "bg-red-9"
      : quota.percent >= 70
        ? "bg-amber-9"
        : "bg-green-9"
    : "bg-green-9";

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <ViewTransitionLink
        href="/billing"
        aria-label={
          quota
            ? `Current plan: ${planLabel}. API usage: ${quota.used} of ${quota.limit} (${quota.percent}%).`
            : `Current plan: ${planLabel}`
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-7 bg-neutral-1 px-2.5 py-1 text-xs font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
        <span>{planLabel}</span>
        {quota && (
          <>
            <span className="text-neutral-9 dark:text-white/30" aria-hidden>
              ·
            </span>
            <span className="tabular-nums text-neutral-10 dark:text-white/50">
              {fmtCompact(quota.used)}
              <span className="text-neutral-9 dark:text-white/30">/{fmtCompact(quota.limit)}</span>
            </span>
          </>
        )}
      </ViewTransitionLink>

      {shouldPromoteUpgrade && (
        <ViewTransitionLink
          href="/billing"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand-gradient)" }}
        >
          <Sparkles className="h-3 w-3" />
          Upgrade
        </ViewTransitionLink>
      )}
    </div>
  );
}
