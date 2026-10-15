import { brand } from "@nebutra/brand/metadata";
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
      <header>
        <h1 className="text-xl font-semibold text-foreground">{tc("providerKeys")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tc("bringYourOwnAI", { name: String(brand.name) })}
        </p>
      </header>

      <PermissionGate
        require={["provider_key:read"]}
        fallback={<p className="text-sm text-muted-foreground">{tc("youDoNotHave")}</p>}
      >
        <ProviderKeysClient />
      </PermissionGate>
    </div>
  );
}
