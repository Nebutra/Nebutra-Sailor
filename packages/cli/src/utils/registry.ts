export interface FeatureDependency {
  name: string;
  version: string;
}

export interface FeatureEnv {
  key: string;
  description: string;
}

export interface FeatureFile {
  path: string;
  content: string;
}

export interface FeatureProviderDescriptor {
  id: string;
  description: string;
  dependencies?: FeatureDependency[];
  devDependencies?: FeatureDependency[];
  env?: FeatureEnv[];
}

export interface FeatureDescriptor {
  name: string;
  description: string;
  dependencies?: FeatureDependency[];
  devDependencies?: FeatureDependency[];
  env?: FeatureEnv[];
  providers?: FeatureProviderDescriptor[];
  files?: FeatureFile[];
  envFile?: string;
}

const GENERIC_FEATURE_SOURCE = `const featureEnvKeys = {{envKeysArray}} as const;

export const platformFeature = {
  name: "{{feature}}",
  provider: "{{provider}}",
} as const;

export function assertFeatureEnv(env: NodeJS.ProcessEnv = process.env) {
  const missing = featureEnvKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(\`Missing {{feature}} environment variables: \${missing.join(", ")}\`);
  }
}

export function getFeatureProvider() {
  return {
    ...platformFeature,
    envKeys: featureEnvKeys,
  };
}
`;

const GENERIC_FEATURE_README = `# {{feature}} Feature

Installed by \`nebutra add {{feature}}\`.

- Provider: \`{{provider}}\`
- Provider details: {{providerDescription}}
- Required env keys: {{envKeysCsv}}

Next steps:
1. Set the required environment variables in \`{{envFile}}\`.
2. Wire this starter into the generated package or app surface.
3. Replace the placeholder helper with your production adapter.
`;

function genericFeatureFiles(feature: string): FeatureFile[] {
  return [
    {
      path: `packages/${feature}/src/index.ts`,
      content: GENERIC_FEATURE_SOURCE,
    },
    {
      path: `packages/${feature}/README.md`,
      content: GENERIC_FEATURE_README,
    },
  ];
}

const FEATURE_REGISTRY: Record<string, FeatureDescriptor> = {
  queue: {
    name: "queue",
    description: "Background job queue starter for Nebutra-style monorepos.",
    envFile: ".env.local",
    providers: [
      {
        id: "upstash",
        description: "HTTP queue transport powered by Upstash QStash.",
        dependencies: [{ name: "@upstash/qstash", version: "latest" }],
        env: [
          { key: "QSTASH_TOKEN", description: "Upstash QStash REST token" },
          {
            key: "QSTASH_CURRENT_SIGNING_KEY",
            description: "Upstash current signing key for webhook verification",
          },
          {
            key: "QSTASH_NEXT_SIGNING_KEY",
            description: "Upstash next signing key for webhook rotation",
          },
        ],
      },
      {
        id: "bullmq",
        description: "Redis-backed worker queue powered by BullMQ.",
        dependencies: [
          { name: "bullmq", version: "latest" },
          { name: "ioredis", version: "latest" },
        ],
        env: [{ key: "REDIS_URL", description: "Redis connection string for BullMQ workers" }],
      },
    ],
    files: [
      {
        path: "packages/queue/src/index.ts",
        content: `const queueEnvKeys = {{envKeysArray}} as const;

export const queueFeature = {
  name: "queue",
  provider: "{{provider}}",
} as const;

export function assertQueueEnv(env: NodeJS.ProcessEnv = process.env) {
  const missing = queueEnvKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(\`Missing queue environment variables: \${missing.join(", ")}\`);
  }
}

export function getQueueProvider() {
  return {
    ...queueFeature,
    envKeys: queueEnvKeys,
  };
}
`,
      },
      {
        path: "packages/queue/README.md",
        content: `# Queue Feature

Installed by \`nebutra add queue\`.

- Provider: \`{{provider}}\`
- Provider details: {{providerDescription}}
- Required env keys: {{envKeysCsv}}

Next steps:
1. Set the required environment variables in \`{{envFile}}\`.
2. Wire this starter into your app or worker runtime.
3. Replace the placeholder provider helpers with production job handlers.
`,
      },
    ],
  },
  search: {
    name: "search",
    description: "Search service starter for Nebutra-style monorepos.",
    envFile: ".env.local",
    providers: [
      {
        id: "meilisearch",
        description: "Meilisearch client starter for full-text indexing.",
        dependencies: [{ name: "meilisearch", version: "latest" }],
        env: [
          { key: "MEILISEARCH_HOST", description: "Meilisearch base URL" },
          { key: "MEILISEARCH_ADMIN_KEY", description: "Meilisearch admin API key" },
        ],
      },
      {
        id: "typesense",
        description: "Typesense client starter for typed search queries.",
        dependencies: [{ name: "typesense", version: "latest" }],
        env: [
          { key: "TYPESENSE_HOST", description: "Typesense host URL" },
          { key: "TYPESENSE_API_KEY", description: "Typesense admin API key" },
          { key: "TYPESENSE_COLLECTION", description: "Default Typesense collection name" },
        ],
      },
    ],
    files: [
      {
        path: "packages/search/src/index.ts",
        content: `const searchEnvKeys = {{envKeysArray}} as const;

export const searchFeature = {
  name: "search",
  provider: "{{provider}}",
} as const;

export function assertSearchEnv(env: NodeJS.ProcessEnv = process.env) {
  const missing = searchEnvKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(\`Missing search environment variables: \${missing.join(", ")}\`);
  }
}

export function getSearchProvider() {
  return {
    ...searchFeature,
    envKeys: searchEnvKeys,
  };
}
`,
      },
      {
        path: "packages/search/README.md",
        content: `# Search Feature

Installed by \`nebutra add search\`.

- Provider: \`{{provider}}\`
- Provider details: {{providerDescription}}
- Required env keys: {{envKeysCsv}}

Next steps:
1. Add credentials to \`{{envFile}}\`.
2. Point your indexing jobs at the configured provider.
3. Replace the placeholder helpers with production query/index code.
`,
      },
    ],
  },
  cache: {
    name: "cache",
    description: "Cache adapter starter aligned with create-sailor cache providers.",
    envFile: ".env.local",
    providers: [
      {
        id: "upstash-redis",
        description: "Serverless Redis cache powered by Upstash.",
        dependencies: [{ name: "@upstash/redis", version: "latest" }],
        env: [{ key: "UPSTASH_REDIS_REST_URL", description: "Upstash Redis REST URL" }],
      },
      {
        id: "vercel-kv",
        description: "Vercel KV compatible cache adapter.",
        dependencies: [{ name: "@vercel/kv", version: "latest" }],
        env: [{ key: "KV_REST_API_URL", description: "Vercel KV REST API URL" }],
      },
      {
        id: "redis",
        description: "Self-hosted Redis cache adapter.",
        dependencies: [{ name: "ioredis", version: "latest" }],
        env: [{ key: "REDIS_URL", description: "Redis connection URL" }],
      },
      {
        id: "dragonfly",
        description: "Dragonfly Redis-compatible cache adapter.",
        dependencies: [{ name: "ioredis", version: "latest" }],
        env: [{ key: "DRAGONFLY_URL", description: "Dragonfly connection URL" }],
      },
    ],
    files: genericFeatureFiles("cache"),
  },
  notifications: {
    name: "notifications",
    description: "Notification workflow starter for product and lifecycle messages.",
    envFile: ".env.local",
    providers: [
      {
        id: "novu",
        description: "Novu notification workflow provider.",
        dependencies: [{ name: "@novu/node", version: "latest" }],
        env: [{ key: "NOVU_API_KEY", description: "Novu API key" }],
      },
      {
        id: "knock",
        description: "Knock notification workflow provider.",
        dependencies: [{ name: "@knocklabs/node", version: "latest" }],
        env: [{ key: "KNOCK_API_KEY", description: "Knock API key" }],
      },
      {
        id: "custom",
        description: "Custom notification adapter surface.",
        env: [{ key: "NOTIFICATIONS_WEBHOOK_URL", description: "Custom notification webhook URL" }],
      },
    ],
    files: genericFeatureFiles("notifications"),
  },
  webhooks: {
    name: "webhooks",
    description: "Outbound webhook starter with provider-specific signing hooks.",
    envFile: ".env.local",
    providers: [
      {
        id: "svix",
        description: "Svix-backed outbound webhook delivery.",
        dependencies: [{ name: "svix", version: "latest" }],
        env: [{ key: "SVIX_AUTH_TOKEN", description: "Svix authentication token" }],
      },
      {
        id: "custom",
        description: "Custom outbound webhook adapter.",
        env: [{ key: "WEBHOOK_SIGNING_SECRET", description: "Webhook signing secret" }],
      },
    ],
    files: genericFeatureFiles("webhooks"),
  },
  cms: {
    name: "cms",
    description: "Headless CMS integration starter for marketing and docs content.",
    envFile: ".env.local",
    providers: [
      {
        id: "sanity",
        description: "Sanity content lake client starter.",
        dependencies: [{ name: "next-sanity", version: "latest" }],
        env: [
          { key: "NEXT_PUBLIC_SANITY_PROJECT_ID", description: "Sanity project ID" },
          { key: "NEXT_PUBLIC_SANITY_DATASET", description: "Sanity dataset" },
        ],
      },
      {
        id: "contentful",
        description: "Contentful content API starter.",
        dependencies: [{ name: "contentful", version: "latest" }],
        env: [
          { key: "CONTENTFUL_SPACE_ID", description: "Contentful space ID" },
          { key: "CONTENTFUL_ACCESS_TOKEN", description: "Contentful access token" },
        ],
      },
      {
        id: "strapi",
        description: "Strapi REST client starter.",
        env: [
          { key: "STRAPI_URL", description: "Strapi base URL" },
          { key: "STRAPI_API_TOKEN", description: "Strapi API token" },
        ],
      },
    ],
    files: genericFeatureFiles("cms"),
  },
  "feature-flags": {
    name: "feature-flags",
    description: "Feature flag starter for gradual rollout and runtime controls.",
    envFile: ".env.local",
    providers: [
      {
        id: "vercel-flags",
        description: "Vercel Flags SDK starter.",
        dependencies: [{ name: "@vercel/flags", version: "latest" }],
        env: [{ key: "FLAGS_SECRET", description: "Feature flag signing secret" }],
      },
      {
        id: "growthbook",
        description: "GrowthBook feature flag client starter.",
        dependencies: [{ name: "@growthbook/growthbook", version: "latest" }],
        env: [{ key: "GROWTHBOOK_CLIENT_KEY", description: "GrowthBook client key" }],
      },
      {
        id: "configcat",
        description: "ConfigCat feature flag client starter.",
        dependencies: [{ name: "configcat-node", version: "latest" }],
        env: [{ key: "CONFIGCAT_SDK_KEY", description: "ConfigCat SDK key" }],
      },
    ],
    files: genericFeatureFiles("feature-flags"),
  },
  captcha: {
    name: "captcha",
    description: "Captcha verification starter for abuse prevention.",
    envFile: ".env.local",
    providers: [
      {
        id: "turnstile",
        description: "Cloudflare Turnstile verification surface.",
        env: [
          { key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", description: "Turnstile site key" },
          { key: "TURNSTILE_SECRET_KEY", description: "Turnstile secret key" },
        ],
      },
      {
        id: "hcaptcha",
        description: "hCaptcha verification surface.",
        env: [
          { key: "NEXT_PUBLIC_HCAPTCHA_SITE_KEY", description: "hCaptcha site key" },
          { key: "HCAPTCHA_SECRET_KEY", description: "hCaptcha secret key" },
        ],
      },
      {
        id: "aliyun-slide",
        description: "Aliyun slide captcha verification surface.",
        env: [
          { key: "ALIYUN_CAPTCHA_SCENE_ID", description: "Aliyun captcha scene ID" },
          { key: "ALIYUN_CAPTCHA_SECRET", description: "Aliyun captcha secret" },
        ],
      },
    ],
    files: genericFeatureFiles("captcha"),
  },
};

export function listFeatureDescriptors(): FeatureDescriptor[] {
  return Object.values(FEATURE_REGISTRY);
}

export function listFeatureNames(): string[] {
  return Object.keys(FEATURE_REGISTRY);
}

export async function getFeatureDescriptor(featureName: string): Promise<FeatureDescriptor | null> {
  return FEATURE_REGISTRY[featureName] ?? null;
}
