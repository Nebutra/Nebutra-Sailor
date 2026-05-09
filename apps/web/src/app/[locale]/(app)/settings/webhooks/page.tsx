"use client";

import { useCallback, useState } from "react";
import {
  CreateWebhookDialog,
  type CreateWebhookResult,
} from "@/components/webhooks/create-webhook-dialog";
import { WebhookDeliveriesPanel } from "@/components/webhooks/webhook-deliveries-panel";
import { type WebhookEndpointView, WebhooksList } from "@/components/webhooks/webhooks-list";

async function patchEndpoint(
  id: string,
  body: { url?: string; events?: string[]; isActive?: boolean },
) {
  const response = await fetch(`/api/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Failed to update");
}

async function deleteEndpoint(id: string) {
  const response = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete");
}

export default function WebhooksSettingsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeDeliveries, setActiveDeliveries] = useState<string | null>(null);

  const handleCreated = useCallback((_: CreateWebhookResult) => {
    setRefreshKey((value) => value + 1);
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-[var(--neutral-12)]">Webhooks</h1>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">
          Subscribe to events emitted by your workspace. We sign every payload with your
          endpoint&apos;s secret so you can verify authenticity.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--neutral-12)]">New endpoint</h2>
        <CreateWebhookDialog onCreated={handleCreated} />
      </section>

      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--neutral-12)]">Active endpoints</h2>
        <WebhooksList
          key={refreshKey}
          onToggleActive={(id, next) => patchEndpoint(id, { isActive: next })}
          onDelete={deleteEndpoint}
          onViewDeliveries={(id) => setActiveDeliveries(id)}
          onEdit={(endpoint: WebhookEndpointView) => {
            // Edit flow lives in a dedicated modal in a follow-up; stub for now.
            void endpoint;
          }}
        />
      </section>

      {activeDeliveries && (
        <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)]">
          <WebhookDeliveriesPanel
            endpointId={activeDeliveries}
            onClose={() => setActiveDeliveries(null)}
          />
        </section>
      )}
    </div>
  );
}
