import { SourceConnections } from "./source-connections";
export default { title: "Products/KCQ/MarketConnections", component: SourceConnections };
const actions = {
  onSave: async () => true,
  onRemove: async () => true,
  onTest: async () => true,
  onRetry: async () => true,
};
const base = {
  ...actions,
  signedIn: true,
  signInUrl: "/sign-in",
  connections: [],
  canManage: true,
  busy: false,
  error: "",
};
export const Empty = { args: base };
export const SignedOut = { args: { ...base, signedIn: false } };
export const Connected = {
  args: {
    ...base,
    connections: [
      {
        id: "story-source",
        provider: "twelvedata",
        label: "My Twelve Data",
        maskedKey: "••••1234",
        updatedAt: "2026-10-08",
      },
    ],
  },
};
export const Member = { args: { ...Connected.args, canManage: false } };
export const Unavailable = { args: { ...base, error: "数据源服务暂不可用，请重试。" } };
