"use client";

import { Input } from "@nebutra/ui/primitives";
import { useActionState, useState } from "react";
import { type CreateKeyState, createApiKey } from "./actions";

interface Props {
  orgId: string;
}

const INITIAL: CreateKeyState = { status: "idle" };

export function CreateApiKeyForm({ orgId }: Props) {
  const [state, action, isPending] = useActionState(createApiKey, INITIAL);
  const [copied, setCopied] = useState(false);

  async function handleCopy(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state.status === "success") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="mb-2 text-sm font-medium text-amber-900">
          Copy your new API key — it won&apos;t be shown again.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-xs text-amber-800 shadow-inner">
            {state.key}
          </code>
          <button
            type="button"
            onClick={() => handleCopy(state.key)}
            className="rounded-md border border-amber-300 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex gap-3">
      <input data-allow-native type="hidden" name="orgId" value={orgId} />
      <Input
        type="text"
        name="name"
        required
        placeholder="e.g. Production backend"
        disabled={isPending}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: "var(--brand-gradient)" }}
      >
        {isPending ? "Generating…" : "Generate Key"}
      </button>

      {state.status === "error" && (
        <p className="self-center text-sm text-red-11">{state.message}</p>
      )}
    </form>
  );
}
