"use client";

import { useState } from "react";

export type ProviderId = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";

export interface ProviderKey {
  id: string;
  provider: ProviderId;
  label: string;
  isActive: boolean;
  alwaysUse: boolean;
  baseUrl: string | null;
  maskedKey: string | null;
  createdAt: string;
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  GOOGLE: "Google",
  SILICONFLOW: "SiliconFlow",
  CUSTOM: "Custom (OpenAI-compatible)",
};

function DeleteButton({
  provider,
  onDelete,
}: {
  provider: ProviderId;
  onDelete: (provider: ProviderId) => void | Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await onDelete(provider);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="text-xs font-medium text-red-11 transition-colors hover:text-red-12 focus:outline-none focus:ring-2 focus:ring-red-8 focus:ring-offset-1 disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

interface ProviderKeysListProps {
  keys: ProviderKey[];
  onAdd: () => void;
  onDelete: (provider: ProviderId) => void | Promise<void>;
}

export function ProviderKeysList({ keys, onAdd, onDelete }: ProviderKeysListProps) {
  if (keys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-2)] py-10 text-center">
        <p className="mb-3 text-sm text-[var(--neutral-11)]">No provider keys configured</p>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand-gradient)" }}
        >
          Add your first provider key
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-7)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--neutral-2)] text-left text-xs font-medium text-[var(--neutral-11)]">
          <tr>
            <th scope="col" className="px-4 py-2.5">
              Provider
            </th>
            <th scope="col" className="px-4 py-2.5">
              Key
            </th>
            <th scope="col" className="px-4 py-2.5">
              Routing
            </th>
            <th scope="col" className="px-4 py-2.5 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--neutral-6)] bg-[var(--neutral-1)]">
          {keys.map((k) => (
            <tr key={k.id}>
              <td className="px-4 py-3 font-medium text-[var(--neutral-12)]">
                {PROVIDER_LABELS[k.provider]}
                {k.label ? (
                  <span className="ml-2 text-xs font-normal text-[var(--neutral-11)]">
                    {k.label}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--neutral-11)]">
                {k.maskedKey ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--neutral-11)]">
                {k.alwaysUse ? (
                  <span className="rounded-[var(--radius-sm)] bg-[var(--blue-3)] px-1.5 py-0.5 text-[var(--blue-11)]">
                    Always use this key
                  </span>
                ) : (
                  "Prefer, fall back to platform"
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton provider={k.provider} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
