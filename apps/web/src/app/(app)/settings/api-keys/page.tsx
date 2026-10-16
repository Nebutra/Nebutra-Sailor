import { brand } from "@nebutra/brand/metadata";
import { PageHeader } from "@nebutra/ui/layout";
import { getTranslations } from "next-intl/server";
import { PermissionGate } from "@/components/PermissionGate";
import { requireOrg } from "@/lib/auth";
import { ApiKeysPageClient } from "./api-keys-client";

export const metadata = { title: "API Keys — Settings" };

export default async function ApiKeysPage() {
  const tc = await getTranslations("copy.apiKeysPage");
  await requireOrg();

  return (
    <div className="space-y-6">
      <PageHeader
        size="section"
        title={tc("aPIKeys")}
        description={tc("generateAndManageAPI", { name: String(brand.name) })}
      />

      <PermissionGate
        require={["api_key:read"]}
        fallback={<p className="text-sm text-muted-foreground">{tc("youDoNotHave")}</p>}
      >
        <ApiKeysPageClient />
      </PermissionGate>
    </div>
  );
}
