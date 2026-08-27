"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useCallback, useEffect, useState } from "react";

const PRESETS = [5, 10, 25, 50, 100];

export function WalletClient() {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("10");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/wallet");
    const data = (await res.json()) as { balance: number; currency: string };
    setBalance(data.balance);
    setCurrency(data.currency);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const topUp = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/v1/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      setMsg(data.message ?? data.error ?? "");
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,16rem)_1fr]">
      <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3">
        <p className="text-[11px] text-[var(--neutral-10)]">当前余额</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
          {balance === null ? "…" : balance}
          <span className="ml-1.5 text-sm font-medium text-[var(--neutral-10)]">{currency}</span>
        </p>
        <p className="mt-2 text-[11px] leading-snug text-[var(--neutral-10)]">
          Demo 内存账本 · 生产写入 prepaid-wallet
        </p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3">
        <p className="mb-2 text-[12px] font-semibold">Mock 充值</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className={[
                "h-7 rounded-full border px-2.5 text-[11px] tabular-nums transition-colors",
                amount === String(n)
                  ? "border-[var(--neutral-8)] bg-[var(--neutral-3)] font-medium"
                  : "border-[var(--neutral-6)] text-[var(--neutral-11)] hover:bg-[var(--neutral-2)]",
              ].join(" ")}
            >
              +{n}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <Input
              label="金额"
              id="topup-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ink"
            size="sm"
            className="h-9"
            disabled={loading}
            onClick={() => void topUp()}
          >
            {loading ? "处理中…" : "充值"}
          </Button>
        </div>
        {msg ? <p className="mt-2 text-[12px] text-[var(--neutral-11)]">{msg}</p> : null}
      </div>
    </div>
  );
}
