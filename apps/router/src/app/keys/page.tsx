import { PageHeader } from "@nebutra/ui/layout";
import { KeysClient } from "@/components/keys-client";

export const metadata = { title: "API Keys" };

export default function KeysPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="创建后仅展示一次完整密钥。Scopes 默认 models:* + tools:*。"
      />
      <KeysClient />
    </div>
  );
}
