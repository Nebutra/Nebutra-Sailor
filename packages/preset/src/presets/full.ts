import type { PresetDefinition } from "../config";

export const full: PresetDefinition = {
  id: "full",
  name: "Full",
  description: "Everything enabled — development default",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": true,
    studio: true,
    blog: true,
    admin: true,
    storybook: true,
    "sailor-docs": true,
  },
  features: {
    billing: true,
    ai: true,
    ecommerce: true,
    web3: true,
    community: true,
    blog: true,
    growth: true,
    search: true,
    sso: true,
    admin: true,
    analytics: true,
    newsletter: true,
    realtime: true,
    upload: true,
  },
  theme: "neon",
};
