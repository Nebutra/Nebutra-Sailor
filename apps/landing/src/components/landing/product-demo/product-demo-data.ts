export type ProductDemoTabId = "analytics" | "billing" | "workspaces";

export interface ProductDemoTab {
  id: ProductDemoTabId;
  labelKey: string;
  descKey: string;
}

export const PRODUCT_DEMO_TABS: ProductDemoTab[] = [
  {
    id: "analytics",
    labelKey: "analytics.label",
    descKey: "analytics.desc",
  },
  {
    id: "billing",
    labelKey: "billing.label",
    descKey: "billing.desc",
  },
  {
    id: "workspaces",
    labelKey: "workspaces.label",
    descKey: "workspaces.desc",
  },
];
