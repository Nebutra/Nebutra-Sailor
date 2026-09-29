"use client";

import { Button } from "@nebutra/ui/primitives";
import { useState } from "react";
import { runContractAction } from "@/lib/admin-platform/server-actions";

/**
 * One click: push CLIProxyAPI's live model list into its New-API channel.
 *
 * NOT WIRED INTO ANY PAGE IN THE ORIGINAL — carried over as-is.
 *
 * In apps/admin this component was never imported anywhere (`grep -rn
 * SupplySyncButton apps/admin/src` had one hit: its own definition). It also
 * fetched `/api/supply/sync-channel`, a route that never existed in that app
 * either. The Supply page's actual sync control is `channel.sync` rendered
 * generically through <ActionButton> (see supply/page.tsx). Ported here for
 * completeness per the migration's scope, and repointed at the same
 * `channel.sync` manifest action via the `runContractAction` Server Action
 * (mode: "apply", no plan) so it is at least reachable if something starts
 * rendering it — but it still bypasses the plan → review → apply flow every
 * other write on this console goes through. Prefer <ActionButton
 * serviceId="@nebutra/router" actionId="channel.sync" /> instead.
 */
export function SupplySyncButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const sync = async () => {
    setBusy(true);
    setResult("");
    try {
      const res = await runContractAction({
        serviceId: "@nebutra/router",
        actionId: "channel.sync",
        mode: "apply",
      });
      if (!res.ok) {
        setResult(`失败：${res.error.message}`);
        return;
      }
      const data = res.data as { action?: "created" | "updated"; models?: string[] };
      setResult(
        `渠道已${data.action === "created" ? "创建" : "更新"}，${data.models?.length ?? 0} 个模型：${(data.models ?? []).join(", ")}`,
      );
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
