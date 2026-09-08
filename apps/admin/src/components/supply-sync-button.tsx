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
  const [result, setResult] = useState<string>("");

  const sync = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await fetch("/api/supply/sync-channel", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      if (data.error) {
        setResult(`失败：${data.error}`);
      } else {
        setResult(
          `渠道已${data.action === "created" ? "创建" : "更新"}，${data.models?.length ?? 0} 个模型：${(data.models ?? []).join(", ")}`,
        );
      }
    } catch (error) {
      setResult(`失败：${error instanceof Error ? error.message : "network"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="ink" size="sm" disabled={busy} onClick={() => void sync()}>
        {busy ? "同步中…" : "同步模型到 New-API 渠道"}
      </Button>
      {result ? <p className="text-neutral-11 text-xs">{result}</p> : null}
    </div>
  );
}
