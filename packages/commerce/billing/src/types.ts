import { z } from "zod";

// ============================================
// Core Types
// ============================================

export type Plan = "FREE" | "PRO" | "ENTERPRISE";

export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "TRIALING"
  | "PAUSED"
  | "INCOMPLETE";

export type BillingInterval = "MONTHLY" | "YEARLY" | "WEEKLY" | "ONE_TIME";

export type InvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";

export type PaymentMethodType = "CARD" | "BANK_TRANSFER" | "ALIPAY" | "WECHAT_PAY" | "CRYPTO";

export type UsageType = "API_CALL" | "AI_TOKEN" | "STORAGE" | "COMPUTE" | "BANDWIDTH" | "CUSTOM";

export type CreditTransactionType =
  | "PURCHASE"
  | "USAGE"
  | "REFUND"
  | "ADJUSTMENT"
  | "EXPIRATION"
  | "BONUS";

// ============================================
// Plan Limits Configuration
// ============================================

export interface PlanLimits {
  apiCalls: number;
  aiTokens: number;
  storage: number; // bytes
  teamMembers: number;
  projects: number;
  features: string[];
}

export const DEFAULT_PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    apiCalls: 1000,
    aiTokens: 10000,
    storage: 100 * 1024 * 1024, // 100MB
    teamMembers: 1,
    projects: 1,
    features: ["basic_ai", "basic_content"],
  },
  PRO: {
    apiCalls: 50000,
    aiTokens: 500000,
    storage: 10 * 1024 * 1024 * 1024, // 10GB
    teamMembers: 10,
    projects: 10,
    features: [
      "basic_ai",
      "basic_content",
      "advanced_ai",
      "recommendations",
      "analytics",
      "api_access",
    ],
  },
  ENTERPRISE: {
    apiCalls: -1, // unlimited
    aiTokens: -1,
    storage: -1,
    teamMembers: -1,
    projects: -1,
    features: [
      "basic_ai",
      "basic_content",
      "advanced_ai",
      "recommendations",
      "analytics",
      "api_access",
      "web3",
      "custom_models",
      "sso",
      "audit_logs",
      "priority_support",
    ],
  },
};

// ============================================
// Pricing Configuration
// ============================================

export interface PricingConfig {
  id: string;
  plan: Plan;
  name: string;
  description?: string;
  interval: BillingInterval;
  amount: number; // in cents
  currency: string;
  trialDays: number;
  features: string[];
  limits: PlanLimits;
}

export const DEFAULT_PRICING: PricingConfig[] = [
  {
    id: "free",
    plan: "FREE",
    name: "Free",
    description: "Get started with basic features",
    interval: "MONTHLY",
    amount: 0,
    currency: "USD",
    trialDays: 0,
    features: ["1,000 API calls/month", "10K AI tokens/month", "100MB storage"],
    limits: DEFAULT_PLAN_LIMITS.FREE,
  },
  {
    id: "pro_monthly",
    plan: "PRO",
    name: "Pro",
    description: "For growing teams",
    interval: "MONTHLY",
    amount: 2900, // $29
    currency: "USD",
    trialDays: 14,
    features: [
      "50,000 API calls/month",
      "500K AI tokens/month",
      "10GB storage",
      "Up to 10 team members",
      "Advanced analytics",
      "Priority support",
    ],
    limits: DEFAULT_PLAN_LIMITS.PRO,
  },
  {
    id: "pro_yearly",
    plan: "PRO",
    name: "Pro (Annual)",
    description: "For growing teams - save 20%",
    interval: "YEARLY",
    amount: 27900, // $279/year (~$23.25/month)
    currency: "USD",
    trialDays: 14,
    features: [
      "50,000 API calls/month",
      "500K AI tokens/month",
      "10GB storage",
      "Up to 10 team members",
      "Advanced analytics",
      "Priority support",
    ],
    limits: DEFAULT_PLAN_LIMITS.PRO,
  },
  {
    id: "enterprise",
    plan: "ENTERPRISE",
    name: "Enterprise",
    description: "For large organizations",
    interval: "MONTHLY",
    amount: 0, // Custom pricing
    currency: "USD",
    trialDays: 30,
    features: [
      "Unlimited API calls",
      "Unlimited AI tokens",
      "Unlimited storage",
      "Unlimited team members",
      "SSO/SAML",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
    limits: DEFAULT_PLAN_LIMITS.ENTERPRISE,
  },
];

// ============================================
// Usage Pricing
// ============================================

export interface UsagePricing {
  type: UsageType;
  unitName: string;
  unitSize: number; // e.g., per 1000 tokens
  pricePerUnit: number; // in cents
  currency: string;
  includedInPlan: Record<Plan, number>; // -1 = unlimited
}

export const DEFAULT_USAGE_PRICING: UsagePricing[] = [
  {
    type: "API_CALL",
    unitName: "API call",
    unitSize: 1,
    pricePerUnit: 0.001, // $0.001 per call
    currency: "USD",
    includedInPlan: { FREE: 1000, PRO: 50000, ENTERPRISE: -1 },
  },
  {
    type: "AI_TOKEN",
    unitName: "token",
    unitSize: 1000,
    pricePerUnit: 0.002, // $0.002 per 1K tokens
    currency: "USD",
    includedInPlan: { FREE: 10000, PRO: 500000, ENTERPRISE: -1 },
  },
  {
    type: "STORAGE",
    unitName: "GB",
    unitSize: 1024 * 1024 * 1024,
    pricePerUnit: 0.02, // $0.02 per GB
    currency: "USD",
    includedInPlan: {
      FREE: 100 * 1024 * 1024,
      PRO: 10 * 1024 * 1024 * 1024,
      ENTERPRISE: -1,
    },
  },
];

// ============================================
// Zod Schemas
// ============================================

export const CreateSubscriptionSchema = z.object({
  organizationId: z.string(),
  pricingPlanId: z.string(),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().optional(),
});

export const UpdateSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  pricingPlanId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

export const RecordUsageSchema = z.object({
  organizationId: z.string(),
  userId: z.string().optional(),
  type: z.enum(["API_CALL", "AI_TOKEN", "STORAGE", "COMPUTE", "BANDWIDTH", "CUSTOM"]),
  quantity: z.number().int().positive(),
  resource: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PurchaseCreditsSchema = z.object({
  organizationId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  paymentMethodId: z.string(),
});

export const CheckEntitlementSchema = z.object({
  organizationId: z.string(),
  feature: z.string(),
  quantity: z.number().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type RecordUsageInput = z.infer<typeof RecordUsageSchema>;
export type PurchaseCreditsInput = z.infer<typeof PurchaseCreditsSchema>;
export type CheckEntitlementInput = z.infer<typeof CheckEntitlementSchema>;

// ============================================
// Error Types
// ============================================

export class BillingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

export class SubscriptionError extends BillingError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, 400, cause);
    this.name = "SubscriptionError";
  }
}

export class UsageError extends BillingError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, 400, cause);
    this.name = "UsageError";
  }
}

export class EntitlementError extends BillingError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, 403, cause);
    this.name = "EntitlementError";
  }
}

export class PaymentError extends BillingError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, 402, cause);
    this.name = "PaymentError";
  }
}
