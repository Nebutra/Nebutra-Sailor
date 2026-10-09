import {
  Robot as Bot,
  CreditCard,
  Database,
  BlendMode as Palette,
  Servers as Server,
  Shield,
  Workflow,
} from "@nebutra/icons";
import type { ComponentType } from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";

export type CapabilityVisualVariant =
  | "orchestra"
  | "stack"
  | "trust"
  | "supply"
  | "bus"
  | "ledger"
  | "request";

type CapabilityNode = {
  label: string;
  tone?: "core" | "port" | "policy" | "adapter";
};

type CapabilityMetric = {
  value: string;
};

/**
 * Structural, translation-free capability folder data. Every string the
 * page shows (title, summary, signature/evidence labels, topology captions
 * and node detail, owns/boundaries/proof bullets) lives in the
 * `packageCatalog.folders.<id>` i18n namespace (apps/landing/messages/*.json)
 * instead — components look it up by `folder.id` and an index, via
 * getTranslations()/useTranslations(). This file keeps only what the render
 * loop needs structurally: counts, package names, icons, and tone/variant
 * enums that drive layout rather than copy.
 */
export type CapabilityFolder = {
  anchorId: string;
  docsHref: string;
  icon: ComponentType<{ className?: string }>;
  id: string;
  layout: "wide" | "standard" | "full";
  sourcePath: string;
  sourceStats: {
    unitCount: number;
    sourceFiles: number;
    testFiles: number;
    readmes: number;
  };
  signature: CapabilityMetric;
  topology: {
    variant: CapabilityVisualVariant;
    nodes: CapabilityNode[];
  };
  focusPackages: string[];
  evidence: CapabilityMetric[];
  interfaces: string[];
  /** Bullet counts for `packageCatalog.folders.<id>.owns.<n>` etc. */
  ownsCount: number;
  boundariesCount: number;
  proofCount: number;
};

export const CAPABILITY_FOLDERS: CapabilityFolder[] = [
  {
    id: "ai",
    anchorId: "capability-ai",
    sourcePath: "packages/ai",
    docsHref: createPublicDocsUrl("ai/overview"),
    icon: Bot,
    layout: "wide",
    sourceStats: {
      unitCount: 42,
      sourceFiles: 318,
      testFiles: 161,
      readmes: 37,
    },
    signature: {
      value: "40",
    },
    topology: {
      variant: "orchestra",
      nodes: [
        {
          label: "@nebutra/agent-runtime",
          tone: "core",
        },
        {
          label: "@nebutra/knowledge-rag",
        },
        {
          label: "@nebutra/mcp",
          tone: "port",
        },
        {
          label: "@nebutra/reel",
        },
        {
          label: "@nebutra/sandbox-runtime",
          tone: "policy",
        },
        {
          label: "@nebutra/ai-providers",
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "@nebutra/agent-runtime",
      "@nebutra/agents",
      "@nebutra/knowledge-rag",
      "@nebutra/mcp",
      "@nebutra/reel",
      "@nebutra/sandbox-runtime",
    ],
    evidence: [{ value: "34" }, { value: "12" }, { value: "35" }],
    interfaces: [
      "@nebutra/agents",
      "@nebutra/agent-runtime",
      "@nebutra/knowledge-rag",
      "@nebutra/mcp",
    ],
    ownsCount: 3,
    boundariesCount: 2,
    proofCount: 2,
  },
  {
    id: "platform",
    anchorId: "capability-platform",
    sourcePath: "packages/platform",
    docsHref: createPublicDocsUrl("concepts/architecture"),
    icon: Database,
    layout: "standard",
    sourceStats: {
      unitCount: 21,
      sourceFiles: 369,
      testFiles: 77,
      readmes: 15,
    },
    signature: {
      value: "18",
    },
    topology: {
      variant: "stack",
      nodes: [
        {
          label: "@nebutra/db",
          tone: "core",
        },
        {
          label: "@nebutra/tenant-store",
          tone: "policy",
        },
        {
          label: "@nebutra/provider-factory",
        },
        {
          label: "@nebutra/gateway-core",
        },
        {
          label: "@nebutra/trace-store",
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "@nebutra/db",
      "@nebutra/gateway-core",
      "@nebutra/provider-factory",
      "@nebutra/tenant-store",
      "@nebutra/trace-store",
    ],
    evidence: [{ value: "81" }, { value: "13" }, { value: "9" }],
    interfaces: [
      "@nebutra/db",
      "@nebutra/config",
      "@nebutra/provider-factory",
      "@nebutra/tenant-store",
    ],
    ownsCount: 3,
    boundariesCount: 2,
    proofCount: 2,
  },
  {
    id: "iam",
    anchorId: "capability-iam",
    sourcePath: "packages/iam",
    docsHref: createPublicDocsUrl("concepts/permissions"),
    icon: Shield,
    layout: "wide",
    sourceStats: {
      unitCount: 8,
      sourceFiles: 97,
      testFiles: 36,
      readmes: 8,
    },
    signature: {
      value: "26",
    },
    topology: {
      variant: "trust",
      nodes: [
        {
          label: "@nebutra/auth",
          tone: "adapter",
        },
        {
          label: "@nebutra/tenant",
          tone: "policy",
        },
        {
          label: "@nebutra/permissions",
          tone: "core",
        },
        {
          label: "@nebutra/audit",
        },
        {
          label: "@nebutra/vault",
          tone: "policy",
        },
      ],
    },
    focusPackages: [
      "@nebutra/auth",
      "@nebutra/identity",
      "@nebutra/permissions",
      "@nebutra/audit",
      "@nebutra/vault",
    ],
    evidence: [{ value: "12" }, { value: "8" }, { value: "4" }],
    interfaces: ["@nebutra/auth", "@nebutra/identity", "@nebutra/permissions", "@nebutra/vault"],
    ownsCount: 3,
    boundariesCount: 2,
    proofCount: 2,
  },
  {
    id: "design",
    anchorId: "capability-design",
    sourcePath: "packages/design",
    docsHref: createPublicDocsUrl("customization/theming"),
    icon: Palette,
    layout: "standard",
    sourceStats: {
      unitCount: 9,
      sourceFiles: 1456,
      testFiles: 74,
      readmes: 14,
    },
    signature: {
      value: "541",
    },
    topology: {
      variant: "supply",
      nodes: [
        {
          label: "@nebutra/design-tokens",
          tone: "core",
        },
        {
          label: "@nebutra/tokens",
        },
        {
          label: "@nebutra/theme",
        },
        {
          label: "@nebutra/icons",
        },
        {
          label: "@nebutra/ui",
          tone: "port",
        },
      ],
    },
    focusPackages: [
      "@nebutra/design-tokens",
      "@nebutra/tokens",
      "@nebutra/theme",
      "@nebutra/icons",
      "@nebutra/ui",
    ],
    evidence: [{ value: "548" }, { value: "3" }, { value: "6" }],
    interfaces: ["@nebutra/ui", "@nebutra/tokens", "@nebutra/theme", "@nebutra/icons"],
    ownsCount: 3,
    boundariesCount: 2,
    proofCount: 2,
  },
  {
    id: "integrations",
    anchorId: "capability-integrations",
    sourcePath: "packages/integrations",
    docsHref: createPublicDocsUrl("background-jobs/overview"),
    icon: Workflow,
    layout: "wide",
    sourceStats: {
      unitCount: 17,
      sourceFiles: 94,
      testFiles: 37,
      readmes: 14,
    },
    signature: {
      value: "17",
    },
    topology: {
      variant: "bus",
      nodes: [
        {
          label: "@nebutra/queue",
          tone: "core",
        },
        {
          label: "@nebutra/cache",
        },
        {
          label: "@nebutra/email",
          tone: "adapter",
        },
        {
          label: "@nebutra/uploads",
        },
        {
          label: "@nebutra/webhooks",
          tone: "policy",
        },
        {
          label: "@nebutra/collab",
        },
      ],
    },
    focusPackages: [
      "@nebutra/queue",
      "@nebutra/email",
      "@nebutra/notifications",
      "@nebutra/uploads",
      "@nebutra/webhooks",
      "@nebutra/collab",
    ],
    evidence: [{ value: "10" }, { value: "14" }, { value: "11" }],
    interfaces: ["@nebutra/queue", "@nebutra/email", "@nebutra/uploads", "@nebutra/webhooks"],
    ownsCount: 3,
    boundariesCount: 2,
    proofCount: 2,
  },
  {
    id: "commerce",
    anchorId: "capability-commerce",
    sourcePath: "packages/commerce",
    docsHref: createPublicDocsUrl("concepts/billing-model"),
    icon: CreditCard,
    layout: "standard",
    sourceStats: {
      unitCount: 9,
      sourceFiles: 94,
      testFiles: 33,
      readmes: 9,
    },
    signature: {
      value: "9",
    },
    topology: {
      variant: "ledger",
      nodes: [
        {
          label: "@nebutra/access-gate",
          tone: "policy",
        },
        {
          label: "@nebutra/billing",
          tone: "core",
        },
        {
          label: "@nebutra/metering",
        },
        {
          label: "@nebutra/license",
        },
        {
          label: "@nebutra/legal",
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "@nebutra/access-gate",
      "@nebutra/billing",
      "@nebutra/metering",
      "@nebutra/license",
      "@nebutra/legal",
    ],
    evidence: [{ value: "6" }, { value: "4" }, { value: "3" }],
    interfaces: [
      "@nebutra/billing",
      "@nebutra/metering",
      "@nebutra/license",
      "@nebutra/access-gate",
    ],
    ownsCount: 3,
    boundariesCount: 2,
    proofCount: 2,
  },
  {
    id: "gateway",
    anchorId: "capability-gateway",
    sourcePath: "backends/gateway",
    docsHref: createPublicDocsUrl("api-reference/overview"),
    icon: Server,
    layout: "full",
    sourceStats: {
      unitCount: 1,
      sourceFiles: 130,
      testFiles: 65,
      readmes: 0,
    },
    signature: {
      value: "29",
    },
    topology: {
      variant: "request",
      nodes: [
        {
          label: "requestContext",
          tone: "core",
        },
        {
          label: "security + rateLimit",
          tone: "policy",
        },
        {
          label: "tenant + idempotency",
          tone: "policy",
        },
        {
          label: "route groups",
        },
        {
          label: "OpenAPI + Inngest",
          tone: "adapter",
        },
      ],
    },
    focusPackages: [
      "middlewares/rateLimit",
      "middlewares/tenantContext",
      "routes/ai",
      "routes/billing",
      "inngest/functions",
    ],
    evidence: [{ value: "83" }, { value: "4" }, { value: "OpenAPI" }],
    interfaces: ["@nebutra/gateway", "openapi.json", "typed-api-client", "Inngest functions"],
    ownsCount: 3,
    boundariesCount: 2,
    proofCount: 2,
  },
];
