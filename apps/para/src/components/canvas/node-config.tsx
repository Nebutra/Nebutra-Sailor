"use client";

// @async-surface-exempt: reads assets only to draw reference thumbnails; a miss draws the chip without one.

import { ArrowUp, Check, ChevronDown, Cross, Lightning, Plus } from "@nebutra/icons";
import { Input, Popover, PopoverContent, PopoverTrigger, Textarea } from "@nebutra/ui/primitives";
import { useEffect, useRef } from "react";
import { Chip } from "@/components/ui/chip";
import { generationCost } from "@/domain/generation";
import { modelInfo, modelsFor } from "@/domain/models";
import { generatorOf, nodeTitle, sizeForAspect, upstreamNodes } from "@/domain/nodes";
import type { GeneratorMode, WorkspaceNode } from "@/domain/types";
import { useAssets } from "@/mock/queries";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";
import { useUiStore } from "@/stores/ui-store";

const COUNTS = [1, 2, 4] as const;

/** What the node does, named the way LibTV names it — derived from its wiring, not picked. */
function methodLabel(mode: GeneratorMode, hasImageInput: boolean): string {
  if (mode === "video") return hasImageInput ? "首帧生视频" : "文生视频";
  if (mode === "image") return hasImageInput ? "图生图" : "文生图";
  if (mode === "audio") return "音频生成";
  return "文本生成";
}

function OptionRow<T extends string | number>({
  label,
  value,
  options,
  format = String,
  onPick,
}: {
  label: string;
  value: T;
  options: readonly T[];
  format?: (v: T) => string;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label text-muted-foreground">{label}</span>
      <div className="grid grid-cols-5 gap-1">
        {options.map((o) => (
          <Chip
            key={String(o)}
            tone="outline"
            pressed={o === value}
            aria-pressed={o === value}
            onClick={() => onPick(o)}
            className="justify-center border-border/60 px-1 tabular-nums aria-pressed:border-foreground/40"
          >
            {format(o)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/**
 * The generator anchored under the selected node, laid out like LibTV's: references on top, the
 * prompt, then one row of tier-1 controls — method · model · a compact parameter summary · count ·
 * ⚡ cost · 生成. The summary opens 高级设置 (ratio, resolution, duration, negative prompt, seed).
 * Every option list comes from the selected model's capabilities (`modelsFor`), never from here.
 *
 * Generating fills the node in place; earlier outputs stay in the node's history and 生成历史.
 */
export function NodeConfig({ node, width }: { node: WorkspaceNode; width: number }) {
  const updateGenerator = useEditorStore((s) => s.updateGenerator);
  const setNodeSize = useEditorStore((s) => s.setNodeSize);
  const connect = useEditorStore((s) => s.connect);
  const deleteEdges = useEditorStore((s) => s.deleteEdges);
  const doc = useEditorStore((s) => s.document);
  const enqueue = useJobsStore((s) => s.enqueue);
  const cancel = useJobsStore((s) => s.cancel);
  const activeJob = useJobsStore((s) =>
    s.jobs.find((j) => j.nodeId === node.id && (j.status === "queued" || j.status === "running")),
  );
  const { data: assetList } = useAssets();
  const promptFocusNodeId = useUiStore((s) => s.promptFocusNodeId);
  const promptField = useRef<HTMLTextAreaElement>(null);

  // A node created from a menu, a template or a Home tile lands here with the prompt next.
  useEffect(() => {
    if (promptFocusNodeId !== node.id) return;
    promptField.current?.focus();
    useUiStore.getState().setPromptFocus(null);
  }, [promptFocusNodeId, node.id]);

  const g = generatorOf(node);
  const mode = g.mode;
  const model = modelInfo(mode, g.model);
  const count = g.count ?? 1;
  const prompt = g.prompt ?? "";
  const params = g.params ?? {};
  const aspect = String(params.aspect ?? model.aspects?.[0] ?? "16:9");
  const resolution = String(params.resolution ?? model.resolutions?.[0] ?? "");
  const duration =
    typeof params.duration === "number"
      ? params.duration
      : (model.defaultDuration ?? model.durations?.[0] ?? 5);
  // Video is priced per second of the chosen model at the chosen resolution — the gateway snaps
  // and charges from the same table, so this is the number that will leave the wallet.
  const est = generationCost(mode, count, {
    model: g.model,
    durationSeconds: duration,
    resolution,
  });
  const busy = node.status === "queued" || node.status === "running";
  const isMedia = mode === "image" || mode === "video";

  const upstream = doc ? upstreamNodes(doc, node.id) : [];
  const urlOf = (n: WorkspaceNode) =>
    n.type !== "text" && n.assetId ? assetList?.find((a) => a.id === n.assetId)?.url : undefined;
  const imageInputs = upstream.filter((n) => n.type === "image");
  const candidates = Object.values(doc?.nodes ?? {}).filter(
    (n) => n.id !== node.id && n.type === "image" && !upstream.includes(n) && urlOf(n),
  );

  const setParam = (key: string, value: unknown) =>
    updateGenerator(node.id, { params: { ...params, [key]: value } });

  const pickAspect = (a: string) => {
    setParam("aspect", a);
    if (node.type === "image" || node.type === "video") {
      const size = sizeForAspect(node.type, a);
      setNodeSize(node.id, size.width, size.height);
    }
  };

  const unwire = (sourceId: string) => {
    const ids = Object.values(doc?.edges ?? {})
      .filter((e) => e.source === sourceId && e.target === node.id)
      .map((e) => e.id);
    deleteEdges(ids);
  };

  const generate = () => {
    if (busy) return;
    if (!prompt.trim() && imageInputs.length === 0) {
      promptField.current?.focus();
      return;
    }
    enqueue(node.id, `${nodeTitle(node)} · ${methodLabel(mode, imageInputs.length > 0)}`, est);
  };

  const summary = [
    isMedia ? aspect : null,
    resolution || null,
    mode === "video" ? `${duration}s` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      style={{ width }}
      className="para-rise flex flex-col gap-2 rounded-2xl border border-border/70 bg-popover p-3 shadow-ambient-lg"
    >
      {isMedia && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Chip tone="outline" className="border-border/60 text-muted-foreground">
                <Plus className="size-3" />
                参考
              </Chip>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <div className="mb-2 text-foreground text-label">从画布选择参考图</div>
              {candidates.length === 0 ? (
                <p className="text-label text-muted-foreground">
                  画布上还没有生成好的图片。也可以把图片节点右侧的 + 拖到这里连线。
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {candidates.map((c) => (
                    <Chip
                      key={c.id}
                      aria-label={`引用 ${nodeTitle(c)}`}
                      onClick={() => connect(c.id, node.id)}
                      className="aspect-square h-auto overflow-hidden p-0"
                    >
                      <img src={urlOf(c)} alt="" className="h-full w-full object-cover" />
                    </Chip>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
          {upstream
            .filter((n) => n.type !== "text")
            .map((n, i) => {
              const url = urlOf(n);
              return (
                <span
                  key={n.id}
                  className="group/ref relative size-12 overflow-hidden rounded-lg border border-border/60 bg-neutral-3"
                  title={nodeTitle(n)}
                >
                  {url ? (
                    <img src={url} alt={nodeTitle(n)} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-meta text-muted-foreground">
                      {nodeTitle(n)}
                    </span>
                  )}
                  <span className="absolute top-0.5 left-0.5 flex size-4 items-center justify-center rounded-sm bg-background/80 text-meta text-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <Chip
                    aria-label={`移除参考 ${nodeTitle(n)}`}
                    onClick={() => unwire(n.id)}
                    className="absolute top-0.5 right-0.5 size-4 h-4 justify-center rounded-sm bg-background/80 p-0 opacity-0 group-hover/ref:opacity-100"
                  >
                    <Cross className="size-2.5" />
                  </Chip>
                </span>
              );
            })}
        </div>
      )}

      <Textarea
        ref={promptField}
        tone="bare"
        rows={3}
        aria-label="提示词"
        value={prompt}
        onChange={(e) => updateGenerator(node.id, { prompt: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            generate();
          }
          e.stopPropagation();
        }}
        placeholder={
          mode === "text"
            ? "描述你想写的内容，例如：一个关于归乡的 60 秒短片脚本"
            : mode === "video"
              ? "描述你想要生成的画面内容和镜头运动，@引用素材"
              : "描述你想要生成的画面内容，@引用素材"
        }
        className="min-h-20 resize-none px-1 py-1 text-body"
      />

      <div className="flex items-center gap-1">
        <span className="flex h-[var(--para-h-chip)] items-center rounded-md px-2 text-label text-muted-foreground">
          {methodLabel(mode, imageInputs.length > 0)}
        </span>

        <Popover>
          <PopoverTrigger asChild>
            <Chip aria-label="模型">
              {model.label}
              {model.tag && (
                <span className="rounded-sm bg-accent px-1 text-meta text-muted-foreground">
                  {model.tag}
                </span>
              )}
              <ChevronDown className="size-3 text-muted-foreground" />
            </Chip>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1.5">
            <div className="px-2 pt-1 pb-1.5 text-meta text-muted-foreground">选择模型</div>
            {modelsFor(mode).map((m) => (
              <Chip
                key={m.id}
                size="row"
                disabled={!m.live}
                aria-pressed={m.id === model.id}
                onClick={() => updateGenerator(node.id, { model: m.id })}
                className="h-9 gap-2"
              >
                <span className="text-body">{m.label}</span>
                {m.tag && (
                  <span className="rounded-sm bg-accent px-1 text-meta text-muted-foreground">
                    {m.tag}
                  </span>
                )}
                <span className="flex-1" />
                {!m.live ? (
                  <span className="text-meta text-muted-foreground">即将上线</span>
                ) : m.id === model.id ? (
                  <Check className="size-3.5 text-foreground" />
                ) : null}
              </Chip>
            ))}
          </PopoverContent>
        </Popover>

        {summary && (
          <Popover>
            <PopoverTrigger asChild>
              <Chip tone="muted" aria-label="高级设置" className="tabular-nums">
                {summary}
                <ChevronDown className="size-3" />
              </Chip>
            </PopoverTrigger>
            <PopoverContent align="start" className="flex w-80 flex-col gap-3 p-4">
              <div className="font-medium text-body text-foreground">高级设置</div>
              {isMedia && model.aspects && (
                <OptionRow
                  label="比例"
                  value={aspect}
                  options={model.aspects}
                  onPick={pickAspect}
                />
              )}
              {model.resolutions && (
                <OptionRow
                  label="清晰度"
                  value={resolution}
                  options={model.resolutions}
                  onPick={(v) => setParam("resolution", v)}
                />
              )}
              {mode === "video" && model.durations && (
                <OptionRow
                  label="时长"
                  value={duration}
                  options={model.durations}
                  format={(v) => `${v}s`}
                  onPick={(v) => setParam("duration", v)}
                />
              )}
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-muted-foreground">负面提示词</span>
                <Input
                  size="sm"
                  aria-label="负面提示词"
                  placeholder="不希望出现的内容"
                  value={String(params.negative_prompt ?? "")}
                  onChange={(e) => setParam("negative_prompt", e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-muted-foreground">随机种子</span>
                <Input
                  size="sm"
                  inputMode="numeric"
                  aria-label="随机种子"
                  placeholder="留空则随机"
                  value={params.seed === undefined ? "" : String(params.seed)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setParam("seed", v ? Number(v) : undefined);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}

        {mode !== "text" && (
          <Popover>
            <PopoverTrigger asChild>
              <Chip tone="muted" aria-label="生成数量">
                {count}个
                <ChevronDown className="size-3" />
              </Chip>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-28 p-1">
              {COUNTS.map((c) => (
                <Chip
                  key={c}
                  size="row"
                  pressed={c === count}
                  aria-pressed={c === count}
                  onClick={() => updateGenerator(node.id, { count: c })}
                >
                  {c}个
                </Chip>
              ))}
            </PopoverContent>
          </Popover>
        )}

        <div className="flex-1" />
        <span className="flex items-center gap-0.5 px-1.5 text-label text-muted-foreground tabular-nums">
          <Lightning aria-hidden="true" className="size-3" />
          {est}
        </span>
        {busy ? (
          <Chip tone="outline" onClick={() => activeJob && cancel(activeJob.id)}>
            {node.status === "queued" ? "取消" : "停止"}
          </Chip>
        ) : (
          <Chip
            tone="primary"
            aria-label="生成"
            title="生成（⌘ Enter）"
            onClick={generate}
            className="size-8 h-8 justify-center rounded-full p-0"
          >
            <ArrowUp className="size-4" />
          </Chip>
        )}
      </div>
    </div>
  );
}
