import fs from "node:fs";
import path from "node:path";

export interface NebutraConfig {
  applicationType: "saas" | "web3" | "ecommerce" | "full";
  orm: "prisma" | "drizzle" | "none";
  database: "postgresql" | "mysql" | "sqlite" | "none";
  payment: "stripe" | "lemonsqueezy" | "none";
  aiProvider: "openai" | "anthropic" | "none";
  i18n: boolean;
}

export async function writeNebutraConfig(targetDir: string, config: NebutraConfig) {
  const configPath = path.join(targetDir, "nebutra.config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}
