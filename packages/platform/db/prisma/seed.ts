/**
 * Prisma Seed Script
 *
 * Seeds the database with initial billing configuration:
 * - Feature definitions
 * - Usage limit definitions
 * - Pricing plans (FREE, PRO, ENTERPRISE)
 * - Plan features and limits
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// Feature Definitions
// ============================================

const FEATURES = [
  // AI Features
  { key: "ai.chat", name: "AI Chat", category: "ai", valueType: "boolean", defaultValue: true },
  {
    key: "ai.embeddings",
    name: "Embeddings",
    category: "ai",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "ai.image",
    name: "Image Generation",
    category: "ai",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "ai.rerank",
    name: "Reranking",
    category: "ai",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "ai.translate",
    name: "AI Translation",
    category: "ai",
    valueType: "boolean",
    defaultValue: false,
  },

  // Content Features
  {
    key: "content.posts",
    name: "Posts",
    category: "content",
    valueType: "boolean",
    defaultValue: true,
  },
  {
    key: "content.comments",
    name: "Comments",
    category: "content",
    valueType: "boolean",
    defaultValue: true,
  },
  {
    key: "content.media",
    name: "Media Upload",
    category: "content",
    valueType: "boolean",
    defaultValue: true,
  },
  {
    key: "content.moderation",
    name: "Content Moderation",
    category: "content",
    valueType: "boolean",
    defaultValue: false,
  },

  // Recommendations
  {
    key: "recsys.basic",
    name: "Basic Recommendations",
    category: "recsys",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "recsys.advanced",
    name: "Advanced ML Recommendations",
    category: "recsys",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "recsys.realtime",
    name: "Real-time Recommendations",
    category: "recsys",
    valueType: "boolean",
    defaultValue: false,
  },

  // E-commerce
  {
    key: "ecommerce.products",
    name: "Product Catalog",
    category: "ecommerce",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "ecommerce.orders",
    name: "Order Management",
    category: "ecommerce",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "ecommerce.shopify",
    name: "Shopify Integration",
    category: "ecommerce",
    valueType: "boolean",
    defaultValue: false,
  },

  // Web3
  {
    key: "web3.contracts",
    name: "Smart Contracts",
    category: "web3",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "web3.indexing",
    name: "Blockchain Indexing",
    category: "web3",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "web3.nft",
    name: "NFT Support",
    category: "web3",
    valueType: "boolean",
    defaultValue: false,
  },

  // Team & Collaboration
  {
    key: "team.members",
    name: "Team Members",
    category: "team",
    valueType: "number",
    defaultValue: 1,
  },
  {
    key: "team.roles",
    name: "Custom Roles",
    category: "team",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "team.sso",
    name: "SSO/SAML",
    category: "team",
    valueType: "boolean",
    defaultValue: false,
  },

  // Support
  {
    key: "support.email",
    name: "Email Support",
    category: "support",
    valueType: "boolean",
    defaultValue: true,
  },
  {
    key: "support.priority",
    name: "Priority Support",
    category: "support",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "support.dedicated",
    name: "Dedicated Support",
    category: "support",
    valueType: "boolean",
    defaultValue: false,
  },

  // Analytics
  {
    key: "analytics.basic",
    name: "Basic Analytics",
    category: "analytics",
    valueType: "boolean",
    defaultValue: true,
  },
  {
    key: "analytics.advanced",
    name: "Advanced Analytics",
    category: "analytics",
    valueType: "boolean",
    defaultValue: false,
  },
  {
    key: "analytics.export",
    name: "Data Export",
    category: "analytics",
    valueType: "boolean",
    defaultValue: false,
  },
];

// ============================================
// Usage Limit Definitions
// ============================================

const USAGE_LIMITS = [
  {
    key: "ai_tokens",
    name: "AI Tokens",
    unit: "tokens",
    resetPeriod: "monthly",
    overageRate: 0.00001,
  },
  { key: "api_calls", name: "API Calls", unit: "calls", resetPeriod: "daily", overageRate: 0.0001 },
  {
    key: "storage_bytes",
    name: "Storage",
    unit: "bytes",
    resetPeriod: "never",
    overageRate: 0.00000001,
  },
  {
    key: "bandwidth_bytes",
    name: "Bandwidth",
    unit: "bytes",
    resetPeriod: "monthly",
    overageRate: 0.00000001,
  },
  {
    key: "compute_minutes",
    name: "Compute Time",
    unit: "minutes",
    resetPeriod: "monthly",
    overageRate: 0.001,
  },
  {
    key: "team_members",
    name: "Team Members",
    unit: "seats",
    resetPeriod: "never",
    overageRate: null,
  },
  { key: "projects", name: "Projects", unit: "projects", resetPeriod: "never", overageRate: null },
];

// ============================================
// Plan Configurations
// ============================================

const PLANS = [
  {
    slug: "free",
    name: "Free",
    plan: "FREE",
    amount: 0,
    trialDays: 0,
    features: {
      "ai.chat": true,
      "ai.embeddings": false,
      "ai.image": false,
      "content.posts": true,
      "content.comments": true,
      "content.media": true,
      "recsys.basic": false,
      "ecommerce.products": false,
      "web3.contracts": false,
      "team.members": 1,
      "support.email": true,
      "analytics.basic": true,
    },
    limits: {
      ai_tokens: 1000,
      api_calls: 100,
      storage_bytes: 100 * 1024 * 1024, // 100 MB
      bandwidth_bytes: 1 * 1024 * 1024 * 1024, // 1 GB
      compute_minutes: 60,
      team_members: 1,
      projects: 1,
    },
  },
  {
    slug: "pro",
    name: "Pro",
    plan: "PRO",
    amount: 29,
    trialDays: 14,
    features: {
      "ai.chat": true,
      "ai.embeddings": true,
      "ai.image": true,
      "ai.rerank": true,
      "ai.translate": true,
      "content.posts": true,
      "content.comments": true,
      "content.media": true,
      "content.moderation": true,
      "recsys.basic": true,
      "recsys.advanced": false,
      "ecommerce.products": true,
      "ecommerce.orders": true,
      "ecommerce.shopify": true,
      "web3.contracts": false,
      "team.members": 10,
      "team.roles": true,
      "support.email": true,
      "support.priority": true,
      "analytics.basic": true,
      "analytics.advanced": true,
      "analytics.export": true,
    },
    limits: {
      ai_tokens: 100000,
      api_calls: 10000,
      storage_bytes: 10 * 1024 * 1024 * 1024, // 10 GB
      bandwidth_bytes: 100 * 1024 * 1024 * 1024, // 100 GB
      compute_minutes: 600,
      team_members: 10,
      projects: 10,
    },
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    plan: "ENTERPRISE",
    amount: 299,
    trialDays: 30,
    features: {
      "ai.chat": true,
      "ai.embeddings": true,
      "ai.image": true,
      "ai.rerank": true,
      "ai.translate": true,
      "content.posts": true,
      "content.comments": true,
      "content.media": true,
      "content.moderation": true,
      "recsys.basic": true,
      "recsys.advanced": true,
      "recsys.realtime": true,
      "ecommerce.products": true,
      "ecommerce.orders": true,
      "ecommerce.shopify": true,
      "web3.contracts": true,
      "web3.indexing": true,
      "web3.nft": true,
      "team.members": -1, // unlimited
      "team.roles": true,
      "team.sso": true,
      "support.email": true,
      "support.priority": true,
      "support.dedicated": true,
      "analytics.basic": true,
      "analytics.advanced": true,
      "analytics.export": true,
    },
    limits: {
      ai_tokens: -1, // unlimited
      api_calls: -1,
      storage_bytes: -1,
      bandwidth_bytes: -1,
      compute_minutes: -1,
      team_members: -1,
      projects: -1,
    },
  },
];

// ============================================
// Seed Functions
// ============================================

async function seedFeatureDefinitions() {
  for (let i = 0; i < FEATURES.length; i++) {
    const feature = FEATURES[i];
    await prisma.featureDefinition.upsert({
      where: { key: feature.key },
      update: {
        name: feature.name,
        category: feature.category,
        valueType: feature.valueType,
        defaultValue: feature.defaultValue,
        sortOrder: i,
      },
      create: {
        key: feature.key,
        name: feature.name,
        category: feature.category,
        valueType: feature.valueType,
        defaultValue: feature.defaultValue,
        sortOrder: i,
      },
    });
  }
}

async function seedUsageLimitDefinitions() {
  for (let i = 0; i < USAGE_LIMITS.length; i++) {
    const limit = USAGE_LIMITS[i];
    await prisma.usageLimitDefinition.upsert({
      where: { key: limit.key },
      update: {
        name: limit.name,
        unit: limit.unit,
        resetPeriod: limit.resetPeriod,
        overageRate: limit.overageRate,
        sortOrder: i,
      },
      create: {
        key: limit.key,
        name: limit.name,
        unit: limit.unit,
        resetPeriod: limit.resetPeriod,
        overageRate: limit.overageRate,
        sortOrder: i,
      },
    });
  }
}

async function seedPricingPlans() {
  // Get feature and limit definitions
  const featureDefs = await prisma.featureDefinition.findMany();
  const limitDefs = await prisma.usageLimitDefinition.findMany();

  const featureMap = new Map(featureDefs.map((f) => [f.key, f.id]));
  const limitMap = new Map(limitDefs.map((l) => [l.key, l.id]));

  for (const planConfig of PLANS) {
    // Upsert the plan
    const plan = await prisma.pricingPlan.upsert({
      where: { slug_version: { slug: planConfig.slug, version: "v1" } },
      update: {
        name: planConfig.name,
        plan: planConfig.plan as "FREE" | "PRO" | "ENTERPRISE",
        amount: planConfig.amount,
        trialDays: planConfig.trialDays,
      },
      create: {
        slug: planConfig.slug,
        name: planConfig.name,
        plan: planConfig.plan as "FREE" | "PRO" | "ENTERPRISE",
        amount: planConfig.amount,
        trialDays: planConfig.trialDays,
        version: "v1",
        isActive: true,
        isPublic: true,
      },
    });

    // Upsert plan features
    for (const [featureKey, value] of Object.entries(planConfig.features)) {
      const featureId = featureMap.get(featureKey);
      if (!featureId) {
        continue;
      }

      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId: plan.id, featureId } },
        update: {
          value,
          isEnabled: typeof value === "boolean" ? value : true,
        },
        create: {
          planId: plan.id,
          featureId,
          value,
          isEnabled: typeof value === "boolean" ? value : true,
        },
      });
    }

    // Upsert plan limits
    for (const [limitKey, limitValue] of Object.entries(planConfig.limits)) {
      const limitId = limitMap.get(limitKey);
      if (!limitId) {
        continue;
      }

      await prisma.planUsageLimit.upsert({
        where: { planId_limitId: { planId: plan.id, limitId } },
        update: {
          limitValue: BigInt(limitValue),
        },
        create: {
          planId: plan.id,
          limitId,
          limitValue: BigInt(limitValue),
        },
      });
    }
  }
}

// ============================================
// Main
// ============================================

async function main() {
  await seedFeatureDefinitions();
  await seedUsageLimitDefinitions();
  await seedPricingPlans();
}

main()
  .catch((_e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
