"use client";

import { useState } from "react";

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

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success"; result: CreateWebhookResult };

export function CreateWebhookDialog({ onSubmit, onCreated }: CreateWebhookDialogProps) {
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  function toggleEvent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.size === 0) {
      setStatus({ kind: "error", message: "Select at least one event." });
      return;
    }
    setStatus({ kind: "submitting" });
    const submit = onSubmit ?? defaultSubmit;
    try {
      const result = await submit({ url, events: Array.from(selected) });
      setStatus({ kind: "success", result });
      onCreated?.(result);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (status.kind === "success") {
    const { signingSecret, endpoint } = status.result;
    return (
      <div
        role="alert"
        className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
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
            className="rounded-md border border-amber-300 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-amber-800">Endpoint URL: {endpoint.url}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="webhook-url"
          className="mb-1 block text-sm font-medium text-[var(--neutral-12)]"
        >
          Endpoint URL
        </label>
        <input
          id="webhook-url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://api.example.com/webhooks/nebutra"
          className="w-full rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-3 py-2 text-sm text-[var(--neutral-12)] placeholder:text-[var(--neutral-9)]"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[var(--neutral-12)]">Events</legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {STANDARD_WEBHOOK_EVENTS.map((eventDef) => {
            const checked = selected.has(eventDef.id);
            return (
              <label
                key={eventDef.id}
                className="flex items-center gap-2 text-sm text-[var(--neutral-12)]"
              >
                <input
                  type="checkbox"
                  name="events"
                  value={eventDef.id}
                  checked={checked}
                  onChange={() => toggleEvent(eventDef.id)}
                  className="h-4 w-4 rounded border-[var(--neutral-7)]"
                />
                <span>
                  <span className="font-mono text-xs text-[var(--neutral-11)]">{eventDef.id}</span>
                  <span className="ml-2 text-[var(--neutral-12)]">{eventDef.label}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {status.kind === "error" && (
        <p role="alert" className="text-sm text-red-11">
          {status.message}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status.kind === "submitting" || !url || selected.size === 0}
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {status.kind === "submitting" ? "Creating…" : "Create endpoint"}
        </button>
      </div>
    </form>
  );
}
