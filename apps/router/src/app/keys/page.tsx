import { KeysClient } from "@/components/keys-client";
import { PageFrame } from "@/components/page-frame";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "API Keys" };

export default async function KeysPage() {
  await requireAuth("/keys");
  return (
    <PageFrame
      title="API Keys"
      description="创建后完整密钥只显示一次。默认 scopes: models:* + tools:*。"
    >
      <KeysClient />
    </PageFrame>
  );
}
