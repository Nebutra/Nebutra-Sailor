"use client";

import { Button } from "@nebutra/ui/primitives";

import { useState } from "react";

export function UuidRunner({ toolId }: { toolId: string }) {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const local = () => {
    setError("");
    const list = Array.from({ length: count }, () => crypto.randomUUID());
    setUuids(list);
  };

  const server = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { count } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: { uuids?: string[] };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? "error");
        return;
      }
      setUuids(body.output?.uuids ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        数量
        <input
          data-allow-native
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-20 rounded border border-border bg-background px-2 py-1"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={local}>
          本地生成 (crypto.randomUUID)
        </Button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void server()}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          服务端生成
        </button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(uuids.join("\n"))}
        >
          复制全部
        </Button>
      </div>
      {error ? (
        <pre className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </pre>
      ) : null}
      {uuids.length > 0 ? (
        <ul className="space-y-1 font-mono text-sm">
          {uuids.map((id) => (
            <li key={id} className="rounded border border-border bg-background px-3 py-2">
              {id}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
