"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { type RevokeKeyState, revokeApiKey } from "./actions";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

interface Props {
  orgId: string;
  keys?: ApiKey[];
}

const INITIAL_REVOKE: RevokeKeyState = { status: "idle" };

function RevokeButton({ keyId, orgId }: { keyId: string; orgId: string }) {
  const [_state, action, isPending] = useActionState(revokeApiKey, INITIAL_REVOKE);

  return (
    <form action={action}>
      <input data-allow-native type="hidden" name="keyId" value={keyId} />
      <input data-allow-native type="hidden" name="orgId" value={orgId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs text-[hsl(var(--destructive-strong))] hover:text-[hsl(var(--destructive-strong))]/80 disabled:opacity-50"
      >
        {isPending ? "Revoking…" : "Revoke"}
      </button>
    </form>
  );
}

export function ApiKeyList({ orgId, keys = [] }: Props) {
  const t = useTranslations("startupOs");

  if (keys.length === 0) {
    return (
      <p className="py-4 text-sm text-center text-muted-foreground">{t("emptyState.apiKeys")}</p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {keys.map((k) => (
        <li key={k.id} className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{k.name}</p>
            <p className="mt-0.5 text-xs font-mono text-muted-foreground">{k.keyPrefix}…</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Created {new Date(k.createdAt).toLocaleDateString()}
              {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
            </p>
          </div>

          {k.revokedAt ? (
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--destructive-strong))]">
              Revoked
            </span>
          ) : (
            <PermissionGate require="api_key:delete">
              <RevokeButton keyId={k.id} orgId={orgId} />
            </PermissionGate>
          )}
        </li>
      ))}
    </ul>
  );
}
