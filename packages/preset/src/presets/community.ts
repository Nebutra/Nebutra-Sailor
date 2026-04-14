import type { PresetDefinition } from "../config";

export const community: PresetDefinition = {
  id: "community",
  name: "Vertical Domain Community",
  description: "Community platform with search, real-time, blog, and growth",
  apps: {
    web: true,
    "landing-page": false,
    "api-gateway": true,
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
    search: true,
    sso: false,
    admin: false,
    analytics: false,
    newsletter: true,
    realtime: true,
    upload: true,
  },
  theme: "ocean",
};
