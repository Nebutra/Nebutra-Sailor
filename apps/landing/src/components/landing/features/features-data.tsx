import {
  ChartActivity as Activity,
  Cpu,
  CreditCard,
  Database,
  Layers,
  Shield,
  TerminalWindow as TerminalSquare,
  Workflow,
  Lightning as Zap,
} from "@nebutra/icons";

import { createPublicDocsUrl } from "@/lib/docs-links";
import {
  AIMockup,
  BillingMockup,
  DataMockup,
  DXMockup,
  MultiTenantMockup,
  SecurityMockup,
} from "./FeatureMockups";

export const LARGE_FEATURES = [
  {
    categoryKey: "multi_category",
    href: createPublicDocsUrl("guides/multi-tenancy"),
    icon: Layers,
    color: "var(--cyan-9)",
    mockup: MultiTenantMockup,
    features: [
      { titleKey: "multi_f1_title", descKey: "multi_f1_desc" },
      { titleKey: "multi_f2_title", descKey: "multi_f2_desc" },
      { titleKey: "multi_f3_title", descKey: "multi_f3_desc" },
    ],
  },
  {
    categoryKey: "billing_category",
    href: createPublicDocsUrl("payments/overview"),
    icon: CreditCard,
    color: "hsl(var(--primary))",
    mockup: BillingMockup,
    features: [
      { titleKey: "billing_f1_title", descKey: "billing_f1_desc" },
      { titleKey: "billing_f2_title", descKey: "billing_f2_desc" },
      { titleKey: "billing_f3_title", descKey: "billing_f3_desc" },
    ],
  },
  {
    categoryKey: "ai_category",
    href: createPublicDocsUrl("ai/overview"),
    icon: Cpu,
    color: "var(--purple-9)",
    mockup: AIMockup,
    features: [
      { titleKey: "ai_f1_title", descKey: "ai_f1_desc" },
      { titleKey: "ai_f2_title", descKey: "ai_f2_desc" },
      { titleKey: "ai_f3_title", descKey: "ai_f3_desc" },
    ],
  },
  {
    categoryKey: "dx_category",
    href: createPublicDocsUrl("development/project-structure"),
    icon: TerminalSquare,
    color: "var(--emerald-9)",
    mockup: DXMockup,
    features: [
      { titleKey: "dx_f1_title", descKey: "dx_f1_desc" },
      { titleKey: "dx_f2_title", descKey: "dx_f2_desc" },
      { titleKey: "dx_f3_title", descKey: "dx_f3_desc" },
    ],
  },
  {
    categoryKey: "sec_category",
    href: createPublicDocsUrl("concepts/permissions"),
    icon: Shield,
    color: "var(--red-9)",
    mockup: SecurityMockup,
    features: [
      { titleKey: "sec_f1_title", descKey: "sec_f1_desc" },
      { titleKey: "sec_f2_title", descKey: "sec_f2_desc" },
      { titleKey: "sec_f3_title", descKey: "sec_f3_desc" },
    ],
  },
  {
    categoryKey: "data_category",
    href: createPublicDocsUrl("database/overview"),
    icon: Database,
    color: "hsl(var(--primary))",
    mockup: DataMockup,
    features: [
      { titleKey: "data_f1_title", descKey: "data_f1_desc" },
      { titleKey: "data_f2_title", descKey: "data_f2_desc" },
      { titleKey: "data_f3_title", descKey: "data_f3_desc" },
    ],
  },
] as const;

export const SMALL_FEATURES = [
  {
    categoryKey: "rel_category",
    icon: Zap,
    features: [
      { titleKey: "rel_f1_title", descKey: "rel_f1_desc" },
      { titleKey: "rel_f2_title", descKey: "rel_f2_desc" },
      { titleKey: "rel_f3_title", descKey: "rel_f3_desc" },
    ],
  },
  {
    categoryKey: "obs_category",
    icon: Activity,
    features: [
      { titleKey: "obs_f1_title", descKey: "obs_f1_desc" },
      { titleKey: "obs_f2_title", descKey: "obs_f2_desc" },
      { titleKey: "obs_f3_title", descKey: "obs_f3_desc" },
    ],
  },
  {
    categoryKey: "infra_category",
    icon: Workflow,
    features: [
      { titleKey: "infra_f1_title", descKey: "infra_f1_desc" },
      { titleKey: "infra_f2_title", descKey: "infra_f2_desc" },
      { titleKey: "infra_f3_title", descKey: "infra_f3_desc" },
    ],
  },
] as const;
