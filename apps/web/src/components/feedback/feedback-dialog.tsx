"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle as Loader2, PaperAirplane as Send } from "@nebutra/icons";
import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const feedbackSchema = z.object({
  area: z.string(),
  mode: z.string(),
  description: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(MIN_DESCRIPTION).max(MAX_DESCRIPTION)),
  followUp: z.boolean(),
});

type FeedbackValues = z.input<typeof feedbackSchema>;

const DEFAULT_VALUES: FeedbackValues = {
  area: "dashboard",
  mode: "",
  description: "",
  followUp: true,
};

export function FeedbackDialog() {
  const tCopy = useTranslations("copy.feedbackFeedbackDialog");
  const tc = useTranslations("copy.feedbackFeedbackDialog");
  const { open, setOpen, closeDialog } = useFeedbackDialog();
  const areaId = useId();
  const modeId = useId();
  const descId = useId();
  const emailId = useId();

  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  const submitting = form.formState.isSubmitting;
  const description = form.watch("description");
  const descLength = description.trim().length;
  const canSubmit = !submitting && descLength >= MIN_DESCRIPTION && descLength <= MAX_DESCRIPTION;

  // Reset form when dialog closes — delay to avoid flash mid-transition.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        form.reset(DEFAULT_VALUES);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, form]);

  async function handleSubmit(values: FeedbackValues) {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          area: values.area,
          mode: values.mode || undefined,
          description: values.description.trim(),
          contactEmail: values.followUp ? "" : undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || tCopy("failedToSubmitFeedback"));
      }
      toast.success(tCopy("reportSubmitted"), {
        description: tCopy("thanksWeLlReview"),
      });
      closeDialog();
    } catch (err) {
      toast.error(tCopy("failedToSubmitFeedback"), {
        description: err instanceof Error ? err.message : tCopy("pleaseTryAgainIn"),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[560px] gap-0 p-0">
        <DialogHeader className="space-y-1 border-b border-neutral-7 px-5 py-4 text-left">
          <DialogTitle className="text-sm">{tc("reportAnIssue")}</DialogTitle>
          <DialogDescription className="text-xs">{tc("helpUsUnderstandAnd")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 px-5 py-4">
            {/* Area + Mode */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <label
                      htmlFor={areaId}
                      className="mb-1 block text-xs font-medium text-neutral-11"
                    >
                      {tc("whereDidThisHappen")}
                    </label>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger id={areaId}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AREAS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <label
                      htmlFor={modeId}
                      className="mb-1 block text-xs font-medium text-neutral-11"
                    >
                      Chat mode (optional)
                    </label>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger id={modeId}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <label
                    htmlFor={descId}
                    className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-11"
                  >
                    <span>{tc("whatHappened")}</span>
                    <span
                      className={`tabular-nums ${
                        descLength < MIN_DESCRIPTION || descLength > MAX_DESCRIPTION
                          ? "text-destructive-strong"
                          : "text-neutral-10"
                      }`}
                    >
                      {descLength}/{MAX_DESCRIPTION}
                    </span>
                  </label>
                  <FormControl>
                    <Textarea
                      {...field}
                      id={descId}
                      rows={5}
                      disabled={submitting}
                      placeholder={tc("whatDidYouExpect")}
                    />
                  </FormControl>
                  <p className="mt-1 text-[11px] text-neutral-10">
                    {tc("minimumCharactersMaximum", {
                      MIN_DESCRIPTION: String(MIN_DESCRIPTION ?? ""),
                      MAX_DESCRIPTION: String(MAX_DESCRIPTION ?? ""),
                    })}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email follow-up */}
            <FormField
              control={form.control}
              name="followUp"
              render={({ field }) => (
                <Checkbox
                  id={emailId}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  disabled={submitting}
                  className="text-xs text-neutral-11"
                >
                  {tc("allowUsToFollow")}
                </Checkbox>
              )}
            />

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-neutral-7 pt-3">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="rounded-[var(--radius-lg)] px-3 py-1.5 text-xs font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tc("cancel")}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-lg)] px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground transition-[background-color] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                {submitting ? "Submitting…" : tCopy("submitReport")}
              </button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
