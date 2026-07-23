import { brand } from "@nebutra/brand/metadata";
import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { ProviderKeysClient } from "./provider-keys-client";

export const metadata = { title: "Provider Keys — Settings" };

export default async function ProviderKeysPage() {
  await requireOrg();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Provider Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring your own AI provider keys. {brand.name} prefers your key for matching models and
          falls back to the platform key unless you pin it.
        </p>
      </header>

      <PermissionGate
        require={["provider_key:read"]}
        fallback={
          <p className="text-sm text-muted-foreground">
            You do not have permission to view provider keys.
          </p>
        }
      >
        <ProviderKeysClient />
      </PermissionGate>
    </div>
  );
}
