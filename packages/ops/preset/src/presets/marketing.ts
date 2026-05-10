import type { PresetDefinition } from "../config";

export const marketing: PresetDefinition = {
  id: "marketing",
  name: "Enterprise Marketing",
  description: "Marketing-focused with blog, CMS, and analytics",
  apps: {
    web: false,
    "landing-page": true,
    "api-gateway": false,
    studio: true,
    blog: true,
    admin: false,
    storybook: false,
    "sailor-docs": false,
  },
  features: {
    billing: false,
    ai: false,
    ecommerce: false,
    web3: false,
    community: false,
    blog: true,
    growth: true,
    search: false,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: true,
    realtime: false,
    upload: true,
  },
  theme: "gradient",
};
