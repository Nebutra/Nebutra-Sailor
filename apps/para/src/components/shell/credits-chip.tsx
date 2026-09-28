"use client";

import { Lightning } from "@nebutra/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GATEWAY_URL, isGatewayMode } from "@/lib/gateway-api";

/**
 * The organization's PARA credits, always in view — LibTV shows ⚡ 积分 in every header
 * (ADR 2026-09-27). Opens 积分充值 on the plans page. Hidden when there is no payment API to ask,
 * rather than showing a number that is not real.
 */
export function CreditsChip() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!isGatewayMode) return;
    const controller = new AbortController();
    fetch(`${GATEWAY_URL}/api/v1/billing/credits/balance?product=para`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<{ balance: number }>) : null))
      .then((body) => {
        if (body && typeof body.balance === "number") setBalance(body.balance);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (balance === null) return null;
  return (
    <Link
      href="/pro#packs"
      aria-label={`积分余额 ${balance}，去充值`}
      className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-body text-foreground transition-colors hover:bg-accent"
    >
      <Lightning className="size-3.5 text-brand-accent" />
      <span className="tabular-nums">{balance.toLocaleString("zh-CN")}</span>
    </Link>
  );
}
