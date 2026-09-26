"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { chipClass } from "@/components/ui/chip";
import { GATEWAY_URL, isGatewayMode } from "@/lib/gateway-api";

/**
 * The organization's PARA credits, always in view — LibTV shows 积分 in every
 * header (ADR 2026-09-27). Opens Plans & credits. Hidden when there is no
 * payment API to ask, rather than showing a number that is not real.
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
    <Link href="/pro" className={chipClass({ tone: "muted" })} aria-label="Credits">
      <span className="tabular-nums">{balance.toLocaleString("en-US")}</span> credits
    </Link>
  );
}
