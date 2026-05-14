"use client";

import { Input } from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";
export interface CreatedApiKey {
  key: string;
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitRps: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
}

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateApiKeyInput) => Promise<CreatedApiKey>;
  availableScopes?: string[];
  labels?: {
    title?: string;
    description?: string;
    nameLabel?: string;
    namePlaceholder?: string;
    scopesLabel?: string;
    submit?: string;
    submitting?: string;
    close?: string;
    successWarning?: string;
    copy?: string;
    copied?: string;
    confirmClose?: string;
  };
}

const DEFAULT_SCOPES = ["read", "write", "admin"];

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreate,
  availableScopes = DEFAULT_SCOPES,
  labels = {},
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset internal state when the dialog re-opens
  useEffect(() => {
    if (open) {
      setName("");
      setScopes([]);
      setError(null);
      setCreated(null);
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const text = {
    title: labels.title ?? "Create API key",
    description:
      labels.description ??
      "API keys let external systems talk to Nebutra on your behalf. Treat them like passwords.",
    nameLabel: labels.nameLabel ?? "Name",
    namePlaceholder: labels.namePlaceholder ?? "e.g. Production backend",
    scopesLabel: labels.scopesLabel ?? "Scopes",
    submit: labels.submit ?? "Create key",
    submitting: labels.submitting ?? "Creating…",
    close: labels.close ?? "Close",
    successWarning:
      labels.successWarning ??
      "This key will not be shown again — copy it now and store it somewhere safe.",
    copy: labels.copy ?? "Copy",
    copied: labels.copied ?? "Copied!",
    confirmClose:
      labels.confirmClose ??
      "Are you sure? Closing this dialog will hide the key forever — make sure you have copied it.",
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        setError("Name is required.");
        return;
      }
      const result = await onCreate({ name: trimmed, scopes });
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; ignore silently.
    }
  }

  function attemptClose() {
    if (created) {
      const ok = window.confirm(text.confirmClose);
      if (!ok) return;
    }
    onOpenChange(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-api-key-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6 shadow-xl">
        <h2
          id="create-api-key-title"
          className="mb-1 text-base font-semibold text-[var(--neutral-12)]"
        >
          {text.title}
        </h2>
        <p className="mb-4 text-sm text-[var(--neutral-11)]">{text.description}</p>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-medium text-amber-900">{text.successWarning}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-xs text-amber-900 shadow-inner">
                  {created.key}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-md border border-amber-400 px-3 py-2 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                >
                  {copied ? text.copied : text.copy}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={attemptClose}
                className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
              >
                {text.close}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="api-key-name"
                className="mb-1 block text-sm font-medium text-[var(--neutral-12)]"
              >
                {text.nameLabel}
              </label>
              <Input
                id="api-key-name"
                name="name"
                type="text"
                required
                maxLength={64}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={text.namePlaceholder}
                disabled={submitting}
              />
            </div>

            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-[var(--neutral-12)]">
                {text.scopesLabel}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {availableScopes.map((scope) => (
                  <label
                    key={scope}
                    className="flex items-center gap-2 rounded-md border border-[var(--neutral-7)] px-3 py-2 text-sm text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)]"
                  >
                    <input
                      data-allow-native
                      type="checkbox"
                      name="scopes"
                      value={scope}
                      checked={scopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      disabled={submitting}
                      className="h-4 w-4 rounded border-[var(--neutral-7)] text-[var(--blue-9)]"
                    />
                    <span>{scope}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? <p className="text-sm text-red-11">{error}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={attemptClose}
                disabled={submitting}
                className="rounded-md border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-2)] disabled:opacity-50"
              >
                {text.close}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--brand-gradient)" }}
              >
                {submitting ? text.submitting : text.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
