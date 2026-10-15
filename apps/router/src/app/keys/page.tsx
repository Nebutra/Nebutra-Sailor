import { getTranslations } from "next-intl/server";
import { KeysClient } from "@/components/keys-client";
import { PageFrame } from "@/components/page-frame";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("console.keys");
  return { title: t("title") };
}

export default async function KeysPage() {
  await requireAuth("/keys");
  const t = await getTranslations("console.keys");
  return (
    <PageFrame title={t("title")} description={t("description")}>
      <KeysClient />
    </PageFrame>
  );
}
