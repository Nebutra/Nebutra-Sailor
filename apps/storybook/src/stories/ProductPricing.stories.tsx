import type { Meta, StoryObj } from "@storybook/react";
import { createTranslator } from "next-intl";
import { mergeMessages } from "../../../../packages/platform/i18n/src/messages";
import en from "../../../landing/messages/en.json";
import zhOverlay from "../../../landing/messages/zh-Hans.json";
import { ProductOfferList } from "../../../landing/src/components/landing/product-offer-list";

// A locale catalog holds real translations only; what it lacks renders English,
// exactly as the app's loader does.
const zh = mergeMessages(en, zhOverlay);

const meta = {
  title: "Landing/Product pricing",
  component: ProductOfferList,
  parameters: { layout: "padded" },
  args: {
    locale: "en",
    t: createTranslator({ locale: "en", messages: en, namespace: "productPricing" }),
    products: [{ id: "preview", name: "Preview product", href: "https://example.com" }],
    offers: [
      {
        id: "membership",
        product: "preview",
        name: "Membership preview",
        account: "personal",
        kind: "membership",
        prices: { USD: 9.99, CNY: 79 },
        grants: { tier: "pro", days: 30, monthlyCredits: 3200 },
      },
      {
        id: "pack",
        product: "preview",
        name: "Credit pack preview",
        account: "personal",
        kind: "credits",
        prices: { USD: 49.99 },
        grants: { credits: 5000, expiresInDays: 730 },
      },
      {
        id: "balance",
        product: "preview",
        name: "Balance preview",
        account: "workspace",
        kind: "balance",
        customAmount: { USD: { min: 5, max: 10000 } },
        grants: {},
      },
    ],
  },
} satisfies Meta<typeof ProductOfferList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const English: Story = {};
export const Chinese: Story = {
  args: {
    locale: "zh-Hans",
    t: createTranslator({ locale: "zh-Hans", messages: zh, namespace: "productPricing" }),
  },
};
export const Mobile: Story = { parameters: { viewport: { defaultViewport: "mobile1" } } };
