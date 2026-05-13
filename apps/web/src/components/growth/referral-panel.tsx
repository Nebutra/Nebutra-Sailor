"use client";

import { ArrowUpRight, Check, Copy, Gift, Sparkles } from "lucide-react";
import { useState } from "react";

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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-7 bg-neutral-1 px-2.5 py-1 text-xs font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:border-white/15 dark:bg-black/40 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-9" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

export function ReferralPanel({ stats, levels = REFERRAL_LEVELS }: Props) {
  // Preview state — no live data yet.
  if (!stats) {
    return (
      <section className="rounded-2xl border border-dashed border-neutral-7 bg-neutral-1 p-6 dark:border-white/15 dark:bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
              Invitations & rewards
            </h2>
            <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">
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
      <div className="relative overflow-hidden rounded-2xl border border-neutral-7 bg-neutral-1 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 opacity-[0.16] blur-3xl"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-9" />
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">
              Share Sailor, earn rewards
            </h2>
          </div>
          <p className="mt-1 max-w-xl text-xs text-neutral-10 dark:text-white/50">
            Friends get unlimited access · You earn credits and commission · Build a passive income
            stream as your network compounds.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-6 bg-neutral-2 p-3 dark:border-white/10 dark:bg-black/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-10 dark:text-white/40">
                Referral code
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <code className="truncate font-mono text-sm font-semibold text-neutral-12 dark:text-white">
                  {stats.referralCode}
                </code>
                <CopyButton value={stats.referralCode} label="referral code" />
              </div>
            </div>
            <div className="rounded-xl border border-neutral-6 bg-neutral-2 p-3 dark:border-white/10 dark:bg-black/30">
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-10 dark:text-white/40">
                Share link
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-neutral-11 dark:text-white/70">
                  {stats.shareUrl}
                </span>
                <CopyButton value={stats.shareUrl} label="share link" />
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
            className="rounded-xl border border-neutral-6 bg-neutral-1 p-3 text-center dark:border-white/10 dark:bg-white/[0.03]"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-10 dark:text-white/40">
              {cell.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-12 dark:text-white">
              {cell.value}
            </p>
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
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                isActive
                  ? "border-blue-7 bg-blue-2 dark:border-blue-7/60 dark:bg-blue-2/15"
                  : "border-neutral-6 bg-neutral-1 dark:border-white/10 dark:bg-white/[0.02]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">
                    Level {level.id} · {level.title}
                  </h3>
                  {isActive && (
                    <span className="rounded-full bg-blue-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-11 dark:bg-blue-9/20 dark:text-blue-9">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/50">
                  {level.description}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    background: "var(--brand-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {level.reward}
                </p>
                {!isActive && remaining > 0 && (
                  <p className="mt-0.5 text-[11px] text-neutral-10 dark:text-white/40">
                    {remaining} more to unlock
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <a
        href="/legal/referral-terms"
        className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-10 transition-colors hover:text-neutral-12 dark:text-white/50 dark:hover:text-white"
      >
        Referral terms
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </section>
  );
}
