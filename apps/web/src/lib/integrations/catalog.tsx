import {
  ChartActivity as Activity,
  Cart as ShoppingBag,
  Store,
  Lightning as Zap,
} from "@nebutra/icons";
import type { ComponentType, SVGProps } from "react";

/**
 * The connector catalog — the single source of truth for "what connectors exist".
 *
 * These are the REAL, genuinely-connectable integration types backed by the
 * gateway (`/api/v1/integrations`, `IntegrationType` enum) + vault-encrypted
 * credentials. There are NO mock/placeholder connectors here: to add a new
 * provider, extend the `IntegrationType` Prisma enum + the gateway, then add a
 * row here. Surfaces (the Integrations page, the Startup OS connectors menu)
 * render exclusively from this list so they can never drift into fake entries.
 */
export type IntegrationCatalogType = "SHOPIFY" | "SHOPLINE" | "STRIPE" | "CUSTOM";

export interface IntegrationCatalogEntry {
  readonly type: IntegrationCatalogType;
  readonly name: string;
  readonly description: string;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly color: string;
  readonly bgColor: string;
  readonly docUrl: string;
}

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] = [
  {
    type: "SHOPIFY",
    name: "Shopify",
    description: "Sync products, orders, and customers from your Shopify store.",
    icon: ShoppingBag,
    color: "text-green-10",
    bgColor: "bg-green-3 dark:bg-green-9/20",
    docUrl: "https://docs.nebutra.ai/integrations/shopify",
  },
  {
    type: "SHOPLINE",
    name: "Shopline",
    description: "Connect your Shopline storefront for unified commerce analytics.",
    icon: Store,
    color: "text-primary",
    bgColor: "bg-primary/10 dark:bg-primary/15",
    docUrl: "https://docs.nebutra.ai/integrations/shopline",
  },
  {
    type: "STRIPE",
    name: "Stripe",
    description: "Synchronize payment data, invoices, and subscription events.",
    icon: Zap,
    color: "text-purple-10",
    bgColor: "bg-purple-3 dark:bg-purple-9/20",
    docUrl: "https://docs.nebutra.ai/integrations/stripe",
  },
  {
    type: "CUSTOM",
    name: "Custom Webhook",
    description: "Send and receive events via custom HTTP webhooks.",
    icon: Activity,
    color: "text-amber-10",
    bgColor: "bg-amber-3 dark:bg-amber-9/20",
    docUrl: "https://docs.nebutra.ai/integrations/webhooks",
  },
];
