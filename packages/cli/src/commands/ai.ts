import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { type DelegateResult, delegate } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface AiCommandOptions {
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
  logger.info("Checking configured AI models and providers...");

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
  for (const [key, provider] of Object.entries(providers)) {
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
  logger.info("Scanning for available agents...");

  try {
    // Try to find agents in the api-gateway
    const agentsPath = resolve(process.cwd(), "apps/api-gateway/src/routes/agents");
    let agents: Array<{ name: string; path: string; description?: string }> = [];

    try {
      const fs = await import("node:fs");
      if (fs.existsSync(agentsPath)) {
        const files = fs.readdirSync(agentsPath);
        agents = files
          .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
          .map((f) => ({
            name: f.replace(".ts", ""),
            path: `apps/api-gateway/src/routes/agents/${f}`,
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
                path: "create agents in apps/api-gateway/src/routes/agents/",
              },
            ],
      count: agents.length,
    };

    if (!options.dryRun) {
      if (output.count === 0) {
        logger.info("No agents configured. Create agents in apps/api-gateway/src/routes/agents/");
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

  logger.info("Testing AI prompt against default model...");
  logger.info("Note: Ensure API gateway is running on http://localhost:3001");

  const output = {
    prompt,
    note: "To execute this test, the API gateway must be running locally. Run: pnpm --filter @nebutra/api-gateway dev",
    endpoint: "http://localhost:3001/api/ai/test",
    method: "POST",
    payload: {
      prompt: prompt.substring(0, 100),
    },
  };

  if (!options.dryRun) {
    logger.warn(
      "AI test execution requires a running API gateway. Start it with: pnpm --filter @nebutra/api-gateway dev",
    );
  }

  formatOutput(output, options.format, "ai:test");
}

/**
 * Handle 'nebutra ai config' command
 * Show current AI configuration
 */
async function handleAiConfig(options: AiCommandOptions) {
  logger.info("Checking AI configuration...");

  const config: Record<string, any> = {
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

  const configuredProviders = Object.entries(config.providers as Record<string, any>)
    .filter(([_, p]) => p.configured)
    .map(([name, _]) => name);

  if (!options.dryRun) {
    if (configuredProviders.length === 0) {
      logger.warn("No AI providers configured. Set environment variables to enable AI features.");
    } else {
      logger.success(`Configuration loaded: ${configuredProviders.join(", ")}`);
    }
  }

  formatOutput(config, options.format, "ai:config");
}

/**
 * Register the AI command group
 */
export function registerAiCommand(program: Command) {
  const ai = program.command("ai").description("Manage AI models, agents, and configuration");

  // nebutra ai models
  ai.command("models")
    .description("List configured AI models and providers")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAiModels({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra ai agents
  ai.command("agents")
    .description("List available agents in the project")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAiAgents({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra ai test <prompt>
  ai.command("test <prompt>")
    .description("Send a test prompt to the default AI model (requires running API gateway)")
    .option("--dry-run", "Preview without executing")
    .option("--format <type>", "Output format: json or plain")
    .action(async (prompt: string, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAiTest(prompt, {
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });

  // nebutra ai config
  ai.command("config")
    .description("Show current AI configuration and provider status")
    .option("--dry-run", "Preview without making changes")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAiConfig({
        dryRun: options.dryRun || false,
        format: options.format || globalOptions.format,
        interactive: globalOptions.yes !== true,
      });
    });
}
