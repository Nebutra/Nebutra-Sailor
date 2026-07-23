"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useCallback, useEffect, useState } from "react";
import { RunnerNote, RunnerPanel } from "@/components/runner-ui";

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
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
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
    <RunnerPanel className="space-y-4 !p-5">
      <div>
        <p className="text-sm text-[var(--neutral-10)]">当前余额（tenant: demo）</p>
        <p className="text-3xl font-semibold tabular-nums">
          {balance === null ? "…" : balance}{" "}
          <span className="text-base font-normal text-[var(--neutral-11)]">{currency}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="充值金额"
          id="wallet-amount"
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
        <Button type="button" variant="ink" disabled={loading} onClick={() => void topUp()}>
          {loading ? "处理中…" : "Mock 充值"}
        </Button>
      </div>
      <RunnerNote>{message}</RunnerNote>
    </RunnerPanel>
  );
}
