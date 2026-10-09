/** Review the KCQ wallet states independently from network and checkout. */
import { InsufficientBalanceNotice, WalletChip } from "./wallet-chip";

export default { title: "Products/KCQ/Wallet", component: WalletChip };

const base = { origin: "https://kcq.nebutra.com", onOpen: () => {} };
export const Funded = {
  args: {
    ...base,
    wallet: {
      status: "ready",
      balance: 12.4,
      currency: "USD",
      usage: [
        {
          id: "1",
          occurredAt: "2026-10-09T10:00:00Z",
          model: "gpt-5.6-luna",
          cost: 0.0042,
          currency: "USD",
        },
        {
          id: "2",
          occurredAt: "2026-10-09T09:40:00Z",
          model: "gpt-5.6-luna",
          cost: 0.0107,
          currency: "USD",
        },
      ],
    },
  },
};
export const Empty = {
  args: { ...base, wallet: { status: "ready", balance: 0, currency: "USD", usage: [] } },
};
export const Staff = { args: { ...base, wallet: { status: "internal" } } };
export const Unavailable = { args: { ...base, wallet: { status: "error" } } };
export const InsufficientBalance = {
  render: () => <InsufficientBalanceNotice origin={base.origin} onDismiss={() => {}} />,
};
