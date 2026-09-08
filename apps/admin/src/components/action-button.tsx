"use client";

import type { ActionPlan, ActionResult } from "@nebutra/contracts/admin";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useState } from "react";
import { relativeTime } from "@/lib/format";

/**
 * Every write on the console goes through here: click → plan → review →
 * apply → result. The plan is never skipped; the product decides what the
 * apply does and writes the audit event. Errors show the contract code so the
 * operator can tell "forbidden" from "the engine is down".
 */
export interface ActionButtonProps {
  serviceId: string;
  actionId: string;
  verb: string;
  description?: string | undefined;
  destructive?: boolean | undefined;
  input?: Record<string, unknown>;
  size?: "sm" | "tiny";
  variant?: "ink" | "outline";
  className?: string;
}

interface ActionError {
  code: string;
  message: string;
}

type Phase = "idle" | "planning" | "planned" | "applying" | "done";

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/contract/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | T
    | { error?: { code?: string; message?: string } }
    | null;
  if (!res.ok || !data) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw { code: err?.code ?? "network", message: err?.message ?? `HTTP ${res.status}` };
  }
  return data as T;
}

function toError(error: unknown): ActionError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ActionError;
  }
  return { code: "network", message: error instanceof Error ? error.message : "network" };
}

const OP_MARK = { add: "+", remove: "−", change: "~" } as const;
const OP_INK = {
  add: "text-[hsl(var(--success-strong))]",
  remove: "text-[hsl(var(--destructive-strong))]",
  change: "text-[hsl(var(--warning-strong))]",
} as const;

export function ActionButton({
  serviceId,
  actionId,
  verb,
  description,
  destructive = false,
  input = {},
  size = "sm",
  variant = "outline",
  className,
}: ActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<ActionError | null>(null);

  const reset = () => {
    setPhase("idle");
    setPlan(null);
    setResult(null);
    setError(null);
  };

  const start = async () => {
    reset();
    setOpen(true);
    setPhase("planning");
    try {
      setPlan(await post<ActionPlan>({ serviceId, actionId, mode: "plan", input }));
      setPhase("planned");
    } catch (e) {
      setError(toError(e));
      setPhase("idle");
    }
  };

  const apply = async () => {
    if (!plan) return;
    setError(null);
    setPhase("applying");
    try {
      setResult(
        await post<ActionResult>({
          serviceId,
          actionId,
          mode: "apply",
          input,
          planId: plan.planId,
        }),
      );
      setPhase("done");
    } catch (e) {
      setError(toError(e));
      setPhase("planned");
    }
  };

  const busy = phase === "planning" || phase === "applying";

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn("h-7 gap-1.5 px-2.5 text-xs", className)}
        onClick={() => void start()}
      >
        {verb}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-w-lg gap-0 p-0">
          <div className="border-border border-b px-5 py-4">
            <DialogTitle className="font-semibold text-sm leading-5">{verb}</DialogTitle>
            <DialogDescription className="mt-0.5 text-muted-foreground text-xs">
              {description ?? `${serviceId} · ${actionId}`}
            </DialogDescription>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
            {phase === "planning" ? <p className="text-muted-foreground">Planning…</p> : null}

            {plan && phase !== "done" ? (
              <>
                <p className="leading-5">{plan.summary}</p>
                {plan.diff.length > 0 ? (
                  <ul className="rounded-md border border-border bg-background font-mono text-xs">
                    {plan.diff.map((entry, i) => (
                      <li
                        key={`${entry.op}:${entry.path}:${i}`}
                        className="flex gap-2 border-border border-b px-3 py-1.5 last:border-b-0"
                      >
                        <span className={cn("w-3 shrink-0 font-semibold", OP_INK[entry.op])}>
                          {OP_MARK[entry.op]}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{entry.path}</span>
                        {entry.op === "change" ? (
                          <span className="text-muted-foreground">
                            {String(entry.from ?? "")} → {String(entry.to ?? "")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs">No changes in this plan.</p>
                )}
                {plan.affected.length > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Affects{" "}
                    {plan.affected.map((a) => a.label ?? `${a.resource}/${a.id}`).join(", ")}
                  </p>
                ) : null}
                {plan.warnings.length > 0 ? (
                  <ul className="space-y-1 text-[hsl(var(--warning-strong))] text-xs">
                    {plan.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  Plan {plan.planId} · expires {relativeTime(plan.expiresAt)}
                </p>
              </>
            ) : null}

            {result ? (
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="leading-5">{result.summary}</p>
                <p className="mt-1 font-mono text-muted-foreground text-xs">
                  audit {result.auditId}
                </p>
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-[hsl(var(--destructive-strong))]/30 px-3 py-2 text-[hsl(var(--destructive-strong))] text-xs"
              >
                <span className="font-mono">{error.code}</span> · {error.message}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-border border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              {phase === "done" ? "Close" : "Cancel"}
            </Button>
            {phase === "planned" || phase === "applying" ? (
              <Button
                type="button"
                variant={destructive ? "destructive" : "ink"}
                size="sm"
                disabled={busy}
                onClick={() => void apply()}
              >
                {phase === "applying" ? "Applying…" : "Apply"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
