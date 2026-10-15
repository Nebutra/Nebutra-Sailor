"use client";

import { Button } from "@nebutra/ui/primitives";
import { useState } from "react";

interface SyncResponse {
  action?: "created" | "updated";
  models?: string[];
  error?: string;
}

/** One click: push CLIProxyAPI's live model list into its New-API channel. */
export function SupplySyncButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const sync = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/supply/sync-channel", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      if (data.error) {
        setResult({ ok: false, text: `Sync failed: ${data.error}` });
      } else {
        const models = data.models ?? [];
        setResult({
          ok: true,
          text: `Channel ${data.action === "created" ? "created" : "updated"} with ${models.length} ${models.length === 1 ? "model" : "models"}: ${models.join(", ")}`,
        });
      }
    } catch (error) {
      setResult({
        ok: false,
        text: `Sync failed: ${error instanceof Error ? error.message : "network error"}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="ink" size="sm" loading={busy} onClick={() => void sync()}>
        {busy ? "Syncing…" : "Sync models to the New-API channel"}
      </Button>
      <p
        role={result && !result.ok ? "alert" : "status"}
        className={
          result?.ok === false ? "text-destructive-strong text-xs" : "text-neutral-11 text-xs"
        }
      >
        {result?.text}
      </p>
    </div>
  );
}
