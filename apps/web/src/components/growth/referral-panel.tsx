"use client";

import { Sparkles } from "@nebutra/icons";
import { Button, CopyButton, Field, Input, Skeleton } from "@nebutra/ui/primitives";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { normalizeReferralCode, REFERRAL_LEVELS, type ReferralLevel } from "@/lib/growth/referrals";
import { queryKeys } from "@/lib/query-keys";

export type { ReferralLevel };
export { REFERRAL_LEVELS };

export interface ReferralStats {
  totalInvites: number;
  openCodes: number;
  pointsEarned: number;
  currentLevel: number;
  referralCode: string;
  shareUrl: string;
}

export interface ReferralRecord {
  id: string;
  code: string;
  status: string;
  referredEmail: string | null;
  rewardCredits: number;
  level: number;
  expiresAt: string | null;
  claimedAt: string | null;
  createdAt: string;
  isMine: boolean;
}

interface ReferralsResponse {
  stats: ReferralStats;
  referrals: ReferralRecord[];
}

async function fetchReferrals(signal?: AbortSignal): Promise<ReferralsResponse> {
  const res = await fetch("/api/referrals", { credentials: "include", signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load referrals (${res.status})`);
  }
  return (await res.json()) as ReferralsResponse;
}

async function redeemReferral(code: string): Promise<void> {
  const res = await fetch("/api/referrals", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Could not redeem that code (${res.status})`);
  }
}

interface Props {
  /** Override the level table. */
  levels?: readonly ReferralLevel[];
}

/**
 * Referral panel — the organization's invite-to-earn surface, backed by
 * `/api/referrals`. The code shown is issued by the first GET, so the panel has
 * a real value to render from the moment it mounts.
 */
export function ReferralPanel({ levels = REFERRAL_LEVELS }: Props) {
  const queryClient = useQueryClient();
  const referralsKey = queryKeys.referrals.list();
  const redeemFieldId = useId();
  const [redeemCode, setRedeemCode] = useState("");

  const referralsQuery = useQuery({
    queryKey: referralsKey,
    queryFn: ({ signal }) => fetchReferrals(signal),
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) => redeemReferral(code),
    onSuccess: () => {
      setRedeemCode("");
      void queryClient.invalidateQueries({ queryKey: referralsKey });
    },
  });

  if (referralsQuery.isPending) {
    // Mirrors the loaded geometry — hero, two stat tiles, redeem row, ladder —
    // so nothing shifts when the data lands.
    return (
      <section className="space-y-5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading referrals</span>
        <Skeleton height={168} className="w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton height={82} className="w-full" />
          <Skeleton height={82} className="w-full" />
        </div>
        <Skeleton height={98} className="w-full" />
        <div className="space-y-2">
          {levels.map((level) => (
            <Skeleton key={level.id} height={82} className="w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (referralsQuery.error || !referralsQuery.data) {
    const message =
      referralsQuery.error instanceof Error
        ? referralsQuery.error.message
        : "Failed to load referrals.";
    return (
      <section className="rounded-[var(--radius-2xl)] bg-neutral-2 p-6 dark:bg-black/30">
        <h2 className="text-sm font-semibold text-neutral-12">Invitations and rewards</h2>
        <p className="mt-1 text-xs text-[hsl(var(--destructive-strong))]">{message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void referralsQuery.refetch()}
        >
          Try again
        </Button>
      </section>
    );
  }

  const { stats, referrals } = referralsQuery.data;
  const claimed = referrals.filter((row) => row.isMine && row.status === "claimed");
  const redeemError = redeemMutation.error instanceof Error ? redeemMutation.error.message : null;

  return (
    <section className="space-y-5">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-neutral-2 p-5 dark:bg-black/30">
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
            Friends get full access · You earn credits as each invite is claimed · Your level rises
            with the network you build.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-xl)] bg-neutral-1 p-3 dark:bg-black/40">
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
                  className="h-auto gap-1.5 rounded-[var(--radius-md)] bg-neutral-2 px-2.5 py-1 text-xs text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12 dark:bg-black/40"
                />
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-neutral-1 p-3 dark:bg-black/40">
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
                  className="h-auto gap-1.5 rounded-[var(--radius-md)] bg-neutral-2 px-2.5 py-1 text-xs text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12 dark:bg-black/40"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row — two figures that actually move. A third tile counting open
          codes would read "1" forever, because the ledger keeps exactly one
          redeemable code per person. Credits are deliberately not a tile: the
          number is recorded per referral but there is no balance to spend it
          from, so "Credits earned" would be a promise, not a figure. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Claimed invites", value: stats.totalInvites.toLocaleString() },
          {
            label: "Level",
            value: (levels[stats.currentLevel] ?? levels[0])?.title ?? "—",
          },
        ].map((cell) => (
          <div
            key={cell.label}
            className="rounded-[var(--radius-xl)] bg-neutral-2 p-3 text-center dark:bg-black/30"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-10">
              {cell.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-12">{cell.value}</p>
          </div>
        ))}
      </div>

      {/* Redeem someone else's code */}
      <form
        className="rounded-[var(--radius-xl)] bg-neutral-2 p-4 dark:bg-black/30"
        onSubmit={(event) => {
          event.preventDefault();
          const code = normalizeReferralCode(redeemCode);
          if (!code) return;
          redeemMutation.mutate(code);
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Have a friend's code" htmlFor={redeemFieldId}>
              <Input
                id={redeemFieldId}
                name="referralCode"
                value={redeemCode}
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
                placeholder="ABCD2345"
                className="font-mono uppercase"
                onChange={(event) => setRedeemCode(event.target.value)}
              />
            </Field>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={redeemMutation.isPending || normalizeReferralCode(redeemCode).length < 4}
          >
            {redeemMutation.isPending ? "Redeeming" : "Redeem"}
          </Button>
        </div>
        {redeemError && (
          <p className="mt-2 text-xs text-[hsl(var(--destructive-strong))]">{redeemError}</p>
        )}
        {redeemMutation.isSuccess && !redeemError && (
          <p className="mt-2 text-xs text-neutral-11">Code redeemed. Your referrer is credited.</p>
        )}
      </form>

      {/* Level table */}
      <div className="space-y-2">
        {levels.map((level) => {
          const isActive = stats.currentLevel === level.id;
          const remaining = Math.max(0, level.threshold - stats.totalInvites);
          return (
            <div
              key={level.id}
              className={`flex items-center justify-between gap-4 rounded-[var(--radius-xl)] p-4 ${
                isActive ? "bg-primary/10 dark:bg-primary/15" : "bg-neutral-2 dark:bg-black/30"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-12">
                    Level {level.id} · {level.title}
                  </h3>
                  {isActive && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-10">{level.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-primary">{level.reward}</p>
                {!isActive && remaining > 0 && (
                  <p className="mt-0.5 text-[11px] text-neutral-10">{remaining} more to unlock</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Claimed invites — real rows only; an empty ledger renders nothing. */}
      {claimed.length > 0 && (
        <ul className="space-y-1.5">
          {claimed.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-neutral-2 px-3 py-2 dark:bg-black/30"
            >
              <code className="font-mono text-xs text-neutral-11">{row.code}</code>
              <span className="text-xs tabular-nums text-neutral-10">
                {row.claimedAt ? new Date(row.claimedAt).toLocaleDateString() : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
