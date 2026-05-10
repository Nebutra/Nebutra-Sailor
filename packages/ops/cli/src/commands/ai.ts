import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import type { DelegateResult } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";
import { createSailorValueDomains } from "./metadata.js";

interface AiCommandOptions {
  dryRun?: boolean;
  format?: string;
  interactive?: boolean;
}

interface AiProviderCatalogItem {
  id: string;
  name: string;
  envVars: string[];
}

interface AiRouteConfig {
  policy: string;
  fallback: string[];
  updatedAt: string;
}

interface AiGovernanceConfig {
  providers?: Record<
    string,
    {
      enabled: boolean;
      envVars: string[];
      enabledAt?: string;
      disabledAt?: string;
    }
  >;
  gateway?: {
    enabled: boolean;
    mode: "local";
    initializedAt: string;
    updatedAt: string;
  };
  routes?: Record<string, AiRouteConfig>;
}

type JsonObject = Record<string, unknown>;
type NormalizedAiGovernanceConfig = AiGovernanceConfig & {
  providers: NonNullable<AiGovernanceConfig["providers"]>;
  routes: NonNullable<AiGovernanceConfig["routes"]>;
};

interface NebutraConfig {
  [key: string]: unknown;
  ai?: AiGovernanceConfig;
}

interface LegacyProviderConfig {
  configured: boolean;
}

interface ProviderCommandOptions extends AiCommandOptions {
  env?: boolean;
}

interface RouteSetOptions extends AiCommandOptions {
  policy?: string;
  fallback?: string;
}

interface CommanderOptionSource {
  [key: string]: unknown;
  opts?: () => Record<string, unknown>;
  optsWithGlobals?: () => Record<string, unknown>;
}

const CONFIG_FILE = "nebutra.config.json";
const AI_PROVIDER_IDS = createSailorValueDomains.ai.filter((id) => id !== "none");
const PROVIDER_ENV_OVERRIDES: Record<string, string[]> = {
  "aws-bedrock": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
  "azure-openai": ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
  "gcp-vertex": ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT"],
  "vercel-gateway": ["AI_GATEWAY_API_KEY"],
  "volcengine-ark": ["VOLCENGINE_ARK_API_KEY"],
  bailian: ["DASHSCOPE_API_KEY"],
  litellm: ["LITELLM_API_KEY", "LITELLM_BASE_URL"],
  portkey: ["PORTKEY_API_KEY"],
  custom: ["AI_CUSTOM_API_KEY", "AI_CUSTOM_BASE_URL"],
};

/**
 * Format output based on requested format (json or human-readable)
 */
function formatOutput(result: DelegateResult | JsonObject, format?: string, label?: string) {
  if (format === "json") {
    const output = {
      command: label || "ai",
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

function providerDisplayName(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function defaultProviderEnvVars(id: string): string[] {
  if (PROVIDER_ENV_OVERRIDES[id]) return PROVIDER_ENV_OVERRIDES[id];
  return [`${id.replace(/-/g, "_").toUpperCase()}_API_KEY`];
}

function getProviderCatalog(): Record<string, AiProviderCatalogItem> {
  return Object.fromEntries(
    AI_PROVIDER_IDS.map((id) => [
      id,
      {
        id,
        name: providerDisplayName(id),
        envVars: defaultProviderEnvVars(id),
      },
    ]),
  );
}

function getConfigPath(): string {
  return resolve(process.cwd(), CONFIG_FILE);
}

function readNebutraConfig(): NebutraConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return {
      $schema: "https://nebutra.com/schema.json",
    };
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as NebutraConfig;
  } catch (error) {
    logger.error(
      `Failed to parse ${CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(ExitCode.ERROR);
  }
}

function writeNebutraConfig(config: NebutraConfig) {
  writeFileSync(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`);
}

function ensureAiConfig(config: NebutraConfig): NormalizedAiGovernanceConfig {
  config.ai = {
    providers: {},
    routes: {},
    ...config.ai,
  };
  config.ai.providers = { ...config.ai.providers };
  config.ai.routes = { ...config.ai.routes };
  return config.ai as NormalizedAiGovernanceConfig;
}

function validateProviderIds(providers: string[]): string[] {
  const catalog = getProviderCatalog();
  const normalized = [...new Set(providers.map((provider) => provider.toLowerCase()))];
  const invalid = normalized.filter((provider) => !catalog[provider]);

  if (invalid.length > 0) {
    logger.error(
      `Unknown AI provider(s): ${invalid.join(", ")}. Valid providers: ${Object.keys(catalog).join(", ")}`,
    );
    process.exit(ExitCode.INVALID_ARGS);
  }

  return normalized;
}

function parseFallbackList(fallback?: string): string[] {
  const values =
    fallback
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

  if (values.length === 0) {
    logger.error("Route fallback cannot be empty. Use --fallback provider:model,provider:model");
    process.exit(ExitCode.INVALID_ARGS);
  }

  const invalid = values.filter((item) => !/^[a-z0-9-]+:[^,\s]+$/i.test(item));
  if (invalid.length > 0) {
    logger.error(`Invalid fallback target(s): ${invalid.join(", ")}. Expected provider:model.`);
    process.exit(ExitCode.INVALID_ARGS);
  }

  return values;
}

function summarizeAiConfig(config: NebutraConfig) {
  const ai = ensureAiConfig(config);
  const providers = ai.providers ?? {};
  const routes = ai.routes ?? {};
  const enabledProviders = Object.entries(providers)
    .filter(([, provider]) => provider.enabled)
    .map(([id]) => id);

  return {
    path: getConfigPath(),
    gateway: ai.gateway ?? null,
    providers,
    enabledProviders,
    routes,
  };
}

function getCommandOptions(options: CommanderOptionSource): Record<string, unknown> {
  const local = typeof options.opts === "function" ? options.opts() : options;
  const withGlobals =
    typeof options.optsWithGlobals === "function" ? options.optsWithGlobals() : local;
  const format = local.format ?? withGlobals.format ?? readFormatFromArgv();

  return {
    ...withGlobals,
    ...local,
    ...(format ? { format } : {}),
  };
}

function readFormatFromArgv(): string | undefined {
  const inline = process.argv.find((arg) => arg.startsWith("--format="));
  if (inline) return inline.slice("--format=".length);

  const index = process.argv.indexOf("--format");
  if (index >= 0) return process.argv[index + 1];

  return undefined;
}

/**
 * Mask sensitive API key for display
 */
function maskApiKey(key: string | undefined): string {
  if (!key) return "not set";
  if (key.length <= 8) return "***";
  return `${key.substring(0, 8)}***`;
}

/**
 * Handle 'nebutra ai models' command
 * List known AI providers and check which have API keys configured
 */
async function handleAiModels(options: AiCommandOptions) {
  if (options.format !== "json") {
    logger.info("Checking configured AI models and providers...");
  }

  const providers: Record<string, { name: string; keyVars: string[]; configured: boolean }> = {
    openai: {
      name: "OpenAI",
      keyVars: ["OPENAI_API_KEY"],
      configured: false,
    },
    anthropic: {
      name: "Anthropic Claude",
      keyVars: ["ANTHROPIC_API_KEY"],
      configured: false,
    },
    openrouter: {
      name: "OpenRouter",
      keyVars: ["OPENROUTER_API_KEY"],
      configured: false,
    },
    vercel: {
      name: "Vercel AI SDK",
      keyVars: ["VERCEL_AI_API_KEY"],
      configured: false,
    },
  };

  // Check which providers are configured
  for (const provider of Object.values(providers)) {
    provider.configured = provider.keyVars.some((envVar) => process.env[envVar]);
  }

  const output = {
    providers: Object.entries(providers).map(([id, provider]) => ({
      id,
      name: provider.name,
      configured: provider.configured,
      keys: provider.keyVars.map((key) => ({
        name: key,
        value: maskApiKey(process.env[key]),
      })),
    })),
    configuredCount: Object.values(providers).filter((p) => p.configured).length,
    totalProviders: Object.keys(providers).length,
  };

  if (!options.dryRun) {
    if (output.configuredCount === 0) {
      logger.warn("No AI providers configured. Set API keys to enable AI features.");
    } else {
      logger.success(`${output.configuredCount} AI provider(s) configured`);
    }
  }

  formatOutput(output, options.format, "ai:models");
}

/**
 * Handle 'nebutra ai agents' command
 * Scan for available agents in the api-gateway
 */
async function handleAiAgents(options: AiCommandOptions) {
  if (options.format !== "json") {
    logger.info("Scanning for available agents...");
  }

  try {
    // Try to find agents in the api-gateway
    const agentsPath = resolve(process.cwd(), "backends/gateway/src/routes/agents");
    let agents: Array<{ name: string; path: string; description?: string }> = [];

    try {
      const fs = await import("node:fs");
      if (fs.existsSync(agentsPath)) {
        const files = fs.readdirSync(agentsPath);
        agents = files
          .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
          .map((f) => ({
            name: f.replace(".ts", ""),
            path: `backends/gateway/src/routes/agents/${f}`,
          }));
      }
    } catch {
      // If agents directory doesn't exist, return empty list
      agents = [];
    }

    const output = {
      agents:
        agents.length > 0
          ? agents
          : [
              {
                name: "No agents found",
                path: "create agents in backends/gateway/src/routes/agents/",
              },
            ],
      count: agents.length,
    };

    if (!options.dryRun) {
      if (output.count === 0) {
        logger.info("No agents configured. Create agents in backends/gateway/src/routes/agents/");
      } else {
        logger.success(`Found ${output.count} agent(s)`);
      }
    }

    formatOutput(output, options.format, "ai:agents");
  } catch (error) {
    logger.error(
      `Failed to scan agents: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Handle 'nebutra ai test <prompt>' command
 * Send a test prompt to the default AI model
 */
async function handleAiTest(prompt: string, options: AiCommandOptions) {
  if (!prompt || prompt.trim().length === 0) {
    logger.error("Prompt cannot be empty");
    process.exit(ExitCode.INVALID_ARGS);
  }

  if (options.format !== "json") {
    logger.info("Testing AI prompt against default model...");
    logger.info("Note: Ensure API gateway is running on http://localhost:3001");
  }

  const output = {
    prompt,
    note: "To execute this test, the API gateway must be running locally. Run: pnpm --filter @nebutra/gateway dev",
    endpoint: "http://localhost:3001/api/ai/test",
    method: "POST",
    payload: {
      prompt: prompt.substring(0, 100),
    },
  };

  if (!options.dryRun) {
    logger.warn(
      "AI test execution requires a running API gateway. Start it with: pnpm --filter @nebutra/gateway dev",
    );
  }

  formatOutput(output, options.format, "ai:test");
}

/**
 * Handle 'nebutra ai config' command
 * Show current AI configuration
 */
async function handleAiConfig(options: AiCommandOptions) {
  if (options.format !== "json") {
    logger.info("Checking AI configuration...");
  }

  const config: JsonObject = {
    providers: {
      openai: {
        key: maskApiKey(process.env.OPENAI_API_KEY),
        configured: !!process.env.OPENAI_API_KEY,
      },
      anthropic: {
        key: maskApiKey(process.env.ANTHROPIC_API_KEY),
        configured: !!process.env.ANTHROPIC_API_KEY,
      },
      openrouter: {
        key: maskApiKey(process.env.OPENROUTER_API_KEY),
        configured: !!process.env.OPENROUTER_API_KEY,
      },
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || "development",
      NEBUTRA_LOG_LEVEL: process.env.NEBUTRA_LOG_LEVEL || "info",
    },
  };

  // Try to read nebutra.config.ts for preset info
  try {
    const configPath = resolve(process.cwd(), "nebutra.config.ts");
    const fs = await import("node:fs");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const presetMatch = content.match(/preset:\s*["']([^"']+)["']/);
      if (presetMatch) {
        config.preset = presetMatch[1];
      }
    }
  } catch {
    // Ignore config read errors
  }

  const configuredProviders = Object.entries(
    config.providers as Record<string, LegacyProviderConfig>,
  )
    .filter(([, provider]) => provider.configured)
    .map(([name]) => name);

  if (!options.dryRun) {
    if (configuredProviders.length === 0) {
      logger.warn("No AI providers configured. Set environment variables to enable AI features.");
    } else {
      logger.success(`Configuration loaded: ${configuredProviders.join(", ")}`);
    }
  }

  formatOutput(config, options.format, "ai:config");
}

async function handleProviderList(options: AiCommandOptions) {
  const config = readNebutraConfig();
  const ai = ensureAiConfig(config);
  const catalog = getProviderCatalog();
  const providers = Object.values(catalog).map((provider) => {
    const saved = ai.providers?.[provider.id];
    return {
      id: provider.id,
      name: provider.name,
      enabled: saved?.enabled === true,
      configured: provider.envVars.some((envVar) => Boolean(process.env[envVar])),
      envVars: provider.envVars.map((envVar) => ({
        name: envVar,
        value: maskApiKey(process.env[envVar]),
      })),
    };
  });

  const output = {
    configPath: getConfigPath(),
    providers,
    enabledCount: providers.filter((provider) => provider.enabled).length,
    totalProviders: providers.length,
  };

  if (options.format !== "json") {
    const enabled = providers.filter((provider) => provider.enabled);
    if (enabled.length === 0) {
      logger.warn("No runtime AI providers enabled in nebutra.config.json.");
    } else {
      logger.success(`Enabled AI providers: ${enabled.map((provider) => provider.id).join(", ")}`);
    }
  }

  formatOutput(output, options.format, "ai:provider:list");
}

async function handleProviderEnable(providers: string[], options: ProviderCommandOptions) {
  const normalized = validateProviderIds(providers);
  const config = readNebutraConfig();
  const ai = ensureAiConfig(config);
  const catalog = getProviderCatalog();
  const now = new Date().toISOString();

  for (const provider of normalized) {
    ai.providers[provider] = {
      enabled: true,
      envVars: catalog[provider].envVars,
      enabledAt: ai.providers?.[provider]?.enabledAt ?? now,
    };
  }

  writeNebutraConfig(config);

  const output = {
    configPath: getConfigPath(),
    enabled: normalized,
    env:
      options.env === true
        ? normalized.flatMap((provider) =>
            catalog[provider].envVars.map((envVar) => ({
              provider,
              name: envVar,
              example: `${envVar}=`,
            })),
          )
        : undefined,
    ai: summarizeAiConfig(config),
  };

  if (options.format !== "json") {
    logger.success(`Enabled AI provider(s): ${normalized.join(", ")}`);
    if (options.env) {
      logger.info("Required environment variables:");
      for (const provider of normalized) {
        for (const envVar of catalog[provider].envVars) {
          console.log(`${envVar}=`);
        }
      }
    }
  }

  formatOutput(output, options.format, "ai:provider:enable");
}

async function handleProviderDisable(providers: string[], options: AiCommandOptions) {
  const normalized = validateProviderIds(providers);
  const config = readNebutraConfig();
  const ai = ensureAiConfig(config);
  const catalog = getProviderCatalog();
  const now = new Date().toISOString();

  for (const provider of normalized) {
    ai.providers[provider] = {
      enabled: false,
      envVars: ai.providers?.[provider]?.envVars ?? catalog[provider].envVars,
      disabledAt: now,
    };
  }

  writeNebutraConfig(config);

  const output = {
    configPath: getConfigPath(),
    disabled: normalized,
    ai: summarizeAiConfig(config),
  };

  if (options.format !== "json") {
    logger.success(`Disabled AI provider(s): ${normalized.join(", ")}`);
  }

  formatOutput(output, options.format, "ai:provider:disable");
}

async function handleGatewayInit(options: AiCommandOptions) {
  const config = readNebutraConfig();
  const ai = ensureAiConfig(config);
  const now = new Date().toISOString();

  ai.gateway = {
    enabled: true,
    mode: "local",
    initializedAt: ai.gateway?.initializedAt ?? now,
    updatedAt: now,
  };

  writeNebutraConfig(config);

  const output = {
    configPath: getConfigPath(),
    gateway: ai.gateway,
  };

  if (options.format !== "json") {
    logger.success("AI gateway governance initialized in nebutra.config.json");
  }

  formatOutput(output, options.format, "ai:gateway:init");
}

async function handleGatewayStatus(options: AiCommandOptions) {
  const config = readNebutraConfig();
  const ai = ensureAiConfig(config);
  const output = {
    configPath: getConfigPath(),
    gateway: ai.gateway ?? null,
    initialized: ai.gateway?.enabled === true,
  };

  if (options.format !== "json") {
    if (output.initialized) {
      logger.success("AI gateway governance is initialized");
    } else {
      logger.warn("AI gateway governance is not initialized. Run: nebutra ai gateway init");
    }
  }

  formatOutput(output, options.format, "ai:gateway:status");
}

async function handleRouteSet(name: string, options: RouteSetOptions) {
  if (!name || name.trim().length === 0) {
    logger.error("Route name cannot be empty");
    process.exit(ExitCode.INVALID_ARGS);
  }

  if (!options.policy) {
    logger.error("Route policy is required. Use --policy <policy>.");
    process.exit(ExitCode.INVALID_ARGS);
  }

  const fallback = parseFallbackList(options.fallback);
  const config = readNebutraConfig();
  const ai = ensureAiConfig(config);

  ai.routes[name] = {
    policy: options.policy,
    fallback,
    updatedAt: new Date().toISOString(),
  };

  writeNebutraConfig(config);

  const output = {
    configPath: getConfigPath(),
    route: {
      name,
      ...ai.routes[name],
    },
    routes: ai.routes,
  };

  if (options.format !== "json") {
    logger.success(`AI route '${name}' set with policy '${options.policy}'`);
  }

  formatOutput(output, options.format, "ai:route:set");
}

async function handleRouteList(options: AiCommandOptions) {
  const config = readNebutraConfig();
  const ai = ensureAiConfig(config);
  const routes = Object.entries(ai.routes ?? {}).map(([name, route]) => ({
    name,
    ...route,
  }));
  const output = {
    configPath: getConfigPath(),
    routes,
    count: routes.length,
  };

  if (options.format !== "json") {
    if (routes.length === 0) {
      logger.warn(
        "No AI routes configured. Run: nebutra ai route set chat --policy cost-latency-balanced --fallback openai:gpt-5.4",
      );
    } else {
      logger.success(`Configured AI routes: ${routes.map((route) => route.name).join(", ")}`);
    }
  }

  formatOutput(output, options.format, "ai:route:list");
}

/**
 * Register the AI command group
 */
export function registerAiCommand(program: Command) {
  const ai = program.command("ai").description("Manage AI models, agents, and configuration");

  const provider = ai.command("provider").description("Manage runtime AI provider governance");

  provider
    .command("list")
    .description("List supported and enabled AI providers")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const commandOptions = getCommandOptions(options);
      await handleProviderList({
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  provider
    .command("enable <providers...>")
    .description("Enable one or more runtime AI providers in nebutra.config.json")
    .option("--env", "Print required environment variable placeholders")
    .option("--format <type>", "Output format: json or plain")
    .action(async (providers: string[], options) => {
      const commandOptions = getCommandOptions(options);
      await handleProviderEnable(providers, {
        env: commandOptions.env === true,
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  provider
    .command("disable <providers...>")
    .description("Disable one or more runtime AI providers in nebutra.config.json")
    .option("--format <type>", "Output format: json or plain")
    .action(async (providers: string[], options) => {
      const commandOptions = getCommandOptions(options);
      await handleProviderDisable(providers, {
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  const gateway = ai.command("gateway").description("Manage local AI gateway governance");

  gateway
    .command("init")
    .description("Initialize the local AI gateway governance block")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const commandOptions = getCommandOptions(options);
      await handleGatewayInit({
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  gateway
    .command("status")
    .description("Show local AI gateway governance status")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const commandOptions = getCommandOptions(options);
      await handleGatewayStatus({
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  const route = ai.command("route").description("Manage AI routing policies");

  route
    .command("set <name>")
    .description("Create or update an AI route policy")
    .requiredOption("--policy <policy>", "Routing policy id")
    .requiredOption("--fallback <list>", "Comma-separated provider:model fallback chain")
    .option("--format <type>", "Output format: json or plain")
    .action(async (name: string, options) => {
      const commandOptions = getCommandOptions(options);
      await handleRouteSet(name, {
        policy: commandOptions.policy as string | undefined,
        fallback: commandOptions.fallback as string | undefined,
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  route
    .command("list")
    .description("List configured AI routes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const commandOptions = getCommandOptions(options);
      await handleRouteList({
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  // nebutra ai models
  ai.command("models")
    .description("List configured AI models and providers")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const commandOptions = getCommandOptions(options);
      await handleAiModels({
        dryRun: commandOptions.dryRun === true,
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  // nebutra ai agents
  ai.command("agents")
    .description("List available agents in the project")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const commandOptions = getCommandOptions(options);
      await handleAiAgents({
        dryRun: commandOptions.dryRun === true,
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  // nebutra ai test <prompt>
  ai.command("test <prompt>")
    .description("Send a test prompt to the default AI model (requires running API gateway)")
    .option("--dry-run", "Preview without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (prompt: string, options) => {
      const commandOptions = getCommandOptions(options);
      await handleAiTest(prompt, {
        dryRun: commandOptions.dryRun === true,
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });

  // nebutra ai config
  ai.command("config")
    .description("Show current AI configuration and provider status")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const commandOptions = getCommandOptions(options);
      await handleAiConfig({
        dryRun: commandOptions.dryRun === true,
        format: commandOptions.format as string | undefined,
        interactive: commandOptions.yes !== true,
      });
    });
}
