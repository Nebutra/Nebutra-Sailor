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
