"use client";

import { SettingsSection } from "@nebutra/ui/layout";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  const tc = useTranslations("copy.webhooksPage");
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
        <h1 className="text-xl font-semibold text-foreground">{tc("webhooks")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tc("subscribeToEventsEmitted")}</p>
      </header>

      <SettingsSection title={tc("newEndpoint")}>
        <CreateWebhookDialog onCreated={handleCreated} />
      </SettingsSection>

      <SettingsSection title={tc("activeEndpoints")}>
        <WebhooksList
          onToggleActive={(id, next) => patchEndpoint(id, { isActive: next })}
          onDelete={deleteEndpoint}
          onViewDeliveries={(id) => setActiveDeliveries(id)}
          onEdit={(endpoint: WebhookEndpointView) => setEditing(endpoint)}
        />
      </SettingsSection>

      <EditWebhookDialog
        endpoint={editing}
        onOpenChange={handleEditOpenChange}
        onSubmit={(id, input) => patchEndpoint(id, input)}
        onUpdated={handleUpdated}
      />

      {activeDeliveries && (
        <section className="rounded-xl border border-border bg-card">
          <WebhookDeliveriesPanel
            endpointId={activeDeliveries}
            onClose={() => setActiveDeliveries(null)}
          />
        </section>
      )}
    </div>
  );
}
