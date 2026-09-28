"use client";

// @async-surface-exempt: reads assets only to put a thumbnail on a context chip; a miss renders the chip without one. The drawer is not a list surface.

import { ArrowUp, Cross, Plus, SidebarRight, Sparkles } from "@nebutra/icons";
import { Textarea } from "@nebutra/ui/primitives";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from "react";
import { NodeGlyph } from "@/components/canvas/node-glyph";
import { Chip } from "@/components/ui/chip";
import { nodeTitle } from "@/domain/nodes";
import type { AgentStep } from "@/domain/types";
import { type AgentRunState, type AgentTraceEvent, agentApi, followRun } from "@/lib/agent-api";
import { isGatewayMode } from "@/lib/gateway-api";
import { useAssets } from "@/mock/queries";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";
import { useUiStore } from "@/stores/ui-store";

const MOCK_PLAN: Array<Pick<AgentStep, "label" | "cost">> = [
  { label: "读取画布内容" },
  { label: "理解参考素材" },
  { label: "生成 4 个变体", cost: 4 },
  { label: "检查画面一致性" },
];

const SUGGESTIONS = [
  "把选中的图片做成 4 个不同光线的变体",
  "为这个故事写 6 个镜头的分镜",
  "用首帧生成一段 5 秒的推镜视频",
  "统一这组角色图的服装和发型",
];

/**
 * The Agent drawer, docked right and resizable like LibTV's. The selected nodes ride along as
 * context chips; a run's steps, approvals and cost appear above the composer.
 *
 * In gateway mode this panel owns no agent state: starting a turn queues a server run and the
 * panel attaches to its event stream, so closing it does not stop the turn and reopening replays
 * the trace. In standalone mode a local timer stands in for the run.
 */
export function AgentPanel({ projectId }: { projectId: string }) {
  const { data: assetList } = useAssets();
  const agent = useUiStore((s) => s.agent);
  const width = useUiStore((s) => s.agentWidth);
  const setWidth = useUiStore((s) => s.setAgentWidth);
  const setAgent = useUiStore((s) => s.setAgent);
  const removeContextNode = useUiStore((s) => s.removeContextNode);
  const resetAgent = useUiStore((s) => s.resetAgent);
  const setAgentOpen = useUiStore((s) => s.setAgentOpen);
  const newThread = useUiStore((s) => s.newThread);
  const nodes = useEditorStore((s) => s.document?.nodes);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const detach = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (agent.status === "idle") setAgent({ status: "composing" });
    if (agent.status === "composing" || agent.status === "idle") inputRef.current?.focus();
  }, [agent.status, setAgent]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      detach.current?.();
    },
    [],
  );

  /** Drag the left edge to resize; the width is clamped in the store. */
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const move = (ev: PointerEvent) => setWidth(startW + (startX - ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const applyRun = useCallback(
    (run: AgentRunState) => {
      setAgent({
        runId: run.id,
        runStatus: run.status,
        approvals: run.pendingApprovals ?? [],
        status: run.status === "completed" || run.status === "failed" ? "done" : "running",
      });
    },
    [setAgent],
  );

  /** Trace events become step-log rows; the server decides what happened, we only render it. */
  const applyTrace = useCallback(
    (event: AgentTraceEvent) => {
      const label = traceLabel(event);
      if (!label) return;
      const current = useUiStore.getState().agent.steps;
      const steps: AgentStep[] = [
        ...current.map((s) => ({ ...s, state: "done" as const })),
        { id: `s${current.length}`, label, state: "now" },
      ];
      setAgent({ steps });
    },
    [setAgent],
  );

  const newChat = () => {
    if (timer.current) clearInterval(timer.current);
    detach.current?.();
    detach.current = null;
    resetAgent();
    setAgent({ status: "composing" });
  };

  const stop = () => {
    if (isGatewayMode) {
      // A queued run belongs to the worker; detaching only stops watching it.
      detach.current?.();
      detach.current = null;
      setAgent({ status: "done" });
      return;
    }
    if (timer.current) clearInterval(timer.current);
    const { jobs, cancel } = useJobsStore.getState();
    for (const id of useUiStore.getState().agent.createdNodeIds) {
      const job = jobs.find(
        (x) => x.nodeId === id && (x.status === "queued" || x.status === "running"),
      );
      if (job) cancel(job.id);
    }
    setAgent({
      status: "done",
      steps: useUiStore
        .getState()
        .agent.steps.map((s) => (s.state === "now" ? { ...s, state: "done" } : s)),
    });
  };

  const decide = async (approvalId: string, approve: boolean) => {
    try {
      await agentApi.decideApproval(approvalId, approve);
      const runId = useUiStore.getState().agent.runId;
      if (!runId) return;
      // Approving resumes the run server-side; re-attach to watch it continue.
      detach.current?.();
      detach.current = followRun(runId, { onRun: applyRun, onTrace: applyTrace });
    } catch {
      const runId = useUiStore.getState().agent.runId;
      if (runId) void agentApi.getRun(runId).then(applyRun);
    }
  };

  const runGateway = async (prompt: string) => {
    setAgent({
      status: "running",
      steps: [],
      approvals: [],
      total: 0,
      done: 0,
      activityOpen: true,
    });
    try {
      const thread = agent.threadId
        ? { id: agent.threadId }
        : await agentApi.createThread(projectId, prompt);
      const workspaceId = useEditorStore.getState().documentId;
      if (!workspaceId) throw new Error("画布还没有加载完成");
      const run = await agentApi.startTurn(thread.id, {
        workspaceId,
        input: prompt,
        contextNodeIds: agent.contextNodeIds,
      });
      setAgent({ threadId: thread.id, runId: run.id, runStatus: run.status });
      detach.current = followRun(run.id, { onRun: applyRun, onTrace: applyTrace });
    } catch (e) {
      setAgent({
        status: "done",
        steps: [
          {
            id: "s-error",
            label: e instanceof Error ? e.message : "这次对话没能开始",
            state: "done",
          },
        ],
      });
    }
  };

  const runMock = (prompt: string) => {
    const thread = newThread(projectId, prompt);
    const steps: AgentStep[] = MOCK_PLAN.map((p, i) => ({
      id: `s${i}`,
      label: p.label,
      state: i === 0 ? "now" : "next",
      ...(p.cost ? { cost: p.cost } : {}),
    }));
    setAgent({
      status: "running",
      steps,
      total: 4,
      done: 0,
      createdNodeIds: [],
      threadId: thread.id,
      activityOpen: true,
    });
    const source = agent.contextNodeIds[0];
    let step = 0;
    timer.current = setInterval(() => {
      const a = useUiStore.getState().agent;
      if (a.status !== "running") return;
      step += 1;
      const next = a.steps.map(
        (s, i) => ({ ...s, state: i < step ? "done" : i === step ? "now" : "next" }) as AgentStep,
      );
      if (step === 2) {
        const editor = useEditorStore.getState();
        const src = source ? editor.document?.nodes[source] : undefined;
        const created: string[] = [];
        for (let i = 0; i < 4; i++) {
          const at = src
            ? { x: src.x + src.width + 96 + (i % 2) * 272, y: src.y + Math.floor(i / 2) * 180 }
            : { x: 1050, y: 270 + i * 186 };
          const id = editor.derive({
            ...(source ? { sourceId: source } : {}),
            mode: "image",
            prompt,
            createdBy: "agent",
            threadId: thread.id,
            at,
            size: { width: 240, height: 160 },
          });
          if (id) {
            created.push(id);
            useJobsStore.getState().enqueue(id, `Agent · 变体 ${i + 1}`, 1);
          }
        }
        setAgent({ steps: next, createdNodeIds: created, done: 0 });
        return;
      }
      if (step >= MOCK_PLAN.length) {
        if (timer.current) clearInterval(timer.current);
        setAgent({ steps: next.map((s) => ({ ...s, state: "done" })), status: "done" });
        return;
      }
      setAgent({ steps: next });
    }, 1400);
  };

  const run = () => {
    const prompt = agent.prompt.trim();
    if (!prompt) return;
    if (isGatewayMode) void runGateway(prompt);
    else runMock(prompt);
  };

  const doneCount = isGatewayMode
    ? agent.steps.filter((s) => s.state === "done").length
    : agent.createdNodeIds.filter(
        (id) => nodes?.[id]?.status === "completed" || nodes?.[id]?.status === "failed",
      ).length;

  const chips = agent.contextNodeIds.map((id) => nodes?.[id]).filter((n) => n !== undefined);
  const pending = agent.approvals.filter((a) => a.status === "pending");
  const composing = agent.status === "composing" || agent.status === "idle";
  const busy = agent.status === "running";
  const title =
    composing && !agent.threadId
      ? "新对话"
      : (useUiStore.getState().threads.find((t) => t.id === agent.threadId)?.title ?? "对话");

  return (
    <aside
      aria-label="Agent"
      style={{ width, "--para-drawer-from": "12px" } as React.CSSProperties}
      className="para-drawer-enter relative flex h-full shrink-0 flex-col border-border/60 border-l bg-popover"
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a pointer-draggable resize grip, not a thematic break — <hr> cannot take the pointer handler. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整宽度"
        onPointerDown={startResize}
        className="-left-1 absolute inset-y-0 z-10 w-2 cursor-col-resize hover:bg-border/60"
      />

      <header className="flex h-14 shrink-0 items-center justify-between gap-2 pr-3 pl-4">
        <span className="truncate font-medium text-body text-foreground">{title}</span>
        <div className="flex items-center gap-0.5">
          <Chip
            tone="muted"
            aria-label="新对话"
            title="新对话"
            onClick={newChat}
            className="size-8 justify-center p-0"
          >
            <Plus className="size-4" />
          </Chip>
          <Chip
            tone="muted"
            aria-label="收起 Agent"
            title="收起"
            onClick={() => setAgentOpen(false)}
            className="size-8 justify-center p-0"
          >
            <SidebarRight className="size-4" />
          </Chip>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {composing && agent.steps.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-3 pb-2">
            <div className="flex items-center gap-2 font-medium text-body text-foreground">
              <Sparkles aria-hidden="true" className="size-4" />
              从一个想法出发，抵达成片
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  tone="outline"
                  onClick={() => {
                    setAgent({ prompt: s });
                    inputRef.current?.focus();
                  }}
                  className="h-auto min-h-14 items-start whitespace-normal rounded-xl border-border/60 p-3 text-left leading-snug"
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            {agent.prompt && !composing && (
              <div className="self-end rounded-xl bg-accent px-3 py-2 text-body text-foreground">
                {agent.prompt}
              </div>
            )}
            <div className="flex items-center justify-between text-body">
              <span className="text-foreground">
                {headline(agent.runStatus, agent.status, agent.createdNodeIds.length)}
              </span>
              {agent.total > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {doneCount} / {agent.total}
                </span>
              )}
            </div>
            {agent.total > 0 && (
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-neutral-4">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${(doneCount / Math.max(1, agent.total)) * 100}%` }}
                />
              </div>
            )}

            {pending.map((approval) => (
              <div
                key={approval.id}
                className="rounded-xl border border-border/70 bg-background p-3"
              >
                <div className="flex items-center justify-between text-label">
                  <span className="text-foreground">{approvalTitle(approval.toolName)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    ≈ ⚡{approval.estimatedCost}
                  </span>
                </div>
                {typeof approval.args.prompt === "string" && (
                  <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">
                    {approval.args.prompt}
                  </p>
                )}
                <div className="mt-2.5 flex gap-2">
                  <Chip tone="primary" onClick={() => void decide(approval.id, true)}>
                    确认生成
                  </Chip>
                  <Chip tone="outline" onClick={() => void decide(approval.id, false)}>
                    取消
                  </Chip>
                </div>
              </div>
            ))}

            {agent.steps.length > 0 && (
              <ul className="flex flex-col gap-1.5 rounded-xl border border-border/60 p-3 text-label">
                {agent.steps.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={[
                        "size-1.5 rounded-full",
                        s.state === "done"
                          ? "bg-primary"
                          : s.state === "now"
                            ? "bg-foreground"
                            : "bg-neutral-6",
                      ].join(" ")}
                    />
                    <span
                      className={s.state === "next" ? "text-muted-foreground" : "text-foreground"}
                    >
                      {s.label}
                    </span>
                    {s.cost !== undefined && (
                      <span className="ml-auto text-muted-foreground tabular-nums">⚡{s.cost}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              {busy ? (
                <Chip tone="outline" onClick={stop}>
                  停止
                </Chip>
              ) : (
                <Chip tone="outline" onClick={newChat}>
                  继续新的对话
                </Chip>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3">
        <div className="rounded-2xl border border-border/70 bg-background p-2">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1 px-1 pt-1 pb-1.5">
              {chips.map((n) => {
                const asset =
                  n.type !== "text" && n.assetId
                    ? assetList?.find((a) => a.id === n.assetId)
                    : undefined;
                return (
                  <span
                    key={n.id}
                    className="flex h-[var(--para-h-chip)] items-center gap-1.5 rounded-md border border-border/60 bg-popover pr-0.5 pl-1 text-label text-foreground"
                  >
                    {asset ? (
                      <img src={asset.url} alt="" className="size-5 rounded-sm object-cover" />
                    ) : (
                      <NodeGlyph type={n.type} className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="max-w-32 truncate">{nodeTitle(n)}</span>
                    <Chip
                      tone="muted"
                      aria-label={`移除 ${nodeTitle(n)}`}
                      onClick={() => removeContextNode(n.id)}
                      className="size-5 h-5 justify-center p-0"
                    >
                      <Cross className="size-3" />
                    </Chip>
                  </span>
                );
              })}
            </div>
          )}
          <Textarea
            ref={inputRef}
            aria-label="给 Agent 的指令"
            placeholder={
              chips.length ? "说说要对这些节点做什么" : "描述你的创作想法，Agent 会在画布上完成"
            }
            value={composing ? agent.prompt : ""}
            disabled={!composing}
            rows={3}
            onChange={(e) => setAgent({ prompt: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run();
              }
              e.stopPropagation();
            }}
            tone="bare"
            className="resize-none px-2 py-1.5 text-body"
          />
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-meta text-muted-foreground">
              {agent.autonomy === "act" ? "自动生成：已开启" : "生成前会先征求你的确认"}
            </span>
            <Chip
              tone="primary"
              aria-label="发送"
              onClick={run}
              disabled={!composing || !agent.prompt.trim()}
              className="size-8 h-8 justify-center rounded-full p-0"
            >
              <ArrowUp className="size-4" />
            </Chip>
          </div>
        </div>
      </div>
    </aside>
  );
}

function headline(runStatus: string | null, status: string, createdCount: number): string {
  if (runStatus === "awaiting_approval") return "等你确认";
  if (runStatus === "failed") return "这次运行失败了";
  if (runStatus === "completed" || status === "done") return "已完成";
  if (runStatus === "queued") return "排队中…";
  return createdCount > 0 ? "正在生成 4 个变体…" : "思考中…";
}

function approvalTitle(toolName: string): string {
  return toolName === "generate_image" ? "生成图片" : toolName.replace(/_/g, " ");
}

/** Turn a rollout event into one readable row; unknown shapes are skipped rather than guessed at. */
function traceLabel(event: AgentTraceEvent): string | null {
  if (event.type === "turn.started") return "读取画布内容";
  if (event.type !== "item.completed") return null;
  const item = event.item ?? {};
  switch (item.type) {
    case "mcp_tool_call":
    case "tool_call":
      return `调用 ${String(item.name ?? item.tool ?? "工具")}`;
    case "agent_message":
      return "已回复";
    case "reasoning":
      return "分析了画布";
    case "error":
      return `出错：${String(item.message ?? "未知错误")}`;
    default:
      return null;
  }
}
