"use client";

import { Button, Textarea } from "@nebutra/ui/primitives";
import { useState } from "react";
import { RunnerError, RunnerNote, RunnerOutput } from "@/components/runner-ui";

export function TextDiffRunner({ toolId }: { toolId: string }) {
  const [left, setLeft] = useState("alpha\nbeta\ngamma");
  const [right, setRight] = useState("alpha\nBETA\ngamma");
  const [patch, setPatch] = useState("");
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/tools/invoke/${toolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { left, right, context: 3 } }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        output?: {
          patch?: string;
          addedLines?: number;
          removedLines?: number;
          engine?: string;
        };
        message?: string;
      };
      if (!res.ok || body.ok === false) {
        setError(body.message ?? `HTTP ${res.status}`);
        return;
      }
      setPatch(body.output?.patch ?? "");
      setMeta(
        `+${body.output?.addedLines ?? 0} / -${body.output?.removedLines ?? 0} · ${body.output?.engine ?? "diff"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Textarea
          label="左侧"
          id="diff-left"
          value={left}
          onChange={(e) => setLeft(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />
        <Textarea
          label="右侧"
          id="diff-right"
          value={right}
          onChange={(e) => setRight(e.target.value)}
          rows={12}
          className="font-mono text-sm"
        />
      </div>
      <Button type="button" variant="ink" disabled={loading} onClick={() => void run()}>
        {loading ? "对比中…" : "对比"}
      </Button>
      <RunnerNote>{meta}</RunnerNote>
      <RunnerError>{error}</RunnerError>
      <RunnerOutput className="max-h-96 text-xs">{patch}</RunnerOutput>
    </div>
  );
}
