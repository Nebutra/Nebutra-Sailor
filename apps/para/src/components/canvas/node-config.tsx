"use client";

import { ChevronDown } from "@nebutra/icons";
import { Input, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { useState } from "react";
import type { GeneratorMode, WorkspaceNode } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";

const MODES: GeneratorMode[] = ["image", "video", "text", "audio"];
const MODELS = ["Auto", "Seedance 2.5", "Kling 3", "Nano Banana 2", "GPT Image 2"];
const COST: Record<GeneratorMode, number> = { image: 1, video: 7, text: 0, audio: 2 };

/**
 * Generator config anchored under the selected node (A — Seko under, TapNow inside, LibTV on, Lovart generator node).
 * Tier 1 row: mode · model · summary chip · @ · count · cost · Generate. Tier 3 params live in an "Advanced" popover (B).
 * This replaces the Inspector drawer, which no competitor has.
 */
export function NodeConfig({ node }: { node: WorkspaceNode }) {
  const updateGenerator = useEditorStore((s) => s.updateGenerator);
  const derive = useEditorStore((s) => s.derive);
  const enqueue = useJobsStore((s) => s.enqueue);
  const [prompt, setPrompt] = useState(node.generator?.prompt ?? "");

  const g = node.generator ?? {
    mode: node.type === "text" ? "text" : node.type,
    model: "Auto",
    count: 1 as const,
  };
  const mode = g.mode;
  const count = g.count ?? 1;
  const est = COST[mode] * count;
  const busy = node.status === "queued" || node.status === "running";

  const generate = () => {
    if (busy) return;
    updateGenerator(node.id, { prompt });
    const fresh = node.status === "empty" || node.status === "configured";
    if (fresh) {
      // First generation fills the node in place (A).
      enqueue(node.id, `Generate · ${node.id}`, est);
      return;
    }
    // Any later generation derives a child (A).
    const id = derive({
      sourceId: node.id,
      mode: mode === "text" ? "image" : mode,
      prompt,
      createdBy: "user",
    });
    if (id) enqueue(id, `Generate · ${node.id}`, est);
  };

  const chip =
    "flex h-7 items-center gap-1 rounded-md px-2 text-xs text-foreground hover:bg-accent";

  return (
    <div className="para-rise flex w-[420px] flex-col gap-1.5 rounded-xl border border-border/70 bg-card/95 p-2 shadow-ambient-md backdrop-blur-md">
      <div className="flex items-center gap-0.5">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip} aria-label="Mode">
              <span className="capitalize">{mode}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-32 p-1">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateGenerator(node.id, { mode: m })}
                className="flex h-7 w-full items-center rounded-md px-2 text-xs capitalize hover:bg-accent"
              >
                {m}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip} aria-label="Model">
              {g.model ?? "Auto"}
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            {MODELS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateGenerator(node.id, { model: m })}
                className="flex h-7 w-full items-center rounded-md px-2 text-xs hover:bg-accent"
              >
                {m}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <span className="rounded-md bg-neutral-3 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {String(g.params?.ratio ?? "16:9")} · {String(g.params?.resolution ?? "1K")}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => updateGenerator(node.id, { count: count === 1 ? 2 : count === 2 ? 4 : 1 })}
          className={chip}
          aria-label="Count"
        >
          {count}×
        </button>
        <span className="px-1.5 text-muted-foreground text-xs tabular-nums">✦{est}</span>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip}>
              Advanced
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3">
            <div className="mb-1.5 font-medium text-foreground text-xs">Advanced</div>
            {[
              ["Ratio", "16:9"],
              ["Resolution", "1K"],
              ["Seed", "—"],
              ["Steps", "—"],
              ["Reference weight", "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5 text-xs">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-foreground">{v}</span>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={`${chip} text-muted-foreground`}
          aria-label="Mention subject or asset"
        >
          @
        </button>
        <Input
          size="sm"
          aria-label="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              generate();
            }
            e.stopPropagation();
          }}
          placeholder={mode === "text" ? "Write…" : "Describe the change…"}
          className="flex-1"
        />
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="h-8 rounded-md bg-primary px-3 font-medium text-primary-foreground text-xs disabled:opacity-40"
        >
          Generate
        </button>
      </div>
    </div>
  );
}
