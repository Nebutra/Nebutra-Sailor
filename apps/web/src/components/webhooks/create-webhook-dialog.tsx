"use client";

import { Button, useCopyToClipboard } from "@nebutra/ui/primitives";
import { useState } from "react";
import { WebhookEndpointForm, type WebhookEndpointFormValues } from "./webhook-endpoint-form";

export { STANDARD_WEBHOOK_EVENTS } from "./webhook-endpoint-form";

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

export function CreateWebhookDialog({ onSubmit, onCreated }: CreateWebhookDialogProps) {
  const [result, setResult] = useState<CreateWebhookResult | null>(null);
  const { copied, copy } = useCopyToClipboard({ timeout: 2000, showToast: false });

  async function submit(values: WebhookEndpointFormValues) {
    const runSubmit = onSubmit ?? defaultSubmit;
    const created = await runSubmit({ url: values.url, events: values.events });
    setResult(created);
    onCreated?.(created);
  }

  async function copySecret(secret: string) {
    await copy(secret);
  }

  if (result) {
    const { signingSecret, endpoint } = result;
    // This panel used to be hand-coloured in the amber-50/amber-800/white ramp,
    // which has no dark-mode value: the secret rendered as near-white text on a
    // white block — the one string in the app you cannot get back was the one
    // you could not read. Semantic tokens carry both themes.
    return (
      <div
        role="alert"
        className="rounded-[var(--radius-md)] bg-warning/10 p-4 text-sm text-[hsl(var(--warning-strong))]"
      >
        <p className="mb-2 font-medium">Endpoint created. The signing secret appears once.</p>
        <p className="mb-3 text-xs">
          Store it in your application&apos;s secret manager before closing.
        </p>
        <div className="mb-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded bg-neutral-1 px-3 py-2 font-mono text-xs text-neutral-12">
            {signingSecret}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copySecret(signingSecret)}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs">Endpoint URL: {endpoint.url}</p>
      </div>
    );
  }

  return (
    <WebhookEndpointForm submitLabel="Create endpoint" pendingLabel="Creating…" onSubmit={submit} />
  );
}
