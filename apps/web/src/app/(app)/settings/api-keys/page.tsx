import { brand } from "@nebutra/brand/metadata";
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
      <header>
        <h1 className="text-xl font-semibold text-foreground">{tc("aPIKeys")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tc("generateAndManageAPI", { name: String(brand.name) })}
        </p>
      </header>

      <PermissionGate
        require={["api_key:read"]}
        fallback={<p className="text-sm text-muted-foreground">{tc("youDoNotHave")}</p>}
      >
        <ApiKeysPageClient />
      </PermissionGate>
    </div>
  );
}
