"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AsyncSection, RetryButton, Skeleton } from "@/components/console-states";
import { consoleApi, type WalletBalance } from "@/lib/console-api";
import { describeError } from "@/lib/console-client";
import { formatAmount, parseRequiredAmount } from "@/lib/console-format";
import { useConsoleResource } from "@/lib/use-console-resource";

/**
 * The wallet.
 *
 * Two things were wrong here and both were about telling the truth: a failed
 * top-up rendered in the same neutral paragraph as a successful one, so a
 * refusal read as a receipt; and the amount was an unvalidated string, so an
 * empty box posted `Number("") === 0` and came back as a bare 400. Success and
 * failure now have different roles, colours and words, and the amount is parsed
 * before anything is sent.
 */

const PRESETS = [5, 10, 25, 50, 100];

type Outcome = { tone: "success" | "error"; text: string };

export function WalletClient() {
  const { resource, reload, set } = useConsoleResource<WalletBalance>("wallet", (signal) =>
    consoleApi.wallet(signal),
  );
  const [amount, setAmount] = useState("10");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currency = resource.data?.currency ?? "USD";

  const topUp = useCallback(async () => {
    const parsed = parseRequiredAmount(amount, { min: 1, max: 100_000 });
    if (!parsed.ok) {
      setFieldError(parsed.message);
      setOutcome(null);
      return;
    }
    setFieldError(null);
    setOutcome(null);
    setSubmitting(true);
    try {
      await consoleApi.topUp(parsed.value);
      const fresh = await consoleApi.wallet();
      set(fresh);
      setOutcome({
        tone: "success",
        text: `已到账 ${formatAmount(parsed.value)} ${fresh.currency}，当前余额 ${formatAmount(fresh.balance)}。`,
      });
    } catch (error) {
      setOutcome({ tone: "error", text: describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }, [amount, set]);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,16rem)_1fr]">
      <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3">
        <p className="text-[11px] text-[var(--neutral-10)]">当前余额</p>
        <AsyncSection
          resource={resource}
          onRetry={reload}
          skeleton={<Skeleton className="mt-2 h-7 w-24" />}
        >
          {(data) => (
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {formatAmount(data.balance)}
              <span className="ml-1.5 text-sm font-medium text-[var(--neutral-10)]">
                {data.currency}
              </span>
            </p>
          )}
        </AsyncSection>
        <p className="mt-2 text-[11px] leading-snug text-[var(--neutral-10)]">
          按量扣费，单次请求精确到 6 位小数。花在哪里见{" "}
          <Link href="/usage" className="underline underline-offset-2">
            用量
          </Link>
          。
        </p>
        {resource.status === "ready" ? (
          <div className="mt-2">
            <RetryButton onRetry={reload} label="刷新余额" />
          </div>
        ) : null}
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3">
        <p className="mb-2 text-[12px] font-semibold">充值</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => {
            const active = amount === String(preset);
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setAmount(String(preset));
                  setFieldError(null);
                }}
                className={[
                  "h-7 rounded-full border px-2.5 text-[11px] tabular-nums transition-colors",
                  active
                    ? "border-[var(--neutral-8)] bg-[var(--neutral-3)] font-medium"
                    : "border-[var(--neutral-6)] text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]",
                ].join(" ")}
              >
                +{preset}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <Input
              label={`金额 (${currency})`}
              id="topup-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setFieldError(null);
              }}
              {...(fieldError ? { error: fieldError } : {})}
            />
          </div>
          <Button
            type="button"
            variant="ink"
            size="sm"
            className="h-9"
            disabled={submitting}
            onClick={() => void topUp()}
          >
            {submitting ? "处理中…" : "充值"}
          </Button>
        </div>
        {outcome ? (
          <p
            role={outcome.tone === "error" ? "alert" : "status"}
            className={[
              "mt-2 rounded-[var(--radius-md)] border px-2.5 py-1.5 text-[12px]",
              outcome.tone === "error"
                ? "border-[color-mix(in_srgb,var(--status-danger)_35%,var(--neutral-6))] bg-[color-mix(in_srgb,var(--status-danger)_8%,var(--neutral-1))] text-[var(--status-danger)]"
                : "border-[color-mix(in_srgb,var(--status-success)_35%,var(--neutral-6))] bg-[color-mix(in_srgb,var(--status-success)_8%,var(--neutral-1))] text-[var(--status-success)]",
            ].join(" ")}
          >
            {outcome.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
