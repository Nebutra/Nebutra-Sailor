import fs from "node:fs";
import path from "node:path";

interface EnvConfig {
  databaseUrl: string | symbol;
  clerkPublishable: string | symbol;
  clerkSecret: string | symbol;
}

export async function injectEnv(targetDir: string, envConfig: EnvConfig) {
  const envTemplate = `# Automatically injected by create-sailor
DATABASE_URL="${String(envConfig.databaseUrl)}"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="${String(envConfig.clerkPublishable)}"
CLERK_SECRET_KEY="${String(envConfig.clerkSecret)}"

NEXT_PUBLIC_SITE_URL="http://localhost:3000"
`;

  // Write base env to the root of the initialized project
  const rootEnvPath = path.join(targetDir, ".env");
  const localEnvPath = path.join(targetDir, ".env.local");

  if (!fs.existsSync(rootEnvPath) && !fs.existsSync(localEnvPath)) {
    fs.writeFileSync(localEnvPath, envTemplate);
  } else {
    // Append instead of overwriting if files exist from template clone
    fs.appendFileSync(localEnvPath, "\n" + envTemplate);
  }
}
