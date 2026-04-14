import type { PresetDefinition } from "../config";

export const dashboard: PresetDefinition = {
  id: "dashboard",
  name: "B2B DevOps Dashboard",
  description: "Data-dense dashboard with billing, audit, SSO, and real-time updates",
  apps: {
    web: true,
    "landing-page": false,
    "api-gateway": true,
    studio: false,
    blog: false,
    admin: true,
    storybook: false,
    "sailor-docs": false,
  },
  features: {
    billing: true,
    ai: false,
    ecommerce: false,
    web3: false,
    community: false,
    blog: false,
    growth: false,
    search: false,
    sso: true,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: true,
    upload: true,
  },
  theme: "dark-dense",
};
