"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@nebutra/ui/primitives";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

/**
 * The webhook events a customer can subscribe to, with their display labels.
 * These ids mirror `WebhookEventType` in `@nebutra/webhooks` one-for-one and
 * must be kept in sync when an event is added there. The enum is not imported:
 * its barrel pulls in the provider implementations (node crypto, the Svix
 * client), which do not belong in a client bundle.
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

/**
 * Mirrors the server contract in `app/api/webhooks/[id]/route.ts` (and the POST
 * sibling): an absolute URL of at most 2048 chars plus 1–32 event ids.
 */
export const webhookEndpointFormSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().min(1)).min(1, "Select at least one event.").max(32),
});

export type WebhookEndpointFormValues = z.infer<typeof webhookEndpointFormSchema>;

export interface WebhookEndpointFormProps {
  /** Prefill — omit for the create flow, pass the endpoint's current state to edit. */
  defaultValues?: WebhookEndpointFormValues;
  /** Label on the submit button at rest. */
  submitLabel: string;
  /** Label on the submit button while the request is in flight. */
  pendingLabel: string;
  /** Rendered to the left of the submit button — e.g. a cancel action. */
  secondaryAction?: ReactNode;
  /**
   * Persist the values. Throwing here surfaces the message inline instead of
   * being swallowed; the caller does not need its own error UI.
   */
  onSubmit: (values: WebhookEndpointFormValues) => Promise<void>;
}

const EMPTY_VALUES: WebhookEndpointFormValues = { url: "", events: [] };

/**
 * The single endpoint form shared by the create and edit flows. Both write the
 * same two fields against the same schema, so they must not drift apart.
 */
export function WebhookEndpointForm({
  defaultValues,
  submitLabel,
  pendingLabel,
  secondaryAction,
  onSubmit,
}: WebhookEndpointFormProps) {
  const form = useForm<WebhookEndpointFormValues>({
    resolver: zodResolver(webhookEndpointFormSchema),
    defaultValues: defaultValues ?? EMPTY_VALUES,
  });

  const url = form.watch("url");
  const events = form.watch("events");

  function toggleEvent(id: string, currentEvents: string[]) {
    const next = currentEvents.includes(id)
      ? currentEvents.filter((value) => value !== id)
      : [...currentEvents, id];
    form.setValue("events", next, { shouldValidate: form.formState.isSubmitted });
  }

  async function submit(values: WebhookEndpointFormValues) {
    try {
      await onSubmit({ url: values.url, events: [...values.events] });
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
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
              <FormLabel className="mb-1 block text-sm font-medium text-foreground">
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
                <legend className="mb-2 text-sm font-medium text-foreground">Events</legend>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {STANDARD_WEBHOOK_EVENTS.map((eventDef) => {
                    const checked = field.value.includes(eventDef.id);
                    return (
                      <label
                        key={eventDef.id}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <input
                          data-allow-native
                          type="checkbox"
                          name="events"
                          value={eventDef.id}
                          checked={checked}
                          onChange={() => toggleEvent(eventDef.id, field.value)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {eventDef.id}
                          </span>
                          <span className="ml-2 text-foreground">{eventDef.label}</span>
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
          <p role="alert" className="text-sm text-[hsl(var(--destructive-strong))]">
            {rootError}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          {secondaryAction}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !url || events.length === 0}
          >
            {form.formState.isSubmitting ? pendingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
