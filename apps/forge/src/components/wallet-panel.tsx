"use client";

import { useCallback, useEffect, useState } from "react";

export function WalletPanel() {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/wallet?tenantId=demo");
    const data = (await res.json()) as { balance: number; currency: string };
    setBalance(data.balance);
    setCurrency(data.currency);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const topUp = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "demo", amount: Number(amount) }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        setMessage(data.error ?? data.message ?? "top-up failed");
      } else {
        setMessage(data.message ?? "ok");
        await refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted p-5">
      <div>
        <p className="text-sm text-muted-foreground">当前余额（tenant: demo）</p>
        <p className="text-3xl font-semibold tabular-nums">
          {balance === null ? "…" : balance}{" "}
          <span className="text-base font-normal text-muted-foreground">{currency}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          充值金额
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-32 rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void topUp()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "处理中…" : "Mock 充值"}
        </button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
