import type { PresetDefinition } from "../config";

export const overseas: PresetDefinition = {
  id: "overseas",
  name: "Chinese AI Going Overseas",
  description: "AI SaaS with dual billing, i18n, and overseas growth",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: false,
    blog: true,
    admin: false,
    storybook: false,
    "sailor-docs": false,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: true,
    growth: true,
    search: true,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: true,
    realtime: false,
    upload: false,
  },
  theme: "neon",
};
