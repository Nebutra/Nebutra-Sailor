"use client";

import type { ActionResult } from "@nebutra/contracts/admin";
import { ArrowUpRight, Check, Copy } from "@nebutra/icons";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Field,
  Input,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeCallbackHint,
  findLoginRow,
  isSettled,
  LOGIN_PROVIDER_OPTIONS,
  type LoginProviderId,
  type LoginRow,
  type LoginStart,
  type LoginStatus,
  looksLikeCallback,
} from "@/lib/login-flow";
import { ActionButton } from "./action-button";
import { StatusDot } from "./status-dot";

/**
 * Add a subscription account to the pool without the engine's own console.
 * Three steps on two columns: pick a provider (left), approve on your own
 * device and paste the callback (right), then the result. Every step is a
 * contract call to the router — `account.login`, `account.login.callback` —
 * and the `login` resource is polled while the flow waits for approval.
 */
export interface AddAccountDialogProps {
  serviceId: string;
  /** The Sync channel action, if the caller may run it; shown once an account lands. */
  syncAction?: { id: string; verb: string; description?: string | undefined } | undefined;
  className?: string;
}

interface ContractErrorShape {
  code: string;
  message: string;
}

type Step = "provider" | "signin" | "done";

const POLL_MS = 5_000;

async function postAction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/contract/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<T>(res);
}

async function getResource<T>(serviceId: string, resourceId: string): Promise<T> {
  const query = new URLSearchParams({ serviceId, resourceId });
  const res = await fetch(`/api/contract/resource?${query}`, { cache: "no-store" });
  return unwrap<T>(res);
}

async function unwrap<T>(res: Response): Promise<T> {
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

function toError(error: unknown): ContractErrorShape {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ContractErrorShape;
  }
  return { code: "network", message: error instanceof Error ? error.message : "network" };
}

const STATUS_TONE: Record<LoginStatus, "ok" | "warn" | "bad" | "unknown"> = {
  ok: "ok",
  wait: "warn",
  error: "bad",
  unknown: "unknown",
};

export function AddAccountDialog({ serviceId, syncAction, className }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<LoginProviderId>("codex");
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState<LoginStart | null>(null);
  const [row, setRow] = useState<LoginRow | null>(null);
  const [callback, setCallback] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<ContractErrorShape | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setStep("provider");
    setBusy(false);
    setStart(null);
    setRow(null);
    setCallback("");
    setResult(null);
    setError(null);
    setCopied(false);
  }, [stopPolling]);

  // Poll the `login` resource while the flow waits; stop on ok/error or close.
  useEffect(() => {
    if (!open || !start || step === "done") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const list = await getResource<{ items: Record<string, unknown>[] }>(serviceId, "login");
        if (cancelled) return;
        const next = findLoginRow(list.items, start.state);
        if (next) setRow(next);
        if (next && isSettled(next.status)) {
          if (next.status === "ok") setStep("done");
          return;
        }
      } catch {
        // A failed poll is not a failed sign-in; try again on the next tick.
      }
      if (!cancelled) timer.current = setTimeout(() => void tick(), POLL_MS);
    };
    timer.current = setTimeout(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [open, start, step, serviceId, stopPolling]);

  const begin = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await postAction<ActionResult>({
        serviceId,
        actionId: "account.login",
        mode: "apply",
        input: { provider },
      });
      const started = res.result as LoginStart | undefined;
      if (!started?.state || !started.url) {
        throw { code: "internal", message: "The router returned no sign-in URL." };
      }
      setStart(started);
      setRow({
        id: started.state,
        provider: started.provider,
        providerLabel: LOGIN_PROVIDER_OPTIONS.find((p) => p.id === provider)?.label ?? provider,
        url: started.url,
        status: "wait",
        detail: "Waiting for approval",
        startedAt: new Date().toISOString(),
        startedBy: "",
      });
      setStep("signin");
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!start) return;
    setError(null);
    setBusy(true);
    try {
      const res = await postAction<ActionResult>({
        serviceId,
        actionId: "account.login.callback",
        mode: "apply",
        input: { redirectUrl: callback },
      });
      const status = (res.result as { status?: LoginStatus } | undefined)?.status ?? "unknown";
      setResult(res);
      setRow((prev) => (prev ? { ...prev, status, detail: res.summary } : prev));
      if (status === "ok") {
        stopPolling();
        setStep("done");
      } else if (status === "error") {
        stopPolling();
        setError({ code: "error", message: res.summary });
      }
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    if (!start) return;
    try {
      await navigator.clipboard.writeText(start.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  };

  const providerLabel = LOGIN_PROVIDER_OPTIONS.find((p) => p.id === provider)?.label ?? provider;
  const callbackValid = start ? looksLikeCallback(callback, start.callbackHost) : false;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ink"
        className={cn("h-8 text-sm", className)}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        Add account
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-w-2xl gap-0 p-0">
          <div className="border-border border-b px-5 py-4">
            <DialogTitle className="font-semibold text-sm leading-5">Add account</DialogTitle>
            <DialogDescription className="mt-0.5 text-muted-foreground text-xs">
              Logs a subscription account into the pool. Nothing leaves the private network.
            </DialogDescription>
          </div>

          <div className="grid max-h-[65vh] grid-cols-1 overflow-y-auto text-sm md:grid-cols-[220px_1fr]">
            {/* Left: provider list */}
            <div className="border-border border-b md:border-r md:border-b-0">
              <p className="px-4 pt-3 pb-1.5 font-medium text-muted-foreground text-xs">
                1 · Provider
              </p>
              <ul className="pb-2" aria-label="Provider">
                {LOGIN_PROVIDER_OPTIONS.map((option) => {
                  const active = option.id === provider;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        disabled={step !== "provider"}
                        onClick={() => setProvider(option.id)}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left disabled:cursor-default",
                          active ? "bg-muted" : "hover:bg-muted/60 disabled:hover:bg-transparent",
                        )}
                      >
                        <span className="font-medium leading-5">{option.label}</span>
                        <span className="text-muted-foreground text-xs leading-4">
                          {option.hint}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Right: sign-in panel */}
            <div className="space-y-4 px-5 py-4">
              {step === "provider" ? (
                <>
                  <p className="font-medium text-muted-foreground text-xs">
                    2 · Sign in on your own device
                  </p>
                  <p className="leading-5">
                    Start a sign-in for <span className="font-medium">{providerLabel}</span>. The
                    router returns a URL to approve in your browser; the account lands in the pool
                    once the callback is pasted back here.
                  </p>
                </>
              ) : null}

              {step === "signin" && start ? (
                <>
                  <p className="font-medium text-muted-foreground text-xs">
                    2 · Sign in on your own device
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ink"
                      onClick={() => window.open(start.url, "_blank", "noopener,noreferrer")}
                    >
                      Open sign-in
                      <ArrowUpRight />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label="Copy sign-in URL"
                      onClick={() => void copyUrl()}
                    >
                      {copied ? <Check /> : <Copy />}
                      {copied ? "Copied" : "Copy URL"}
                    </Button>
                    {row ? (
                      <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground text-xs">
                        <StatusDot tone={STATUS_TONE[row.status]} />
                        {row.detail}
                      </span>
                    ) : null}
                  </div>
                  <p className="break-all font-mono text-muted-foreground text-xs">{start.url}</p>
                  <p className="text-muted-foreground text-xs leading-4">
                    {describeCallbackHint(start.callbackHost)}
                  </p>
                  <Field label="Callback URL" htmlFor="login-callback-url">
                    <Input
                      id="login-callback-url"
                      name="redirectUrl"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={`http://${start.callbackHost}/…?code=…&state=…`}
                      value={callback}
                      onChange={(e) => setCallback(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                </>
              ) : null}

              {step === "done" ? (
                <>
                  <p className="font-medium text-muted-foreground text-xs">3 · Result</p>
                  <div className="rounded-md border border-border bg-background px-3 py-2">
                    <p className="inline-flex items-center gap-2 leading-5">
                      <StatusDot tone="ok" />
                      Account added — sync the channel so its models go on the shelf.
                    </p>
                    {result ? (
                      <p className="mt-1 font-mono text-muted-foreground text-xs">
                        audit {result.auditId}
                      </p>
                    ) : null}
                  </div>
                  {syncAction ? (
                    <ActionButton
                      serviceId={serviceId}
                      actionId={syncAction.id}
                      verb={syncAction.verb}
                      description={syncAction.description}
                      variant="ink"
                    />
                  ) : null}
                </>
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
              {step === "done" ? "Close" : "Cancel"}
            </Button>
            {step === "provider" ? (
              <Button
                type="button"
                variant="ink"
                size="sm"
                disabled={busy}
                onClick={() => void begin()}
              >
                {busy ? "Starting…" : "Start sign-in"}
              </Button>
            ) : null}
            {step === "signin" ? (
              <Button
                type="button"
                variant="ink"
                size="sm"
                disabled={busy || !callbackValid}
                onClick={() => void complete()}
              >
                {busy ? "Completing…" : "Complete sign-in"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
