import type { PresetDefinition } from "../config";

export const onePerson: PresetDefinition = {
  id: "one-person",
  name: "One-Person Company",
  description: "Full-stack solo founder setup with billing, AI, blog, and admin",
  apps: {
    web: true,
    "landing-page": true,
    "api-gateway": false,
    studio: false,
    blog: true,
    admin: true,
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
    search: false,
    sso: false,
    admin: true,
    analytics: true,
    newsletter: false,
    realtime: false,
    upload: false,
  },
  theme: "neon",
};
