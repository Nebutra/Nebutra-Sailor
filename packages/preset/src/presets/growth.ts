import type { PresetDefinition } from "../config";

export const growth: PresetDefinition = {
  id: "growth",
  name: "Product Hunt Growth",
  description: "Growth-focused with waitlist, referrals, A/B testing, and community",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": false,
    studio: false,
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
    community: true,
    blog: true,
    growth: true,
    search: false,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: true,
    realtime: false,
    upload: false,
  },
  theme: "gradient",
};
