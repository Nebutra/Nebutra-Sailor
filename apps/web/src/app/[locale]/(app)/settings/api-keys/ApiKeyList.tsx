"use client";

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
      <input type="hidden" name="keyId" value={keyId} />
      <input type="hidden" name="orgId" value={orgId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs text-red-500 hover:text-red-700 focus:outline-none disabled:opacity-50"
      >
        {isPending ? "Revoking…" : "Revoke"}
      </button>
    </form>
  );
}

export function ApiKeyList({ orgId, keys = [] }: Props) {
  if (keys.length === 0) {
    return (
      <p className="py-4 text-sm text-center text-[var(--neutral-11)]">
        No API keys yet. Create one above.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--neutral-6)]">
      {keys.map((k) => (
        <li key={k.id} className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--neutral-12)]">{k.name}</p>
            <p className="mt-0.5 text-xs font-mono text-[var(--neutral-11)]">{k.keyPrefix}…</p>
            <p className="mt-0.5 text-xs text-[var(--neutral-10)]">
              Created {new Date(k.createdAt).toLocaleDateString()}
              {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
            </p>
          </div>

          {k.revokedAt ? (
            <span className="bg-red-100 px-2 py-0.5 text-xs font-medium rounded-full text-red-700">
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
