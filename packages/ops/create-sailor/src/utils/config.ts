import fs from "node:fs";
import path from "node:path";

export interface CustomEndpoint {
  name: string;
  baseURL: string;
  apiKeyEnvName: string;
}

export type AiMode = "gateway" | "direct" | "custom" | "none";

export interface AiRoutingConfig {
  profile: "multi-provider-gateway" | "direct-adapters" | "openai-compatible" | "disabled";
  providerSeed: string[];
  runtimeGovernance: boolean;
}

export type DocsFramework =
  | "fumadocs"
  | "mintlify"
  | "docusaurus"
  | "nextra"
  | "vitepress"
  | "none";

export type Region = "global" | "cn" | "hybrid";

export interface NebutraConfig {
  region: Region;
  orm: "prisma" | "drizzle" | "none";
  database: "postgresql" | "mysql" | "sqlite" | "none";
  payment: "stripe" | "lemon" | "lemonsqueezy" | "wechat" | "alipay" | "none";
  aiMode?: AiMode;
  aiRouting?: AiRoutingConfig;
  aiProviders: string[];
  customAiEndpoint?: CustomEndpoint;
  deployTarget: "vercel" | "railway" | "cloudflare" | "selfhost" | "none";
  i18n: boolean;
  docs?: DocsFramework;
  email?: string;
  storage?: string;
  monitoring?: string;
  analytics?: string;
  sms?: string;
  queue?: "qstash" | "bullmq" | "upstash" | "sqs" | "none";
  search?: "meilisearch" | "typesense" | "algolia" | "pgvector" | "none";
  cache?: "upstash-redis" | "vercel-kv" | "redis" | "dragonfly" | "none";
  notifications?: "novu" | "knock" | "custom" | "none";
  webhooks?: "svix" | "custom" | "none";
  cms?: "sanity" | "contentful" | "strapi" | "none";
  featureFlags?: "vercel-flags" | "growthbook" | "configcat" | "none";
  captcha?: "turnstile" | "hcaptcha" | "aliyun-slide" | "none";
  mcp?: "on" | "off";
  metering?: "auto" | "on" | "off";
  billingMode?: "usage" | "seat" | "credits";
  idp?: "clerk" | "oauth-server";
  accessGate?: "none" | "invite";
  // Wave 3-5 feature toggles. Default to enabled for global; some flip
  // based on region (e.g. chinaCompliance auto-true when region=cn).
  cronJobs?: boolean;
  auditLog?: boolean;
  apiKeys?: boolean;
  commandPalette?: boolean;
  cookieConsent?: boolean;
  legalPages?: boolean;
  chinaCompliance?: boolean;
}

export async function writeNebutraConfig(targetDir: string, config: NebutraConfig) {
  const configPath = path.join(targetDir, "nebutra.config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}
