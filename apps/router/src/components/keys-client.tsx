"use client";

import { Button, Input } from "@nebutra/ui/primitives";
import { useCallback, useEffect, useState } from "react";

interface KeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
}

export function KeysClient() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("default");
  const [once, setOnce] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/v1/keys");
    const data = (await res.json()) as { keys: KeyRow[] };
    setKeys(data.keys);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async () => {
    setLoading(true);
    setOnce("");
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { fullKey?: string; error?: string };
      if (data.fullKey) setOnce(data.fullKey);
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-6)] p-3">
        <div className="min-w-[10rem] flex-1">
          <Input
            label="名称"
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="default"
          />
        </div>
        <Button
          type="button"
          variant="ink"
          size="sm"
          className="h-9"
          disabled={loading}
          onClick={() => void create()}
        >
          {loading ? "创建中…" : "创建 Key"}
        </Button>
      </div>

      {once ? (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--status-warning)_35%,var(--neutral-6))] bg-[color-mix(in_srgb,var(--status-warning)_8%,var(--neutral-1))] p-3">
          <p className="text-[12px] font-semibold">仅显示一次 · 请立即保存</p>
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-2 font-mono text-[11px]">
            {once}
          </pre>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7"
            onClick={() => void navigator.clipboard.writeText(once)}
          >
            复制
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-6)]">
        <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--neutral-6)] bg-[var(--neutral-2)]/50 text-[11px] text-[var(--neutral-10)]">
              <th className="px-3 py-1.5 font-medium">名称</th>
              <th className="px-3 py-1.5 font-medium">prefix</th>
              <th className="px-3 py-1.5 font-medium">scopes</th>
              <th className="px-3 py-1.5 font-medium">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr
                key={k.id}
                className="border-b border-[var(--neutral-6)] last:border-0 hover:bg-[var(--neutral-2)]/40"
              >
                <td className="px-3 py-1.5 font-medium">{k.name}</td>
                <td className="px-3 py-1.5 font-mono text-[11px] text-[var(--neutral-11)]">
                  {k.keyPrefix}…
                </td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-[var(--neutral-10)]">
                  {k.scopes.join(" ")}
                </td>
                <td className="px-3 py-1.5 tabular-nums text-[11px] text-[var(--neutral-10)]">
                  {new Date(k.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {keys.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-[12px] text-[var(--neutral-10)]"
                >
                  还没有 Key
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
