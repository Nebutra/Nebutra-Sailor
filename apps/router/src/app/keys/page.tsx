import { KeysClient } from "@/components/keys-client";
import { PageFrame } from "@/components/page-frame";

export const metadata = { title: "API Keys" };

export default function KeysPage() {
  return (
    <PageFrame
      title="API Keys"
      description="创建后完整密钥只显示一次。默认 scopes: models:* + tools:*。"
    >
      <KeysClient />
    </PageFrame>
  );
}
