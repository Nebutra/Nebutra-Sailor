import { WalletPanel } from "@/components/wallet-panel";

export const metadata = {
  title: "钱包充值",
  description: "Nebutra Forge 预充钱包（演示 mock 充值）",
};

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">预充钱包</h1>
        <p className="mt-2 text-sm text-[var(--neutral-11)]">
          302 风格：先充值、后按量。当前为 <strong>mock 充值</strong>
          ，生产接入微信/支付宝/国际卡后写入同一 CreditBalance 账本。
        </p>
      </div>
      <WalletPanel />
    </div>
  );
}
