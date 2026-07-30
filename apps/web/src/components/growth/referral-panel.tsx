"use client";

import { ArrowUpRight, Sparkles as Gift, Sparkles } from "@nebutra/icons";
import { CopyButton } from "@nebutra/ui/primitives";

/**
 * TEMPLATE — Referral panel.
 *
 * Currently not wired to a live `/api/referrals` route. The `Referral` Prisma
 * model exists, but the issuance/claim API needs to be built before this is
 * shipped to users. Surface this only after:
 *   1. POST /api/referrals (create a new code for current user)
 *   2. POST /api/referrals/claim (mark claimed at signup)
 *   3. GET /api/referrals/me (list referrer's stats)
 *
 * Drop into `/settings` or `/billing` once activated. Until then, this
 * component renders an "invitation system coming soon" preview when no
 * stats are passed in.
 */

export interface ReferralLevel {
  id: number;
  title: string;
  reward: string;
  description: string;
  threshold: number;
}

export interface ReferralStats {
  totalInvites: number;
  pointsEarned: number;
  commissionUsd: number;
  currentLevel: number;
  referralCode: string;
  shareUrl: string;
}

export const REFERRAL_LEVELS: ReferralLevel[] = [
  {
    id: 0,
    title: "Creator",
    reward: "Start inviting",
    description: "Your code unlocks rewards for friends from day one.",
    threshold: 0,
  },
  {
    id: 1,
    title: "Pioneer",
    reward: "2,000 credits per friend",
    description: "Earn for each of the first 7 friends who claim your code.",
    threshold: 7,
  },
  {
    id: 2,
    title: "Partner",
    reward: "20% revenue share",
    description: "Earn 20% on everything friends pay for in their first 3 months.",
    threshold: 50,
  },
];

interface Props {
  /** When null/undefined, renders a preview "coming soon" card. */
  stats?: ReferralStats;
  /** Override the level table. */
  levels?: ReferralLevel[];
}

export function ReferralPanel({ stats, levels = REFERRAL_LEVELS }: Props) {
  // Preview state — no live data yet.
  if (!stats) {
    return (
      <section className="rounded-[var(--radius-2xl)] border border-dashed border-neutral-7 bg-neutral-1 p-6">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-xl)] text-white"
            style={{ background: "hsl(var(--primary))" }}
          >
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-12">Invitations & rewards</h2>
            <p className="mt-1 text-xs text-neutral-10">
              The referral pipeline ships behind a feature flag. Once enabled, your code, share
              link, and stats appear here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-7 bg-neutral-1 p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 opacity-[0.16] blur-3xl"
          style={{ background: "hsl(var(--primary))" }}
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-neutral-12">Share Sailor, earn rewards</h2>
          </div>
          <p className="mt-1 max-w-xl text-xs text-neutral-10">
            Friends get unlimited access · You earn credits and commission · Build a passive income
            stream as your network compounds.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-xl)] border border-neutral-6 bg-neutral-2 p-3 dark:bg-black/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-10">
                Referral code
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <code className="truncate font-mono text-sm font-semibold text-neutral-12">
                  {stats.referralCode}
                </code>
                <CopyButton
                  value={stats.referralCode}
                  aria-label="Copy referral code"
                  label="Copy"
                  variant="outline"
                  size="tiny"
                  showToast={false}
                  timeout={1600}
                  className="h-auto gap-1.5 rounded-[var(--radius-md)] border-neutral-7 bg-neutral-1 px-2.5 py-1 text-xs text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:bg-black/40"
                />
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-neutral-6 bg-neutral-2 p-3 dark:bg-black/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-10">
                Share link
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-neutral-11">{stats.shareUrl}</span>
                <CopyButton
                  value={stats.shareUrl}
                  aria-label="Copy share link"
                  label="Copy"
                  variant="outline"
                  size="tiny"
                  showToast={false}
                  timeout={1600}
                  className="h-auto gap-1.5 rounded-[var(--radius-md)] border-neutral-7 bg-neutral-1 px-2.5 py-1 text-xs text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:bg-black/40"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total invites", value: stats.totalInvites.toLocaleString() },
          { label: "Credits earned", value: stats.pointsEarned.toLocaleString() },
          {
            label: "Commission",
            value: `$${stats.commissionUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          },
        ].map((cell) => (
          <div
            key={cell.label}
            className="rounded-[var(--radius-xl)] border border-neutral-6 bg-neutral-1 p-3 text-center/[0.03]"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-10">
              {cell.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-12">{cell.value}</p>
          </div>
        ))}
      </div>

      {/* Level table */}
      <div className="space-y-2">
        {levels.map((level) => {
          const isActive = stats.currentLevel === level.id;
          const remaining = Math.max(0, level.threshold - stats.totalInvites);
          return (
            <div
              key={level.id}
              className={`flex items-center justify-between gap-4 rounded-[var(--radius-xl)] border p-4 ${
                isActive
                  ? "border-primary/30 bg-primary/5 dark:border-primary/40 dark:bg-primary/5/15"
                  : "border-neutral-6 bg-neutral-1"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-12">
                    Level {level.id} · {level.title}
                  </h3>
                  {isActive && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary dark:bg-primary/15 dark:text-primary">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-10">{level.description}</p>
              </div>
              <div className="text-right">
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    background: "hsl(var(--primary))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {level.reward}
                </p>
                {!isActive && remaining > 0 && (
                  <p className="mt-0.5 text-[11px] text-neutral-10">{remaining} more to unlock</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <a
        href="/legal/referral-terms"
        className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-10 transition-colors hover:text-neutral-12"
      >
        Referral terms
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </section>
  );
}
