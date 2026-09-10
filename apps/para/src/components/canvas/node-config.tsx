"use client";

import { ChevronDown } from "@nebutra/icons";
import { Input, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { MODELS_BY_MODE } from "@/domain/models";
import type { GeneratorMode, WorkspaceNode } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";

const MODES: GeneratorMode[] = ["image", "video", "text", "audio"];

const COST: Record<GeneratorMode, number> = { image: 1, video: 7, text: 0, audio: 2 };

const RATIOS = ["16:9", "4:3", "1:1", "9:16"];
const RESOLUTIONS = ["1K", "2K", "4K"];
const COUNTS = [1, 2, 4] as const;

/**
 * One Advanced parameter: label, and the values it can take laid out in place.
 *
 * Deliberately not a nested Popover. A popover opened from inside a popover is the defect that
 * started this rewrite — the inner surface has no dependable relationship to the outer one, and the
 * list ends up drawn against the panel it belongs to. With two or three options per row, showing
 * them costs less space than a menu that has to escape its own container.
 */
function ParamRow({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-label text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            aria-pressed={o === value}
            className="rounded px-1.5 py-0.5 text-label text-muted-foreground hover:bg-accent aria-pressed:bg-accent aria-pressed:text-foreground"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Generator config anchored under the selected node (A — Seko under, TapNow inside, LibTV on, Lovart generator node).
 * Tier 1 row: mode · model · summary chip · @ · count · cost · Generate. Tier 3 params live in an "Advanced" popover (B).
 * This replaces the Inspector drawer, which no competitor has.
 */
export function NodeConfig({ node }: { node: WorkspaceNode }) {
  const updateGenerator = useEditorStore((s) => s.updateGenerator);
  const derive = useEditorStore((s) => s.derive);
  const enqueue = useJobsStore((s) => s.enqueue);

  const g = node.generator ?? {
    mode: node.type === "text" ? "text" : node.type,
    model: "Auto",
    count: 1 as const,
  };
  const mode = g.mode;
  const count = g.count ?? 1;
  const prompt = g.prompt ?? "";
  const est = COST[mode] * count;
  const busy = node.status === "queued" || node.status === "running";
  const ratio = String(g.params?.ratio ?? "16:9");
  const resolution = String(g.params?.resolution ?? "1K");

  const setParam = (key: string, value: string) =>
    updateGenerator(node.id, { params: { ...g.params, [key]: value } });

  const generate = () => {
    if (busy) return;
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
    "flex h-[var(--para-h-chip)] items-center gap-1 rounded-md px-2 text-label text-foreground hover:bg-accent";

  return (
    <div className="para-rise flex w-para-nodeconfig flex-col gap-1.5 rounded-xl border border-border bg-popover p-2 shadow-ambient-md">
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
                className="flex h-[var(--para-h-chip)] w-full items-center rounded-md px-2 text-label capitalize hover:bg-accent"
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
            {MODELS_BY_MODE[mode].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateGenerator(node.id, { model: m })}
                className="flex h-[var(--para-h-chip)] w-full items-center rounded-md px-2 text-label hover:bg-accent"
              >
                {m}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <span className="rounded-md bg-neutral-3 px-1.5 py-0.5 text-meta text-muted-foreground">
          {ratio} · {resolution}
        </span>
        <div className="flex-1" />
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip} aria-label="Output count">
              {count}×
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-24 p-1">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateGenerator(node.id, { count: c })}
                aria-pressed={c === count}
                className="flex h-[var(--para-h-chip)] w-full items-center rounded-md px-2 text-label hover:bg-accent aria-pressed:text-foreground"
              >
                {c}×
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <span className="px-1.5 text-muted-foreground text-label tabular-nums">✦{est}</span>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chip}>
              Advanced
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3">
            <div className="mb-1.5 font-medium text-foreground text-label">Advanced</div>
            <ParamRow
              label="Ratio"
              value={ratio}
              options={RATIOS}
              onPick={(v) => setParam("ratio", v)}
            />
            <ParamRow
              label="Resolution"
              value={resolution}
              options={RESOLUTIONS}
              onPick={(v) => setParam("resolution", v)}
            />
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
          onChange={(e) => updateGenerator(node.id, { prompt: e.target.value })}
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
          className="h-[var(--para-h-control)] rounded-md bg-primary px-3 font-medium text-primary-foreground text-label disabled:opacity-40"
        >
          Generate
        </button>
      </div>
    </div>
  );
}
