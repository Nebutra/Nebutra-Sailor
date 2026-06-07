import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { ApiKeysPageClient } from "./api-keys-client";

export const metadata = { title: "API Keys — Settings" };

export default async function ApiKeysPage() {
  await requireOrg();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[var(--neutral-12)]">API Keys</h1>
        <p className="mt-1 text-sm text-[var(--neutral-11)]">
          Generate and manage API keys for programmatic access to Nebutra.
        </p>
      </header>

      <PermissionGate
        require={["api_key:read"]}
        fallback={
          <p className="text-sm text-[var(--neutral-11)]">
            You do not have permission to view API keys.
          </p>
        }
      >
        <ApiKeysPageClient />
      </PermissionGate>
    </div>
  );
}
