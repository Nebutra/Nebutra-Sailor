import { PageHeader } from "@nebutra/ui/layout";
import { PlaygroundClient } from "@/components/playground-client";
import { getModels } from "@/lib/demo-store";

export const metadata = { title: "Playground" };

export default function PlaygroundPage() {
  const models = getModels();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Playground"
        description="Demo 模式可本地模拟回复；配置 GATEWAY_URL 后转发真实 chat completions。"
      />
      <PlaygroundClient models={models} />
    </div>
  );
}
