import { PageFrame } from "@/components/page-frame";
import { WalletClient } from "@/components/wallet-client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "钱包" };

export default async function WalletPage() {
  await requireAuth("/wallet");
  return (
    <PageFrame title="钱包" description="预充后按量扣费，余额与消费明细写在同一账本。">
      <WalletClient />
    </PageFrame>
  );
}
