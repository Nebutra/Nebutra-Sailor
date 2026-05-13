"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from "@nebutra/ui/primitives";
import { Loader2, Send } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useFeedbackDialog } from "./feedback-dialog-provider";

/**
 * Feedback / "report an issue" dialog.
 *
 * Built on `@nebutra/ui/primitives` Dialog → which wraps `@base-ui/react`.
 * Focus trap, ESC handling, click-outside, and focus restoration are all
 * handled by the primitive — we only own the form body.
 */

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

export function FeedbackDialog() {
  const { open, setOpen, closeDialog } = useFeedbackDialog();
  const areaId = useId();
  const modeId = useId();
  const descId = useId();
  const emailId = useId();

  const [area, setArea] = useState<string>("dashboard");
  const [mode, setMode] = useState<string>("");
  const [description, setDescription] = useState("");
  const [followUp, setFollowUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog closes — delay to avoid flash mid-transition.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setArea("dashboard");
        setMode("");
        setDescription("");
        setFollowUp(true);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const descLength = description.trim().length;
  const canSubmit = !submitting && descLength >= MIN_DESCRIPTION && descLength <= MAX_DESCRIPTION;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          area,
          mode: mode || undefined,
          description: description.trim(),
          contactEmail: followUp ? "" : undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to submit feedback");
      }
      toast.success("Report submitted", {
        description: "Thanks — we'll review it soon.",
      });
      closeDialog();
    } catch (err) {
      toast.error("Failed to submit feedback", {
        description: err instanceof Error ? err.message : "Please try again in a moment.",
      });
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[560px] gap-0 p-0">
        <DialogHeader className="space-y-1 border-b border-neutral-7 px-5 py-4 text-left dark:border-white/10">
          <DialogTitle className="text-sm">Report an issue</DialogTitle>
          <DialogDescription className="text-xs">
            Help us understand and fix what you ran into.
          </DialogDescription>
        </DialogHeader>

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
                disabled={submitting}
                className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white"
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
                disabled={submitting}
                className="w-full rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm text-neutral-12 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white"
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
              disabled={submitting}
              placeholder="What did you expect? What actually happened? If you can, list the steps to reproduce."
              className="w-full resize-none rounded-lg border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm leading-relaxed text-neutral-12 placeholder:text-neutral-10 focus:border-[hsl(var(--ring))] focus:outline-none disabled:opacity-50 dark:border-white/15 dark:bg-black/40 dark:text-white dark:placeholder:text-white/50"
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
              disabled={submitting}
              className="h-3.5 w-3.5 rounded border-neutral-7 text-blue-9 dark:border-white/30 dark:bg-black/40"
            />
            Allow us to follow up via the email on your account.
          </label>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-neutral-7 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={closeDialog}
              disabled={submitting}
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
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
