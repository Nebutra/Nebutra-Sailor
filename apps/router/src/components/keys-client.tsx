"use client";

import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nebutra/ui/primitives";
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
        <Table bare className="w-full min-w-[560px] text-[12px]">
          <TableHeader>
            <TableRow className="bg-[var(--neutral-2)]/50 text-[11px] text-[var(--neutral-10)]">
              <TableHead alignment="start" className="font-medium">
                名称
              </TableHead>
              <TableHead alignment="start" className="font-medium">
                prefix
              </TableHead>
              <TableHead alignment="start" className="font-medium">
                scopes
              </TableHead>
              <TableHead alignment="start" className="font-medium">
                创建时间
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody bordered>
            {keys.map((k) => (
              <TableRow key={k.id} className="hover:bg-[var(--neutral-2)]/40">
                <TableCell alignment="start" className="font-medium">
                  {k.name}
                </TableCell>
                <TableCell
                  alignment="start"
                  className="font-mono text-[11px] text-[var(--neutral-11)]"
                >
                  {k.keyPrefix}…
                </TableCell>
                <TableCell
                  alignment="start"
                  className="font-mono text-[10px] text-[var(--neutral-10)]"
                >
                  {k.scopes.join(" ")}
                </TableCell>
                <TableCell
                  alignment="start"
                  className="tabular-nums text-[11px] text-[var(--neutral-10)]"
                >
                  {new Date(k.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {keys.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  alignment="center"
                  className="py-6 text-[12px] text-[var(--neutral-10)]"
                >
                  还没有 Key
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
