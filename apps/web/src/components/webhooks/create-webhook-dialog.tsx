"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useCopyToClipboard,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
/**
 * Standard webhook events surfaced in the UI. The full enum lives in
 * `@nebutra/webhooks` (`WebhookEventType`); this list is curated for the most
 * common subscriptions a customer would pick from when wiring up a new endpoint.
 */
export const STANDARD_WEBHOOK_EVENTS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "user.created", label: "User created" },
  { id: "user.updated", label: "User updated" },
  { id: "user.deleted", label: "User deleted" },
  { id: "invoice.paid", label: "Invoice paid" },
  { id: "invoice.failed", label: "Invoice failed" },
  { id: "invoice.updated", label: "Invoice updated" },
  { id: "subscription.created", label: "Subscription created" },
  { id: "subscription.updated", label: "Subscription updated" },
  { id: "subscription.cancelled", label: "Subscription cancelled" },
  { id: "org.created", label: "Organization created" },
  { id: "org.updated", label: "Organization updated" },
  { id: "org.deleted", label: "Organization deleted" },
];

export interface CreateWebhookResult {
  endpoint: {
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    signingSecretMasked: string;
    createdAt: string;
    lastDeliveredAt: string | null;
  };
  signingSecret: string;
}

export interface CreateWebhookDialogProps {
  /** Override submission for tests; defaults to POST /api/webhooks */
  onSubmit?: (input: { url: string; events: string[] }) => Promise<CreateWebhookResult>;
  onCreated?: (result: CreateWebhookResult) => void;
}

async function defaultSubmit(input: {
  url: string;
  events: string[];
}): Promise<CreateWebhookResult> {
  const response = await fetch("/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to create webhook");
  }
  return (await response.json()) as CreateWebhookResult;
}

const webhookFormSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1, "Select at least one event."),
});
type WebhookFormValues = z.infer<typeof webhookFormSchema>;

export function CreateWebhookDialog({ onSubmit, onCreated }: CreateWebhookDialogProps) {
  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: { url: "", events: [] },
  });
  const [result, setResult] = useState<CreateWebhookResult | null>(null);
  const { copied, copy } = useCopyToClipboard({ timeout: 2000, showToast: false });

  const url = form.watch("url");
  const events = form.watch("events");

  function toggleEvent(id: string, currentEvents: string[]) {
    const next = currentEvents.includes(id)
      ? currentEvents.filter((value) => value !== id)
      : [...currentEvents, id];
    form.setValue("events", next, { shouldValidate: form.formState.isSubmitted });
  }

  async function submit(values: WebhookFormValues) {
    const runSubmit = onSubmit ?? defaultSubmit;
    try {
      const created = await runSubmit({ url: values.url, events: values.events });
      setResult(created);
      onCreated?.(created);
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function copySecret(secret: string) {
    await copy(secret);
  }

  if (result) {
    const { signingSecret, endpoint } = result;
    return (
      <div
        role="alert"
        className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="mb-2 font-medium">Endpoint created — copy the signing secret now.</p>
        <p className="mb-3 text-xs">
          This secret won&apos;t be shown again. Store it in your application&apos;s secret manager.
        </p>
        <div className="mb-3 flex items-center gap-2">
          <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-xs text-amber-800 shadow-inner">
            {signingSecret}
          </code>
          <button
            type="button"
            onClick={() => copySecret(signingSecret)}
            className="rounded-[var(--radius-md)] border border-amber-300 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-amber-800">Endpoint URL: {endpoint.url}</p>
      </div>
    );
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="mb-1 block text-sm font-medium text-[var(--neutral-12)]">
                Endpoint URL
              </FormLabel>
              <FormControl>
                <Input
                  type="url"
                  required
                  placeholder="https://api.example.com/webhooks/nebutra"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="events"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-[var(--neutral-12)]">
                  Events
                </legend>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {STANDARD_WEBHOOK_EVENTS.map((eventDef) => {
                    const checked = field.value.includes(eventDef.id);
                    return (
                      <label
                        key={eventDef.id}
                        className="flex items-center gap-2 text-sm text-[var(--neutral-12)]"
                      >
                        <input
                          data-allow-native
                          type="checkbox"
                          name="events"
                          value={eventDef.id}
                          checked={checked}
                          onChange={() => toggleEvent(eventDef.id, field.value)}
                          className="h-4 w-4 rounded border-[var(--neutral-7)]"
                        />
                        <span>
                          <span className="font-mono text-xs text-[var(--neutral-11)]">
                            {eventDef.id}
                          </span>
                          <span className="ml-2 text-[var(--neutral-12)]">{eventDef.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <FormMessage />
            </FormItem>
          )}
        />

        {rootError && (
          <p role="alert" className="text-sm text-red-11">
            {rootError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={form.formState.isSubmitting || !url || events.length === 0}
            className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--brand-gradient)" }}
          >
            {form.formState.isSubmitting ? "Creating…" : "Create endpoint"}
          </button>
        </div>
      </form>
    </Form>
  );
}
