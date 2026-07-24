"use client";
import { buildAuthCenterSignInUrl, useAuth } from "@nebutra/auth/client";
import { Button, Input } from "@nebutra/ui/primitives";
import { useCallback, useEffect, useState } from "react";
import { RunnerNote, RunnerPanel } from "@/components/runner-ui";

export function WalletPanel() {
  const { isSignedIn, isLoaded, user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [tenantId, setTenantId] = useState("anonymous");
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/wallet", { credentials: "include" });
    const data = (await res.json()) as { balance: number; currency: string; tenantId?: string };
    setBalance(data.balance);
    setCurrency(data.currency);
    if (data.tenantId) setTenantId(data.tenantId);
  }, []);
  useEffect(() => {
    if (isLoaded) void refresh();
  }, [isLoaded, isSignedIn, refresh]);
  if (isLoaded && !isSignedIn) {
    return (
      <RunnerPanel className="space-y-4 !p-5">
        <p className="text-sm text-[var(--neutral-11)]">
          登录后绑定钱包（@nebutra/auth · Better Auth）。
        </p>
        <Button asChild variant="ink">
          <a
            href={buildAuthCenterSignInUrl(
              typeof window !== "undefined" ? window.location.href : undefined,
            )}
          >
            登录后充值
          </a>
        </Button>
      </RunnerPanel>
    );
  }
  return (
    <RunnerPanel className="space-y-4 !p-5">
      <p className="text-sm text-[var(--neutral-10)]">
        tenant: <span className="font-mono text-[12px]">{tenantId}</span>
        {user?.email ? ` · ${user.email}` : ""}
      </p>
      <p className="text-3xl font-semibold tabular-nums">
        {balance === null ? "…" : balance} <span className="text-base font-normal">{currency}</span>
      </p>
      <div className="flex gap-3">
        <Input
          id="wallet-amount"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32"
        />
        <Button
          type="button"
          variant="ink"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setMessage("");
            try {
              const res = await fetch("/api/v1/wallet/topup", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: Number(amount) }),
              });
              const data = (await res.json()) as { message?: string; error?: string };
              setMessage(data.error ?? data.message ?? "");
              if (res.ok) await refresh();
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "…" : "Mock 充值"}
        </Button>
      </div>
      <RunnerNote>{message}</RunnerNote>
    </RunnerPanel>
  );
}
