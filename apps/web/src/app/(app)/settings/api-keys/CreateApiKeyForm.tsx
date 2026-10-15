"use client";

import { Input, useCopyToClipboard } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { type CreateKeyState, createApiKey } from "./actions";

interface Props {
  orgId: string;
}

const INITIAL: CreateKeyState = { status: "idle" };

export function CreateApiKeyForm({ orgId }: Props) {
  const tCopy = useTranslations("copy.apiKeysCreateApiKeyForm");
  const tc = useTranslations("copy.apiKeysCreateApiKeyForm");
  const [state, action, isPending] = useActionState(createApiKey, INITIAL);
  const { copied, copy } = useCopyToClipboard({ timeout: 2000, showToast: false });

  if (state.status === "success") {
    return (
      <div className="rounded-[var(--radius-md)] border border-warning/60 bg-warning/10 p-4">
        <p className="mb-2 text-sm font-medium text-warning-strong">{tc("thisKeyAppearsOnce")}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-xs text-warning-strong shadow-inner">
            {state.key}
          </code>
          <button
            type="button"
            onClick={() => copy(state.key)}
            className="rounded-[var(--radius-md)] border border-warning/40 px-3 py-2 text-xs font-medium text-warning-strong transition-colors hover:bg-warning/15"
          >
            {copied ? tCopy("copied") : tCopy("copy")}
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
        placeholder={tc("eGProductionBackend")}
        disabled={isPending}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {isPending ? tCopy("creating") : tCopy("createKey")}
      </button>

      {state.status === "error" && (
        <p className="self-center text-sm text-destructive-strong">{state.message}</p>
      )}
    </form>
  );
}
