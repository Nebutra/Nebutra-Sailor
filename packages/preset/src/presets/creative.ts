import type { PresetDefinition } from "../config";

export const creative: PresetDefinition = {
  id: "creative",
  name: "Creative UIUX Showcase",
  description: "Visual-first portfolio with Storybook, blog, and bold theming",
  apps: {
    web: false,
    "landing-page": true,
    "api-gateway": false,
    studio: false,
    blog: true,
    admin: false,
    storybook: true,
    "sailor-docs": false,
  },
  features: {
    billing: false,
    ai: false,
    ecommerce: false,
    web3: false,
    community: false,
    blog: true,
    growth: false,
    search: false,
    sso: false,
    admin: false,
    analytics: true,
    newsletter: false,
    realtime: false,
    upload: true,
  },
  theme: "vibrant",
};
