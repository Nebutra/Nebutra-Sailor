import fs from "node:fs";
import path from "node:path";

export interface CustomEndpoint {
  name: string;
  baseURL: string;
  apiKeyEnvName: string;
}

export type DocsFramework =
  | "fumadocs"
  | "mintlify"
  | "docusaurus"
  | "nextra"
  | "vitepress"
  | "none";

export interface NebutraConfig {
  orm: "prisma" | "drizzle" | "none";
  database: "postgresql" | "mysql" | "sqlite" | "none";
  payment: "stripe" | "lemonsqueezy" | "none";
  aiProviders: string[];
  customAiEndpoint?: CustomEndpoint;
  deployTarget: "vercel" | "railway" | "cloudflare" | "selfhost" | "none";
  i18n: boolean;
  docs?: DocsFramework;
}

export async function writeNebutraConfig(targetDir: string, config: NebutraConfig) {
  const configPath = path.join(targetDir, "nebutra.config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}
