"use client";

import { Card } from "@nebutra/ui/layout";
import { Badge, Button, Input } from "@nebutra/ui/primitives";
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
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 border-border/80 p-5">
        <div className="min-w-[12rem] flex-1">
          <Input
            label="Key 名称"
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="default"
          />
        </div>
        <Button type="button" variant="ink" disabled={loading} onClick={() => void create()}>
          创建 Key
        </Button>
      </Card>

      {once ? (
        <Card className="border-[color-mix(in_srgb,var(--status-warning)_40%,hsl(var(--border)))] bg-[color-mix(in_srgb,var(--status-warning)_8%,hsl(var(--background)))] p-5">
          <p className="font-semibold">请立即保存（仅显示一次）</p>
          <pre className="mt-3 overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-background p-3 font-mono text-xs">
            {once}
          </pre>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void navigator.clipboard.writeText(once)}
          >
            复制完整密钥
          </Button>
        </Card>
      ) : null}

      <Card className="divide-y divide-border overflow-hidden border-border/80 p-0">
        {keys.map((k) => (
          <div key={k.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{k.keyPrefix}…</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date(k.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {k.scopes.map((s) => (
                <Badge key={s} variant="gray-subtle" className="font-mono text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        {keys.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            还没有 Key，创建一把开始调用。
          </div>
        ) : null}
      </Card>
    </div>
  );
}
