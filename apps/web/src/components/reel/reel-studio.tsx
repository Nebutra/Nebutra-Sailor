"use client";

/**
 * Reel studio surface (demo).
 *
 * A thin renderer of a typed node graph: nodes are drawn at their server
 * coordinates, edges as connectors, and each gen node shows the image carried
 * in its NODE_IO_ENVELOPE. The server owns the graph + envelopes (this is the
 * absorbed product's substance); the client only visualizes. Production swaps
 * in a real graph editor without changing the server contract.
 */

import { Sparkles } from "@nebutra/icons";
import type { ReelGraph } from "@nebutra/reel";
import { AnimateIn } from "@nebutra/ui/components";
import { Button, Textarea, toast } from "@nebutra/ui/primitives";
import { useCallback, useState } from "react";

const SCALE = 0.5;

interface ReelStudioProps {
  readonly graphId: string;
}

export function ReelStudio({ graphId }: ReelStudioProps) {
  const [graph, setGraph] = useState<ReelGraph | null>(null);
  const [script, setScript] = useState(
    "Wide shot of a neon city at dusk\nClose on a detective's tired eyes\nRain hammering an empty alley",
  );
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    const value = script.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reel/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graphId, script: value }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: { graph: ReelGraph | null };
      };
      if (!res.ok || !json.success || !json.data?.graph) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      setGraph(json.data.graph);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reel run failed");
    } finally {
      setBusy(false);
    }
  }, [script, busy, graphId]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
      <div className="relative h-[560px] overflow-auto rounded-lg border border-neutral-7 bg-neutral-2">
        {!graph ? (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-11">
            <p className="text-sm">Split a script — the server builds a typed node graph here.</p>
          </div>
        ) : (
          graph.nodes.map((node) => {
            const img = node.output?.media.find((m) => m.type === "image");
            return (
              <div
                key={node.id}
                className="absolute w-[260px] rounded-md border border-neutral-7 bg-neutral-1 p-3 shadow-sm"
                style={{ left: node.x * SCALE + 16, top: node.y * SCALE + 16 }}
              >
                <p className="mb-1 font-medium text-neutral-12 text-xs">
                  {node.type}
                  <span className="ml-2 text-neutral-11">{node.id}</span>
                </p>
                {img ? (
                  <img
                    src={img.url}
                    alt={node.output?.text[0] ?? "generated"}
                    className="w-full rounded border border-neutral-7"
                  />
                ) : (
                  <p className="text-neutral-11 text-xs">
                    {String(node.settings.prompt ?? node.settings.script ?? "—")}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <AnimateIn preset="fade">
        <div className="flex h-full flex-col gap-3 rounded-lg border border-neutral-7 bg-neutral-1 p-4">
          <h2 className="font-semibold text-neutral-12 text-sm">Script</h2>
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="One shot per line…"
            rows={6}
            disabled={busy}
          />
          <Button type="button" onClick={run} disabled={busy || !script.trim()}>
            <Sparkles className="mr-2 h-4 w-4" />
            {busy ? "Building…" : "Split & generate"}
          </Button>
          <p className="mt-auto text-neutral-11 text-xs">
            Mock provider — no AI key. Each shot becomes a typed node; output flows through
            NODE_IO_ENVELOPE v1.0 and is persisted server-side before this panel is told.
          </p>
        </div>
      </AnimateIn>
    </div>
  );
}
