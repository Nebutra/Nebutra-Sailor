import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { ApiKeyList } from "./ApiKeyList";
import { CreateApiKeyForm } from "./CreateApiKeyForm";

export const metadata = { title: "API Keys — Settings" };

export default async function ApiKeysPage() {
  const { orgId } = await requireOrg();

  return (
    <div className="space-y-8">
      {/* Create key — members+ */}
      <PermissionGate
        require="api_key:create"
        fallback={
          <p className="text-sm text-[var(--neutral-11)]">
            You need Member or Admin access to create API keys.
          </p>
        }
      >
        <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
          <h2 className="mb-1 text-base font-semibold text-[var(--neutral-12)]">Create API Key</h2>
          <p className="mb-4 text-sm text-[var(--neutral-11)]">
            API keys grant programmatic access to the Nebutra API. Keep them secret — they carry the
            same privileges as your account.
          </p>
          <CreateApiKeyForm orgId={orgId} />
        </section>
      </PermissionGate>

      {/* List keys */}
      <section className="rounded-lg border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--neutral-12)]">Active Keys</h2>
        <ApiKeyList orgId={orgId} />
      </section>
    </div>
  );
}
