import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { type DelegateResult, delegate } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface AuthCommandOptions {
  dryRun?: boolean;
  format?: string;
  interactive?: boolean;
}

/**
 * Format output based on requested format (json or human-readable)
 */
function formatOutput(
  result: DelegateResult | Record<string, any>,
  format?: string,
  label?: string,
) {
  if (format === "json") {
    const output = {
      command: label || "auth",
      ...(result && typeof result === "object" && "exitCode" in result
        ? { exitCode: result.exitCode }
        : {}),
      ...result,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    if (result && typeof result === "object" && "stdout" in result && result.stdout) {
      console.log(result.stdout);
    }
    if (
      result &&
      typeof result === "object" &&
      "stderr" in result &&
      result.stderr &&
      (result.exitCode ?? 0) !== 0
    ) {
      console.error(result.stderr);
    }
  }
}

/**
 * Mask sensitive key for display
 */
function maskKey(key: string | undefined, label?: string): string {
  if (!key) return "not set";
  if (key.length <= 8) return "***";
  return `${key.substring(0, 8)}*** (${label || key.length} chars)`;
}

/**
 * Detect auth provider from nebutra.config.ts
 */
function detectAuthProvider(): string {
  try {
    const configPath = resolve(process.cwd(), "nebutra.config.ts");
    const fs = require("node:fs");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      if (content.includes("clerk")) return "clerk";
      if (content.includes("better-auth")) return "better-auth";
    }
  } catch {
    // Ignore errors
  }
  return "clerk"; // Default to Clerk
}

/**
 * Handle 'nebutra auth status' command
 * Check current auth provider configuration
 */
async function handleAuthStatus(options: AuthCommandOptions) {
  logger.info("Checking authentication configuration...");

  const provider = detectAuthProvider();
  const status: Record<string, any> = {
    provider,
    configured: false,
    keys: {},
  };

  if (provider === "clerk") {
    status.keys = {
      CLERK_SECRET_KEY: maskKey(process.env.CLERK_SECRET_KEY, "secret"),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: maskKey(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        "publishable",
      ),
      CLERK_WEBHOOK_SECRET: maskKey(process.env.CLERK_WEBHOOK_SECRET, "webhook"),
    };
    status.configured =
      !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } else {
    status.keys = {
      BETTER_AUTH_SECRET: maskKey(process.env.BETTER_AUTH_SECRET, "secret"),
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "not set",
    };
    status.configured = !!process.env.BETTER_AUTH_SECRET;
  }

  if (!options.dryRun) {
    if (status.configured) {
      logger.success(`Auth provider configured: ${provider}`);
    } else {
      logger.warn(`Auth provider ${provider} is not fully configured`);
    }
  }

  formatOutput(status, options.format, "auth:status");
}

/**
 * Handle 'nebutra auth setup <provider>' command
 * Interactive wizard to configure auth provider
 */
async function handleAuthSetup(provider: string, options: AuthCommandOptions) {
  const validProviders = ["clerk", "better-auth"];

  if (!validProviders.includes(provider.toLowerCase())) {
    logger.error(`Invalid provider: ${provider}. Choose from: ${validProviders.join(", ")}`);
    process.exit(ExitCode.INVALID_ARGS);
  }

  const providerLower = provider.toLowerCase();
  logger.info(`Setting up ${providerLower} authentication...`);

  if (providerLower === "clerk") {
    logger.info("Clerk setup requires:");
    logger.info("1. A Clerk account (https://clerk.com)");
    logger.info("2. A Clerk application created");
    logger.info("3. API keys from the Clerk dashboard");
    logger.info("");
    logger.info("To complete setup:");
    logger.info("1. Go to https://dashboard.clerk.com");
    logger.info("2. Copy your Secret Key and Publishable Key");
    logger.info("3. Add them to .env.local:");
    logger.info('   CLERK_SECRET_KEY="sk_..."');
    logger.info('   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."');
    logger.info("");
    logger.info("Webhook setup (optional):");
    logger.info("1. In Clerk dashboard, go to Webhooks");
    logger.info("2. Create endpoint: https://yourdomain.com/api/webhooks/clerk");
    logger.info("3. Copy the signing secret to .env.local:");
    logger.info('   CLERK_WEBHOOK_SECRET="whsec_..."');
  } else {
    logger.info("Better Auth setup requires:");
    logger.info("1. Database URL configured (DATABASE_URL env var)");
    logger.info("2. A generated auth secret");
    logger.info("");
    logger.info("To complete setup:");
    logger.info("1. Ensure DATABASE_URL is set in .env.local");
    logger.info("2. Generate a new secret:");
    logger.info("   openssl rand -base64 32");
    logger.info("3. Add to .env.local:");
    logger.info('   BETTER_AUTH_SECRET="<generated_secret>"');
    logger.info('   BETTER_AUTH_URL="http://localhost:3000"');
    logger.info("");
    logger.info("4. Run database migration:");
    logger.info("   pnpm --filter @nebutra/web db:push");
  }

  if (!options.dryRun) {
    logger.success(`Setup instructions for ${providerLower} displayed above`);
  }

  const output = {
    provider: providerLower,
    setupGuide: `Complete setup by following the instructions above`,
    documentationUrl:
      providerLower === "clerk" ? "https://clerk.com/docs" : "https://www.better-auth.com",
  };

  formatOutput(output, options.format, "auth:setup");
}

/**
 * Handle 'nebutra auth keys' command
 * Show auth-related environment variables (masked)
 */
async function handleAuthKeys(options: AuthCommandOptions) {
  logger.info("Checking authentication keys and secrets...");

  const keys = {
    clerk: {
      CLERK_SECRET_KEY: maskKey(process.env.CLERK_SECRET_KEY, "secret key"),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: maskKey(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        "publishable key",
      ),
      CLERK_WEBHOOK_SECRET: maskKey(process.env.CLERK_WEBHOOK_SECRET, "webhook secret"),
    },
    betterAuth: {
      BETTER_AUTH_SECRET: maskKey(process.env.BETTER_AUTH_SECRET, "secret"),
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "not set",
    },
    common: {
      DATABASE_URL: maskKey(process.env.DATABASE_URL, "database url"),
      JWT_SECRET: maskKey(process.env.JWT_SECRET, "jwt secret"),
    },
  };

  const output = {
    keys,
    configured: {
      clerk: {
        secret: !!process.env.CLERK_SECRET_KEY,
        publishable: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      },
      betterAuth: {
        secret: !!process.env.BETTER_AUTH_SECRET,
        url: !!process.env.BETTER_AUTH_URL,
      },
    },
  };

  if (!options.dryRun) {
    const clerkConfigured = output.configured.clerk.secret && output.configured.clerk.publishable;
    const betterAuthConfigured =
      output.configured.betterAuth.secret && output.configured.betterAuth.url;

    if (!clerkConfigured && !betterAuthConfigured) {
      logger.warn("No authentication keys configured");
    } else {
      logger.info("Auth keys status:");
      if (clerkConfigured) logger.success("Clerk configured");
      if (betterAuthConfigured) logger.success("Better Auth configured");
    }
  }

  formatOutput(output, options.format, "auth:keys");
}

/**
 * Register the auth command group
 */
export function registerAuthCommand(program: Command) {
  const auth = program
    .command("auth")
    .description("Manage authentication configuration (Clerk or Better Auth)");

  // nebutra auth status
  auth
    .command("status")
    .description("Check current authentication provider configuration")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAuthStatus({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra auth setup <provider>
  auth
    .command("setup <provider>")
    .description("Configure Clerk or Better Auth (interactive wizard)")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (provider: string, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAuthSetup(provider, {
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra auth keys
  auth
    .command("keys")
    .description("Show authentication-related environment variables (masked)")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAuthKeys({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });
}
