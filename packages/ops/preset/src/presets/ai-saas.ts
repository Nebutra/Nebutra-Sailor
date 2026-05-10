import type { PresetDefinition } from "../config";

export const aiSaas: PresetDefinition = {
  id: "ai-saas",
  name: "AI SaaS",
  description: "AI-powered SaaS with billing, multi-tenancy, and provider abstraction",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: true,
    blog: false,
    admin: true,
    storybook: false,
    "sailor-docs": true,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: false,
    growth: true,
    search: false,
    sso: false,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: true,
    upload: true,
  },
  theme: "neon",
};
