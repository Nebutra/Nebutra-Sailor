import { brand } from "@nebutra/brand/metadata";
import { PageHeader } from "@nebutra/ui/layout";
import type { Metadata } from "next";
import { PageFrame } from "@/components/page-frame";
import { WalletPanel } from "@/components/wallet-panel";
import { buildForgePageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildForgePageMetadata({
  title: "钱包充值",
  description: `${brand.name} Forge 预充钱包（演示 mock 充值）`,
  path: "/wallet",
  index: false,
});

export default function WalletPage() {
  return (
    <PageFrame width="text" className="py-10 md:py-12">
      <div className="space-y-6">
        <PageHeader
          title="预充钱包"
          description="302 风格：先充值、后按量。当前为 mock 充值，生产接入支付后写入同一账本。"
        />
        <WalletPanel />
      </div>
    </PageFrame>
  );
}
