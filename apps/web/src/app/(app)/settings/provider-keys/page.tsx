import { brand } from "@nebutra/brand/metadata";
import { PageHeader } from "@nebutra/ui/layout";
import { getTranslations } from "next-intl/server";
import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { ProviderKeysClient } from "./provider-keys-client";

export const metadata = { title: "Provider Keys — Settings" };

export default async function ProviderKeysPage() {
  const tc = await getTranslations("copy.providerKeysPage");
  await requireOrg();

  return (
    <div className="space-y-6">
      <PageHeader
        size="section"
        title={tc("providerKeys")}
        description={tc("bringYourOwnAI", { name: String(brand.name) })}
      />

      <PermissionGate
        require={["provider_key:read"]}
        fallback={<p className="text-sm text-muted-foreground">{tc("youDoNotHave")}</p>}
      >
        <ProviderKeysClient />
      </PermissionGate>
    </div>
  );
}
