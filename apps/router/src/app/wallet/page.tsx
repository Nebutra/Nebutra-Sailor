import { PageFrame } from "@/components/page-frame";
import { WalletClient } from "@/components/wallet-client";

export const metadata = { title: "钱包" };

export default function WalletPage() {
  return (
    <PageFrame
      title="钱包"
      description="预充后按量扣费。Demo 为 mock 充值；生产接支付渠道写入同一账本。"
    >
      <WalletClient />
    </PageFrame>
  );
}
