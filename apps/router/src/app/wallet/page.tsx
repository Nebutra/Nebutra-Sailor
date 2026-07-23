import { PageHeader } from "@nebutra/ui/layout";
import { WalletClient } from "@/components/wallet-client";

export const metadata = { title: "充值" };

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="预充钱包"
        description="先充值、后按量。当前为 mock 充值；生产接微信/支付宝/国际卡后写入同一账本。"
      />
      <WalletClient />
    </div>
  );
}
