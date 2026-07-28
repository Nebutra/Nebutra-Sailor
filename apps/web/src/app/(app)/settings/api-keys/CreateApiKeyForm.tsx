"use client";

import { Input, useCopyToClipboard } from "@nebutra/ui/primitives";
import { useActionState } from "react";
import { type CreateKeyState, createApiKey } from "./actions";

interface Props {
  orgId: string;
}

const INITIAL: CreateKeyState = { status: "idle" };

export function CreateApiKeyForm({ orgId }: Props) {
  const [state, action, isPending] = useActionState(createApiKey, INITIAL);
  const { copied, copy } = useCopyToClipboard({ timeout: 2000, showToast: false });

  if (state.status === "success") {
    return (
      <div className="rounded-[var(--radius-md)] border border-amber-200/60 bg-amber-50 p-4">
        <p className="mb-2 text-sm font-medium text-amber-900">
          This key appears once. Store it before closing.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-xs text-amber-800 shadow-inner">
            {state.key}
          </code>
          <button
            type="button"
            onClick={() => copy(state.key)}
            className="rounded-[var(--radius-md)] border border-amber-300/70 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
          >
            {copied ? "Copied" : "Copy"}
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
        className="rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: "hsl(var(--primary))" }}
      >
        {isPending ? "Creating…" : "Create key"}
      </button>

      {state.status === "error" && (
        <p className="self-center text-sm text-red-900">{state.message}</p>
      )}
    </form>
  );
}
