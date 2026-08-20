"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  CreateWebhookDialog,
  type CreateWebhookResult,
} from "@/components/webhooks/create-webhook-dialog";
import { EditWebhookDialog } from "@/components/webhooks/edit-webhook-dialog";
import { WebhookDeliveriesPanel } from "@/components/webhooks/webhook-deliveries-panel";
import { type WebhookEndpointView, WebhooksList } from "@/components/webhooks/webhooks-list";
import { queryKeys } from "@/lib/query-keys";

async function patchEndpoint(
  id: string,
  body: { url?: string; events?: string[]; isActive?: boolean },
) {
  const response = await fetch(`/api/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // The route answers with `{ error }` on 400/404/500 — keep the reason so the
    // edit dialog can show it instead of a generic failure.
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to update webhook endpoint.");
  }
}

async function deleteEndpoint(id: string) {
  const response = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete");
}

export default function WebhooksSettingsPage() {
  const queryClient = useQueryClient();
  const [activeDeliveries, setActiveDeliveries] = useState<string | null>(null);
  const [editing, setEditing] = useState<WebhookEndpointView | null>(null);

  // The list is a react-query consumer and the app's default staleTime is 60s,
  // so remounting it would re-read the same cached rows: a create or an edit has
  // to invalidate the key, otherwise the change only shows up a minute later.
  const refreshEndpoints = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all });
  }, [queryClient]);

  const handleCreated = useCallback(
    (_: CreateWebhookResult) => {
      refreshEndpoints();
    },
    [refreshEndpoints],
  );

  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditing(null);
  }, []);

  const handleUpdated = useCallback(() => {
    refreshEndpoints();
  }, [refreshEndpoints]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe to events emitted by your workspace. We sign every payload with your
          endpoint&apos;s secret so you can verify authenticity.
        </p>
      </header>

      <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">New endpoint</h2>
        <CreateWebhookDialog onCreated={handleCreated} />
      </section>

      <section className="rounded-[var(--radius-lg)] border border-border bg-background p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Active endpoints</h2>
        <WebhooksList
          onToggleActive={(id, next) => patchEndpoint(id, { isActive: next })}
          onDelete={deleteEndpoint}
          onViewDeliveries={(id) => setActiveDeliveries(id)}
          onEdit={(endpoint: WebhookEndpointView) => setEditing(endpoint)}
        />
      </section>

      <EditWebhookDialog
        endpoint={editing}
        onOpenChange={handleEditOpenChange}
        onSubmit={(id, input) => patchEndpoint(id, input)}
        onUpdated={handleUpdated}
      />

      {activeDeliveries && (
        <section className="rounded-[var(--radius-lg)] border border-border bg-background">
          <WebhookDeliveriesPanel
            endpointId={activeDeliveries}
            onClose={() => setActiveDeliveries(null)}
          />
        </section>
      )}
    </div>
  );
}
