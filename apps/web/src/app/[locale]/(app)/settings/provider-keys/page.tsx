import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { ProviderKeysClient } from "./provider-keys-client";

export const metadata = { title: "Provider Keys — Settings" };

export default async function ProviderKeysPage() {
  await requireOrg();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[var(--neutral-12)]">Provider Keys</h1>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">
          Bring your own AI provider keys. Nebutra prefers your key for matching models and falls
          back to the platform key unless you pin it.
        </p>
      </header>

      <PermissionGate
        require={["provider_key:read"]}
        fallback={
          <p className="text-sm text-[var(--neutral-11)]">
            You do not have permission to view provider keys.
          </p>
        }
      >
        <ProviderKeysClient />
      </PermissionGate>
    </div>
  );
}
