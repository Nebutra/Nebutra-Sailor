import { brand } from "@nebutra/brand/metadata";
import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { ApiKeysPageClient } from "./api-keys-client";

export const metadata = { title: "API Keys — Settings" };

export default async function ApiKeysPage() {
  await requireOrg();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate and manage API keys for programmatic access to {brand.name}.
        </p>
      </header>

      <PermissionGate
        require={["api_key:read"]}
        fallback={
          <p className="text-sm text-muted-foreground">
            You do not have permission to view API keys.
          </p>
        }
      >
        <ApiKeysPageClient />
      </PermissionGate>
    </div>
  );
}
