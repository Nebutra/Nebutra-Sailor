"use client";

import { AnimateIn } from "@nebutra/ui/components";
import { Check, Loader2, Send, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useFeedbackDialog } from "./feedback-dialog-provider";

const AREAS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "chat", label: "AI Chat" },
  { value: "settings", label: "Settings" },
  { value: "billing", label: "Billing" },
  { value: "integrations", label: "Integrations" },
  { value: "audit", label: "Audit Log" },
  { value: "other", label: "Other" },
] as const;

const MODES = [
  { value: "", label: "Not applicable" },
  { value: "chat", label: "Chat" },
  { value: "data", label: "Data" },
  { value: "workflow", label: "Workflow" },
  { value: "search", label: "Search" },
] as const;

const MIN_DESCRIPTION = 5;
const MAX_DESCRIPTION = 10000;

type SubmitState = "idle" | "submitting" | "success" | "error";

export function FeedbackDialog() {
  const { open, closeDialog } = useFeedbackDialog();
  const areaId = useId();
  const modeId = useId();
  const descId = useId();
  const emailId = useId();

  const [area, setArea] = useState<string>("dashboard");
  const [mode, setMode] = useState<string>("");
  const [description, setDescription] = useState("");
  const [followUp, setFollowUp] = useState(true);
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form when dialog closes.
  useEffect(() => {
    if (!open) {
      // Delay so the form doesn't visually flash during close transition.
      const t = setTimeout(() => {
        setArea("dashboard");
        setMode("");
        setDescription("");
        setFollowUp(true);
        setState("idle");
        setErrorMessage(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state !== "submitting") {
        event.preventDefault();
        closeDialog();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, state, closeDialog]);

  if (!open) return null;

  const descLength = description.trim().length;
  const canSubmit =
    state !== "submitting" && descLength >= MIN_DESCRIPTION && descLength <= MAX_DESCRIPTION;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setState("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          area,
          mode: mode || undefined,
          description: description.trim(),
          // Empty string opts out of follow-up; non-empty signals consent.
          contactEmail: followUp ? "" : "",
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to submit feedback");
      }
      setState("success");
      // Auto-dismiss after success.
      setTimeout(() => {
        closeDialog();
      }, 1600);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to submit feedback");
      setState("error");
    }
  }

  return (
    <div
      data-testid="feedback-dialog-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && state !== "submitting") {
          closeDialog();
        }
      }}
    >
      <AnimateIn preset="fadeUp">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-dialog-title"
          className="w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-neutral-7 bg-neutral-1 shadow-2xl dark:border-white/10 dark:bg-neutral-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-7 px-5 py-4 dark:border-white/10">
            <div>
              <h2
                id="feedback-dialog-title"
                className="text-sm font-semibold text-neutral-12 dark:text-white"
              >
                Report an issue
              </h2>
              <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/50">
                Help us understand and fix what you ran into.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={closeDialog}
              disabled={state === "submitting"}
              className="rounded-md p-1.5 text-neutral-10 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Success state */}
          {state === "success" ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                <Check className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-12 dark:text-white">
                  Report submitted
                </p>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">
                  Thanks — we'll review it soon.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
              {/* Area + Mode */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={areaId}
                    className="mb-1 block text-xs font-medium text-neutral-11 dark:text-white/70"
                  >
                    Where did this happen?
                  </label>
                  <select
                    id={areaId}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    disabled={state === "submitting"}
                    className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 focus:border-blue-9 focus:outline-none focus:ring-1 focus:ring-blue-9 disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white"
                  >
                    {AREAS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={modeId}
                    className="mb-1 block text-xs font-medium text-neutral-11 dark:text-white/70"
                  >
                    Chat mode (optional)
                  </label>
                  <select
                    id={modeId}
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    disabled={state === "submitting"}
                    className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 focus:border-blue-9 focus:outline-none focus:ring-1 focus:ring-blue-9 disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white"
                  >
                    {MODES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor={descId}
                  className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-11 dark:text-white/70"
                >
                  <span>What happened?</span>
                  <span
                    className={`tabular-nums ${
                      descLength < MIN_DESCRIPTION || descLength > MAX_DESCRIPTION
                        ? "text-red-11"
                        : "text-neutral-10 dark:text-white/40"
                    }`}
                  >
                    {descLength}/{MAX_DESCRIPTION}
                  </span>
                </label>
                <textarea
                  id={descId}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={state === "submitting"}
                  placeholder="What did you expect? What actually happened? If you can, list the steps to reproduce."
                  className="w-full resize-none rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm leading-relaxed text-neutral-12 placeholder:text-neutral-10 focus:border-blue-9 focus:outline-none focus:ring-1 focus:ring-blue-9 disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/50"
                />
                <p className="mt-1 text-[11px] text-neutral-10 dark:text-white/40">
                  Minimum {MIN_DESCRIPTION} characters · maximum {MAX_DESCRIPTION}
                </p>
              </div>

              {/* Email follow-up */}
              <label
                htmlFor={emailId}
                className="flex cursor-pointer items-center gap-2 text-xs text-neutral-11 dark:text-white/70"
              >
                <input
                  id={emailId}
                  type="checkbox"
                  checked={followUp}
                  onChange={(e) => setFollowUp(e.target.checked)}
                  disabled={state === "submitting"}
                  className="h-3.5 w-3.5 rounded border-neutral-7 text-blue-9 focus:ring-blue-8 dark:border-white/30 dark:bg-black/40"
                />
                Allow us to follow up via the email on your account.
              </label>

              {/* Error */}
              {errorMessage && (
                <div className="rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-xs text-red-11">
                  {errorMessage}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-neutral-7 pt-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={state === "submitting"}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  {state === "submitting" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Submit report
                </button>
              </div>
            </form>
          )}
        </div>
      </AnimateIn>
    </div>
  );
}
