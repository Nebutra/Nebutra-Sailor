import type { Command } from "commander";
import pc from "picocolors";
import { type DelegateResult, delegate } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface BillingCommandOptions {
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
      command: label || "billing",
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
 * Mask sensitive API key for display
 */
function maskApiKey(key: string | undefined, label?: string): string {
  if (!key) return "not set";
  if (key.length <= 8) return "***";
  return `${key.substring(0, 8)}*** (${label || key.length} chars)`;
}

/**
 * Provider configuration information
 */
const PROVIDERS = {
  stripe: {
    name: "Stripe",
    keyVars: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
    webhookUrl: "/api/webhooks/stripe",
    setupUrl: "https://dashboard.stripe.com",
  },
  lemonsqueezy: {
    name: "Lemon Squeezy",
    keyVars: ["LEMONSQUEEZY_API_KEY"],
    webhookUrl: "/api/webhooks/lemonsqueezy",
    setupUrl: "https://app.lemonsqueezy.com/settings/api",
  },
  polar: {
    name: "Polar",
    keyVars: ["POLAR_ACCESS_TOKEN"],
    webhookUrl: "/api/webhooks/polar",
    setupUrl: "https://app.polar.sh/settings/api",
  },
  chinapay: {
    name: "ChinaPay",
    keyVars: ["CHINAPAY_MERCHANT_ID", "CHINAPAY_SECRET_KEY"],
    webhookUrl: "/api/webhooks/chinapay",
    setupUrl: "https://www.chinapay.com",
  },
};

/**
 * Handle 'nebutra billing status' command
 * Check which payment providers are configured
 */
async function handleBillingStatus(options: BillingCommandOptions) {
  logger.info("Checking payment provider configuration...");

  const providers = Object.entries(PROVIDERS).map(([id, provider]) => {
    const configured = provider.keyVars.every((keyVar) => process.env[keyVar]);
    return {
      id,
      name: provider.name,
      configured,
      keys: provider.keyVars.map((keyVar) => ({
        name: keyVar,
        value: maskApiKey(process.env[keyVar], "key"),
      })),
    };
  });

  const configuredProviders = providers.filter((p) => p.configured);
  const output = {
    providers,
    configuredCount: configuredProviders.length,
    totalProviders: providers.length,
    configuredList: configuredProviders.map((p) => p.name),
  };

  if (!options.dryRun) {
    if (output.configuredCount === 0) {
      logger.warn("No payment providers configured. Set API keys to enable billing.");
    } else {
      logger.success(`${output.configuredCount} payment provider(s) configured`);
    }
  }

  formatOutput(output, options.format, "billing:status");
}

/**
 * Handle 'nebutra billing setup <provider>' command
 * Interactive wizard to configure payment provider
 */
async function handleBillingSetup(provider: string, options: BillingCommandOptions) {
  const validProviders = Object.keys(PROVIDERS);

  if (!validProviders.includes(provider.toLowerCase())) {
    logger.error(`Invalid provider: ${provider}. Choose from: ${validProviders.join(", ")}`);
    process.exit(ExitCode.INVALID_ARGS);
  }

  const providerLower = provider.toLowerCase();
  const providerConfig = PROVIDERS[providerLower as keyof typeof PROVIDERS];

  logger.info(`Setting up ${providerConfig.name} payment provider...`);
  logger.info("");
  logger.info("Setup steps:");
  logger.info(`1. Go to ${providerConfig.setupUrl}`);
  logger.info("2. Create or log in to your account");
  logger.info("3. Generate API credentials");
  logger.info("4. Add the following to .env.local:");
  logger.info("");

  providerConfig.keyVars.forEach((keyVar) => {
    logger.info(`   ${keyVar}="<your_${keyVar.toLowerCase()}>"`.padStart(45));
  });

  logger.info("");
  logger.info("5. (Optional) Configure webhook in provider dashboard:");
  logger.info(`   Webhook URL: https://yourdomain.com${providerConfig.webhookUrl}`);

  if (!options.dryRun) {
    logger.success(`Setup instructions for ${providerConfig.name} displayed above`);
  }

  const output = {
    provider: providerLower,
    name: providerConfig.name,
    requiredKeys: providerConfig.keyVars,
    webhookUrl: providerConfig.webhookUrl,
    setupGuide: "Follow the instructions above to complete setup",
    documentationUrl: providerConfig.setupUrl,
  };

  formatOutput(output, options.format, "billing:setup");
}

/**
 * Handle 'nebutra billing webhooks' command
 * Show webhook endpoints for each provider
 */
async function handleBillingWebhooks(options: BillingCommandOptions) {
  logger.info("Checking billing webhook configuration...");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com";

  const webhooks = Object.entries(PROVIDERS).map(([id, provider]) => ({
    provider: id,
    name: provider.name,
    url: `${baseUrl}${provider.webhookUrl}`,
    endpoint: provider.webhookUrl,
    configured: provider.keyVars.every((keyVar) => process.env[keyVar]),
  }));

  const output = {
    baseUrl,
    webhooks,
    configurationSteps: [
      "1. Set NEXT_PUBLIC_APP_URL in .env.local to your domain",
      "2. Copy the webhook URL for each provider",
      "3. Configure in the provider's dashboard",
      "4. Ensure the API key is also set",
    ],
  };

  if (!options.dryRun) {
    logger.info("Webhook endpoints:");
    webhooks.forEach((hook) => {
      if (hook.configured) {
        logger.success(`${hook.name}: configured`);
      } else {
        logger.warn(`${hook.name}: not configured (missing API key)`);
      }
    });
  }

  formatOutput(output, options.format, "billing:webhooks");
}

/**
 * Register the billing command group
 */
export function registerBillingCommand(program: Command) {
  const billing = program
    .command("billing")
    .description("Manage payment providers and billing configuration");

  // nebutra billing status
  billing
    .command("status")
    .description("Check which payment providers are configured")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBillingStatus({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra billing setup <provider>
  billing
    .command("setup <provider>")
    .description("Configure payment provider (Stripe, Lemon Squeezy, Polar, or ChinaPay)")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (provider: string, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBillingSetup(provider, {
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra billing webhooks
  billing
    .command("webhooks")
    .description("Show webhook endpoints for each payment provider")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleBillingWebhooks({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });
}
