import { resolve } from "node:path";
import type { Command } from "commander";
import type { DelegateResult } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

interface AuthCommandOptions {
  dryRun?: boolean;
  format?: string;
  interactive?: boolean;
}

interface AuthStatus {
  provider: string;
  configured: boolean;
  keys: Record<string, string>;
}

/**
 * Format output based on requested format (json or human-readable)
 */
function formatOutput(
  result: DelegateResult | Record<string, unknown>,
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
      if (content.includes("nextauth")) return "nextauth";
      if (content.includes("supabase")) return "supabase";
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
  const status: AuthStatus = {
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
  } else if (provider === "better-auth") {
    status.keys = {
      BETTER_AUTH_SECRET: maskKey(process.env.BETTER_AUTH_SECRET, "secret"),
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "not set",
    };
    status.configured = !!process.env.BETTER_AUTH_SECRET;
  } else if (provider === "nextauth") {
    status.keys = {
      AUTH_SECRET: maskKey(process.env.AUTH_SECRET, "secret"),
      NEXTAUTH_SECRET: maskKey(process.env.NEXTAUTH_SECRET, "legacy secret"),
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
      AUTH_URL: process.env.AUTH_URL || "not set",
      GOOGLE_CLIENT_ID: maskKey(process.env.GOOGLE_CLIENT_ID, "google client"),
      GITHUB_CLIENT_ID: maskKey(process.env.GITHUB_CLIENT_ID, "github client"),
    };
    status.configured = !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  } else {
    status.keys = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "anon"),
      SUPABASE_URL: process.env.SUPABASE_URL || "not set",
      SUPABASE_ANON_KEY: maskKey(process.env.SUPABASE_ANON_KEY, "anon"),
      SUPABASE_SERVICE_ROLE_KEY: maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY, "service role"),
      SUPABASE_WEBHOOK_SECRET: maskKey(process.env.SUPABASE_WEBHOOK_SECRET, "webhook"),
    };
    status.configured = !!(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
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
  const validProviders = ["clerk", "better-auth", "nextauth", "supabase"];

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
  } else if (providerLower === "better-auth") {
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
  } else if (providerLower === "nextauth") {
    logger.info("NextAuth / Auth.js setup requires:");
    logger.info("1. A generated Auth.js secret");
    logger.info("2. NEXTAUTH_URL or AUTH_URL pointing at the web app origin");
    logger.info("3. OAuth provider credentials for each enabled provider");
    logger.info("");
    logger.info("To complete setup:");
    logger.info("1. Generate a new secret:");
    logger.info("   openssl rand -base64 32");
    logger.info("2. Add to the production environment:");
    logger.info('   AUTH_PROVIDER="nextauth"');
    logger.info('   NEXT_PUBLIC_AUTH_PROVIDER="nextauth"');
    logger.info('   AUTH_SECRET="<generated_secret>"');
    logger.info('   NEXTAUTH_URL="https://app.nebutra.com"');
    logger.info('   GOOGLE_CLIENT_ID="..."');
    logger.info('   GOOGLE_CLIENT_SECRET="..."');
  } else {
    logger.info("Supabase Auth setup requires:");
    logger.info("1. Supabase project URL");
    logger.info("2. Public anon key for browser auth");
    logger.info("3. Service role key for server-side user/session validation");
    logger.info("");
    logger.info("To complete setup:");
    logger.info('   AUTH_PROVIDER="supabase"');
    logger.info('   NEXT_PUBLIC_AUTH_PROVIDER="supabase"');
    logger.info('   NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"');
    logger.info('   NEXT_PUBLIC_SUPABASE_ANON_KEY="..."');
    logger.info('   SUPABASE_URL="https://xxx.supabase.co"');
    logger.info('   SUPABASE_ANON_KEY="..."');
    logger.info('   SUPABASE_SERVICE_ROLE_KEY="..."');
  }

  if (!options.dryRun) {
    logger.success(`Setup instructions for ${providerLower} displayed above`);
  }

  const output = {
    provider: providerLower,
    setupGuide: `Complete setup by following the instructions above`,
    documentationUrl:
      providerLower === "clerk"
        ? "https://clerk.com/docs"
        : providerLower === "better-auth"
          ? "https://www.better-auth.com"
          : providerLower === "nextauth"
            ? "https://authjs.dev"
            : "https://supabase.com/docs/guides/auth",
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
    nextAuth: {
      AUTH_SECRET: maskKey(process.env.AUTH_SECRET, "secret"),
      NEXTAUTH_SECRET: maskKey(process.env.NEXTAUTH_SECRET, "legacy secret"),
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
      AUTH_URL: process.env.AUTH_URL || "not set",
      GOOGLE_CLIENT_ID: maskKey(process.env.GOOGLE_CLIENT_ID, "google client"),
      GITHUB_CLIENT_ID: maskKey(process.env.GITHUB_CLIENT_ID, "github client"),
    },
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "anon"),
      SUPABASE_URL: process.env.SUPABASE_URL || "not set",
      SUPABASE_ANON_KEY: maskKey(process.env.SUPABASE_ANON_KEY, "anon"),
      SUPABASE_SERVICE_ROLE_KEY: maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY, "service role"),
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
      nextAuth: {
        secret: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
        url: !!(process.env.NEXTAUTH_URL || process.env.AUTH_URL),
      },
      supabase: {
        url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKey: !!(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  };

  if (!options.dryRun) {
    const clerkConfigured = output.configured.clerk.secret && output.configured.clerk.publishable;
    const betterAuthConfigured =
      output.configured.betterAuth.secret && output.configured.betterAuth.url;
    const nextAuthConfigured = output.configured.nextAuth.secret && output.configured.nextAuth.url;
    const supabaseConfigured =
      output.configured.supabase.url &&
      output.configured.supabase.anonKey &&
      output.configured.supabase.serviceRole;

    if (!clerkConfigured && !betterAuthConfigured && !nextAuthConfigured && !supabaseConfigured) {
      logger.warn("No authentication keys configured");
    } else {
      logger.info("Auth keys status:");
      if (clerkConfigured) logger.success("Clerk configured");
      if (betterAuthConfigured) logger.success("Better Auth configured");
      if (nextAuthConfigured) logger.success("NextAuth configured");
      if (supabaseConfigured) logger.success("Supabase configured");
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
    .description("Manage authentication configuration (Clerk, Better Auth, NextAuth, or Supabase)");

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
    .description("Configure Clerk, Better Auth, NextAuth, or Supabase (interactive wizard)")
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
