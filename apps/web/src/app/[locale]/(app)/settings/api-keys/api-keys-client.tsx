"use client";

import { useCallback, useEffect, useState } from "react";
import { type ApiKey, ApiKeysList } from "@/components/api-keys/api-keys-list";
import {
  CreateApiKeyDialog,
  type CreateApiKeyInput,
  type CreatedApiKey,
} from "@/components/api-keys/create-api-key-dialog";

async function fetchKeys(): Promise<ApiKey[]> {
  const res = await fetch("/api/api-keys", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load API keys (${res.status})`);
  }
  const data = (await res.json()) as { keys: ApiKey[] };
  return data.keys ?? [];
}

async function createKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
  const res = await fetch("/api/api-keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : "Failed to create key.",
    );
  }
  return (await res.json()) as CreatedApiKey;
}

async function revokeKey(id: string): Promise<void> {
  const res = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to revoke key (${res.status})`);
  }
}

export function ApiKeysPageClient() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchKeys();
      setKeys(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = useCallback(
    async (input: CreateApiKeyInput) => {
      const created = await createKey(input);
      // Refresh list in the background so the new key appears once dialog closes.
      void reload();
      return created;
    },
    [reload],
  );

  const handleRevoke = useCallback(async (id: string) => {
    await revokeKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand-gradient)" }}
        >
          Create API key
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-6 bg-red-2 px-3 py-2 text-sm text-red-11">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--neutral-11)]">Loading…</p>
      ) : (
        <ApiKeysList keys={keys} onCreate={() => setDialogOpen(true)} onRevoke={handleRevoke} />
      )}

      <CreateApiKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </div>
  );
}
