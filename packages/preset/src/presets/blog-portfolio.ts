import type { PresetDefinition } from "../config";

export const blogPortfolio: PresetDefinition = {
  id: "blog-portfolio",
  name: "Personal Blog/Portfolio",
  description: "Clean blog with CMS, search, newsletter, and community",
  apps: {
    web: false,
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
    growth: false,
    search: true,
    sso: false,
    admin: false,
    analytics: false,
    newsletter: true,
    realtime: false,
    upload: false,
  },
  theme: "minimal",
};
