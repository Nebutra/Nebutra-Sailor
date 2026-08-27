import fs from "node:fs";
import path from "node:path";

interface EnvConfig {
  databaseUrl: string | symbol;
  clerkPublishable: string | symbol;
  clerkSecret: string | symbol;
}

function hasEnvVar(content: string, name: string): boolean {
  return new RegExp(`^\\s*${name}\\s*=`, "m").test(content);
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

export async function injectEnv(targetDir: string, envConfig: EnvConfig) {
  // Write base env to the root of the initialized project
  const rootEnvPath = path.join(targetDir, ".env");
  const localEnvPath = path.join(targetDir, ".env.local");
  const rootEnv = fs.existsSync(rootEnvPath) ? fs.readFileSync(rootEnvPath, "utf8") : "";
  const localEnv = fs.existsSync(localEnvPath) ? fs.readFileSync(localEnvPath, "utf8") : "";
  const visibleEnv = `${rootEnv}\n${localEnv}`;
  const missingLines = [
    {
      name: "DATABASE_URL",
      value: String(envConfig.databaseUrl),
    },
    {
      name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      value: String(envConfig.clerkPublishable),
    },
    {
      name: "CLERK_SECRET_KEY",
      value: String(envConfig.clerkSecret),
    },
    {
      name: "NEXT_PUBLIC_SITE_URL",
      value: "http://localhost:3000",
    },
  ]
    .filter((entry) => !hasEnvVar(visibleEnv, entry.name))
    .map((entry) => `${entry.name}="${entry.value}"`);

  if (missingLines.length === 0) return;

  const envTemplate = `# Automatically injected by create-sailor\n${missingLines.join("\n")}\n`;

  // Race-safe: always open/write without TOCTOU existsSync.
  try {
    const existing = fs.readFileSync(localEnvPath, "utf8");
    const prefix = ensureTrailingNewline(existing);
    fs.writeFileSync(localEnvPath, `${prefix}\n${envTemplate}`);
  } catch {
    try {
      // Prefer local when root also missing; ignore root existence race.
      fs.writeFileSync(localEnvPath, envTemplate, { flag: "wx" });
    } catch {
      const existing = fs.readFileSync(localEnvPath, "utf8");
      fs.writeFileSync(localEnvPath, `${ensureTrailingNewline(existing)}\n${envTemplate}`);
    }
  }
}
