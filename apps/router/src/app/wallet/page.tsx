import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/page-frame";
import { WalletClient } from "@/components/wallet-client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("console.wallet");
  return { title: t("title") };
}

export default async function WalletPage() {
  await requireAuth("/wallet");
  const t = await getTranslations("console.wallet");
  return (
    <PageFrame title={t("title")} description={t("description")}>
      <WalletClient />
    </PageFrame>
  );
}
