"use client";

import { ArrowUp, Cross } from "@nebutra/icons";
import { Textarea } from "@nebutra/ui/primitives";
import { useEffect, useRef } from "react";
import type { AgentStep } from "@/domain/types";
import { findAsset } from "@/mock/queries";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";
import { useUiStore } from "@/stores/ui-store";

const PLAN: Array<Pick<AgentStep, "label" | "cost">> = [
  { label: "Read canvas context" },
  { label: "Describe references" },
  { label: "Generate 4 variations", cost: 4 },
  { label: "Compare continuity" },
];

/**
 * Bottom composer that expands into a panel (B — recorded departure from the right dock).
 * Selection chips (A) · collapsible step log (A) · results land as derived placeholder nodes (A) ·
 * Stop replaces Send while running (B) · panel height-capped to ~33 % of the viewport.
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

  useEffect(() => {
    if (agent.status === "composing") inputRef.current?.focus();
  }, [agent.status]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const close = () => {
    if (timer.current) clearInterval(timer.current);
    resetAgent();
    setDrawer(null);
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    const { jobs, cancel } = useJobsStore.getState();
    for (const id of useUiStore.getState().agent.createdNodeIds) {
      const j = jobs.find(
        (x) => x.nodeId === id && (x.status === "queued" || x.status === "running"),
      );
      if (j) cancel(j.id);
    }
    setAgent({
      status: "done",
      steps: useUiStore
        .getState()
        .agent.steps.map((s) => (s.state === "now" ? { ...s, state: "done" } : s)),
    });
  };

  const run = () => {
    const prompt = agent.prompt.trim();
    if (!prompt) return;
    const thread = newThread(projectId, prompt);
    const steps: AgentStep[] = PLAN.map((p, i) => ({
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
        // The spending step: placeholder child nodes + derived edges appear at submit (A).
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
      if (step >= PLAN.length) {
        if (timer.current) clearInterval(timer.current);
        setAgent({ steps: next.map((s) => ({ ...s, state: "done" })), status: "done" });
        return;
      }
      setAgent({ steps: next });
    }, 1400);
  };

  // Progress of the spending step mirrors node completion.
  const done = agent.createdNodeIds.filter(
    (id) => nodes?.[id]?.status === "completed" || nodes?.[id]?.status === "failed",
  ).length;

  if (agent.status === "idle") return null;

  const chips = agent.contextNodeIds.map((id) => nodes?.[id]).filter(Boolean);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="para-rise pointer-events-auto flex max-h-[33vh] w-[min(640px,80%)] flex-col rounded-2xl border border-border/70 bg-card/90 shadow-ambient-lg backdrop-blur-md">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="font-medium text-foreground text-xs">Ask PARA</span>
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
                  className="flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background pr-1 pl-1 text-[11px] text-foreground"
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
              className="resize-none border-0 bg-transparent px-3 py-2 pr-12 text-sm shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              aria-label="Send"
              onClick={run}
              disabled={!agent.prompt.trim()}
              className="absolute right-4 bottom-4 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <ArrowUp className="size-3.5" />
            </button>
          </div>
        )}

        {(agent.status === "running" || agent.status === "done") && (
          <div className="min-h-0 overflow-y-auto px-4 pt-2 pb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {agent.status === "done"
                  ? "Done."
                  : agent.createdNodeIds.length
                    ? "Creating 4 variations…"
                    : "Working…"}
              </span>
              {agent.createdNodeIds.length > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {done} / {agent.total}
                </span>
              )}
            </div>
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-neutral-4">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{
                  width: `${agent.createdNodeIds.length ? (done / agent.total) * 100 : 8}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {agent.status === "running" ? (
                <button
                  type="button"
                  onClick={stop}
                  className="h-7 rounded-md border border-border px-2.5 text-foreground text-xs hover:bg-accent"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="h-7 rounded-md border border-border px-2.5 text-foreground text-xs hover:bg-accent"
                >
                  Done
                </button>
              )}
              <button
                type="button"
                onClick={() => setAgent({ activityOpen: !agent.activityOpen })}
                aria-expanded={agent.activityOpen}
                className="h-7 rounded-md px-2.5 text-muted-foreground text-xs hover:text-foreground"
              >
                {agent.steps.filter((s) => s.state === "done").length} of {agent.steps.length}{" "}
                actions
              </button>
            </div>
            {agent.activityOpen && (
              <ul className="mt-3 space-y-1 border-border/60 border-t pt-3 text-xs">
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
