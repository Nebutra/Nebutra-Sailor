"use client";

import { ArrowUp, Cross } from "@nebutra/icons";
import { Textarea } from "@nebutra/ui/primitives";
import { useCallback, useEffect, useRef } from "react";
import type { AgentStep } from "@/domain/types";
import { type AgentRunState, type AgentTraceEvent, agentApi, followRun } from "@/lib/agent-api";
import { isGatewayMode } from "@/lib/gateway-api";
import { findAsset } from "@/mock/queries";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";
import { useUiStore } from "@/stores/ui-store";

const MOCK_PLAN: Array<Pick<AgentStep, "label" | "cost">> = [
  { label: "Read canvas context" },
  { label: "Describe references" },
  { label: "Generate 4 variations", cost: 4 },
  { label: "Compare continuity" },
];

/**
 * Bottom composer that expands into a panel (B — recorded departure from the right dock).
 *
 * In gateway mode this panel owns no agent state: starting a turn queues a server run and the
 * panel attaches to its event stream, so closing it does not stop the turn and reopening replays
 * the trace. In standalone mode a local timer stands in for the run.
 */
export function AgentPanel({ projectId }: { projectId: string }) {
  const agent = useUiStore((s) => s.agent);
  const setAgent = useUiStore((s) => s.setAgent);
  const removeContextNode = useUiStore((s) => s.removeContextNode);
  const resetAgent = useUiStore((s) => s.resetAgent);
  const setDrawer = useUiStore((s) => s.setDrawer);
  const newThread = useUiStore((s) => s.newThread);
  const nodes = useEditorStore((s) => s.document?.nodes);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const detach = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (agent.status === "composing") inputRef.current?.focus();
  }, [agent.status]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      detach.current?.();
    },
    [],
  );

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

  const close = () => {
    if (timer.current) clearInterval(timer.current);
    detach.current?.();
    detach.current = null;
    resetAgent();
    setDrawer(null);
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
      if (!workspaceId) throw new Error("no workspace loaded");
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
            label: e instanceof Error ? e.message : "Could not start the run",
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
            ? { x: src.x + src.width + 48 + (i % 2) * 240, y: src.y + Math.floor(i / 2) * 142 }
            : { x: 1050, y: 270 + i * 146 };
          const id = editor.derive({
            ...(source ? { sourceId: source } : {}),
            mode: "image",
            prompt,
            createdBy: "agent",
            threadId: thread.id,
            at,
            size: { width: 224, height: 126 },
          });
          if (id) {
            created.push(id);
            useJobsStore.getState().enqueue(id, `Agent · variation ${i + 1}`, 1);
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

  if (agent.status === "idle") return null;

  const chips = agent.contextNodeIds.map((id) => nodes?.[id]).filter(Boolean);
  const pending = agent.approvals.filter((a) => a.status === "pending");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="para-rise pointer-events-auto flex max-h-[33vh] w-para-dock flex-col rounded-2xl border border-border bg-popover shadow-ambient-lg">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="font-medium text-foreground text-label">Ask PARA</span>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Cross className="size-3.5" />
          </button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1 px-4 pt-2">
            {chips.map((n) => {
              const asset = n && n.type !== "text" && n.assetId ? findAsset(n.assetId) : undefined;
              return n ? (
                <span
                  key={n.id}
                  className="flex h-[var(--para-h-chip)] items-center gap-1 rounded-md border border-border/60 bg-background pr-1 pl-1 text-meta text-foreground"
                >
                  {asset ? (
                    <img src={asset.url} alt="" className="size-4 rounded-sm object-cover" />
                  ) : (
                    <span className="size-4 rounded-sm bg-neutral-4" />
                  )}
                  {n.id}
                  <button
                    type="button"
                    aria-label={`Remove ${n.id}`}
                    onClick={() => removeContextNode(n.id)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}

        {agent.status === "composing" && (
          <div className="relative px-2 pb-2">
            <Textarea
              ref={inputRef}
              aria-label="Ask PARA"
              placeholder="Create four colder variations of this."
              value={agent.prompt}
              rows={2}
              onChange={(e) => setAgent({ prompt: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  run();
                }
                if (e.key === "Escape") close();
              }}
              className="resize-none border-0 bg-transparent px-3 py-2 pr-12 text-body shadow-none"
            />
            <button
              type="button"
              aria-label="Send"
              onClick={run}
              disabled={!agent.prompt.trim()}
              className="absolute right-4 bottom-4 flex size-7 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-40"
            >
              <ArrowUp className="size-3.5" />
            </button>
          </div>
        )}

        {(agent.status === "running" || agent.status === "done") && (
          <div className="min-h-0 overflow-y-auto px-4 pt-2 pb-3">
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

            {pending.map((approval) => (
              <div
                key={approval.id}
                className="mt-3 rounded-lg border border-border/70 bg-background p-3"
              >
                <div className="flex items-center justify-between text-label">
                  <span className="text-foreground">{approvalTitle(approval.toolName)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    ≈ ✦{approval.estimatedCost}
                  </span>
                </div>
                {typeof approval.args.prompt === "string" && (
                  <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">
                    {approval.args.prompt}
                  </p>
                )}
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void decide(approval.id, true)}
                    className="h-[var(--para-h-chip)] rounded-md bg-primary px-3 font-medium text-primary-foreground text-label"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => void decide(approval.id, false)}
                    className="h-[var(--para-h-chip)] rounded-md border border-border px-3 text-foreground text-label hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}

            {agent.total > 0 && (
              <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-neutral-4">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${(doneCount / Math.max(1, agent.total)) * 100}%` }}
                />
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              {agent.status === "running" ? (
                <button
                  type="button"
                  onClick={stop}
                  className="h-[var(--para-h-chip)] rounded-md border border-border px-2.5 text-foreground text-label hover:bg-accent"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="h-[var(--para-h-chip)] rounded-md border border-border px-2.5 text-foreground text-label hover:bg-accent"
                >
                  Done
                </button>
              )}
              <button
                type="button"
                onClick={() => setAgent({ activityOpen: !agent.activityOpen })}
                aria-expanded={agent.activityOpen}
                className="h-[var(--para-h-chip)] rounded-md px-2.5 text-muted-foreground text-label hover:text-foreground"
              >
                {agent.steps.filter((s) => s.state === "done").length} of {agent.steps.length}{" "}
                actions
              </button>
            </div>

            {agent.activityOpen && agent.steps.length > 0 && (
              <ul className="mt-3 space-y-1 border-border/60 border-t pt-3 text-label">
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
                      <span className="ml-auto text-muted-foreground tabular-nums">✦{s.cost}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function headline(runStatus: string | null, status: string, createdCount: number): string {
  if (runStatus === "awaiting_approval") return "Waiting for you.";
  if (runStatus === "failed") return "The run failed.";
  if (runStatus === "completed" || status === "done") return "Done.";
  if (runStatus === "queued") return "Queued…";
  return createdCount > 0 ? "Creating 4 variations…" : "Working…";
}

function approvalTitle(toolName: string): string {
  return toolName === "generate_image" ? "Generate image" : toolName.replace(/_/g, " ");
}

/** Turn a rollout event into one readable row; unknown shapes are skipped rather than guessed at. */
function traceLabel(event: AgentTraceEvent): string | null {
  if (event.type === "turn.started") return "Read canvas context";
  if (event.type !== "item.completed") return null;
  const item = event.item ?? {};
  switch (item.type) {
    case "mcp_tool_call":
    case "tool_call":
      return `Called ${String(item.name ?? item.tool ?? "a tool")}`;
    case "agent_message":
      return "Answered";
    case "reasoning":
      return "Considered the canvas";
    case "error":
      return `Failed: ${String(item.message ?? "unknown error")}`;
    default:
      return null;
  }
}
