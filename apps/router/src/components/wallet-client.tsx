"use client";

import { Card } from "@nebutra/ui/layout";
import { Badge, Button, Input } from "@nebutra/ui/primitives";
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
    <Card className="space-y-6 border-border/80 p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          当前余额
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
          {balance === null ? "…" : balance}
          <span className="ml-2 text-base font-medium text-muted-foreground">{currency}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setAmount(String(n))}
            className="inline-flex"
          >
            <Badge
              variant={amount === String(n) ? "blue-subtle" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
            >
              +{n}
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Input
            label="金额"
            id="topup-amount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button type="button" variant="ink" disabled={loading} onClick={() => void topUp()}>
          Mock 充值
        </Button>
      </div>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      <p className="text-xs text-muted-foreground">
        Demo 账本内存态；生产写入 Nebutra prepaid wallet 同一真相源。
      </p>
    </Card>
  );
}
