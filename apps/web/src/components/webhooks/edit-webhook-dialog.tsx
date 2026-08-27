"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nebutra/ui/primitives";
import { WebhookEndpointForm, type WebhookEndpointFormValues } from "./webhook-endpoint-form";
import type { WebhookEndpointView } from "./webhooks-list";

export interface EditWebhookDialogProps {
  /** The row being edited. `null` keeps the dialog closed. */
  endpoint: WebhookEndpointView | null;
  /** Close request — from the overlay, the escape key, cancel, or the close icon. */
  onOpenChange: (open: boolean) => void;
  /**
   * Persist the change. Throwing surfaces the message inline in the form.
   * Defaults to PATCH /api/webhooks/:id.
   */
  onSubmit?: (id: string, input: { url: string; events: string[] }) => Promise<void>;
  /** Fired after a successful save, before the dialog closes. */
  onUpdated?: (id: string) => void;
}

async function defaultSubmit(id: string, input: { url: string; events: string[] }): Promise<void> {
  const response = await fetch(`/api/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to update webhook endpoint.");
  }
}

export function EditWebhookDialog({
  endpoint,
  onOpenChange,
  onSubmit,
  onUpdated,
}: EditWebhookDialogProps) {
  async function submit(values: WebhookEndpointFormValues) {
    if (!endpoint) return;
    const runSubmit = onSubmit ?? defaultSubmit;
    // Errors propagate to WebhookEndpointForm, which renders them inline.
    await runSubmit(endpoint.id, { url: values.url, events: values.events });
    onUpdated?.(endpoint.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={endpoint !== null} onOpenChange={onOpenChange}>
      {endpoint && (
        // The event grid is twelve rows tall, so the surface has to scroll on a
        // short viewport: the shared modal surface sets no max height.
        <DialogContent className="max-h-[85dvh] w-full max-w-lg overflow-y-auto p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Edit endpoint</DialogTitle>
            <DialogDescription>
              Changing the URL or the event list takes effect on the next delivery. The signing
              secret stays the same.
            </DialogDescription>
          </DialogHeader>
          <WebhookEndpointForm
            // Remount when the row changes so the prefill follows the selection.
            key={endpoint.id}
            defaultValues={{ url: endpoint.url, events: [...endpoint.events] }}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            secondaryAction={
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
            }
            onSubmit={submit}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
