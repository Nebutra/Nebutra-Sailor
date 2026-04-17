/**
 * Seed Script: ModelConfig (AI model pricing catalog)
 *
 * Populates `model_configs` table with 2026-current pricing for
 * OpenAI, Anthropic, Google, and SiliconFlow models.
 *
 * Idempotent — safe to re-run. Uses upsert on unique `modelName`.
 *
 * Usage:
 *   pnpm --filter @nebutra/db seed:models
 */

/* eslint-disable no-console -- CLI script with intentional stdout logging */

import { prisma } from "../src/index.js";

/**
 * All prices are per 1,000,000 tokens (USD).
 *
 * Using string literals for Decimal fields to avoid float precision loss
 * when Prisma converts to Postgres `Decimal(10, 6)`.
 *
 * `provider` is typed as the AIProvider enum literal union — cast to `never`
 * at the call site to satisfy Prisma's generated enum types without a direct
 * import of the runtime enum (the enum is re-exported from the generated
 * client and varies between Prisma generator runs).
 */
const MODEL_CONFIGS: ReadonlyArray<{
  readonly modelName: string;
  readonly provider: "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";
  readonly inputPricePerMillion: string;
  readonly outputPricePerMillion: string;
}> = [
  // ----- OpenAI -----
  {
    modelName: "gpt-4o",
    provider: "OPENAI",
    inputPricePerMillion: "2.50",
    outputPricePerMillion: "10.00",
  },
  {
    modelName: "gpt-4o-mini",
    provider: "OPENAI",
    inputPricePerMillion: "0.15",
    outputPricePerMillion: "0.60",
  },
  {
    modelName: "gpt-4.1",
    provider: "OPENAI",
    inputPricePerMillion: "2.00",
    outputPricePerMillion: "8.00",
  },
  {
    modelName: "gpt-4.1-mini",
    provider: "OPENAI",
    inputPricePerMillion: "0.40",
    outputPricePerMillion: "1.60",
  },
  {
    modelName: "gpt-4.1-nano",
    provider: "OPENAI",
    inputPricePerMillion: "0.10",
    outputPricePerMillion: "0.40",
  },
  {
    modelName: "o3",
    provider: "OPENAI",
    inputPricePerMillion: "2.00",
    outputPricePerMillion: "8.00",
  },
  {
    modelName: "o3-mini",
    provider: "OPENAI",
    inputPricePerMillion: "1.10",
    outputPricePerMillion: "4.40",
  },
  {
    modelName: "o4-mini",
    provider: "OPENAI",
    inputPricePerMillion: "1.10",
    outputPricePerMillion: "4.40",
  },
  {
    modelName: "text-embedding-3-small",
    provider: "OPENAI",
    inputPricePerMillion: "0.02",
    outputPricePerMillion: "0",
  },
  {
    modelName: "text-embedding-3-large",
    provider: "OPENAI",
    inputPricePerMillion: "0.13",
    outputPricePerMillion: "0",
  },

  // ----- Anthropic -----
  {
    modelName: "claude-sonnet-4-5",
    provider: "ANTHROPIC",
    inputPricePerMillion: "3.00",
    outputPricePerMillion: "15.00",
  },
  {
    modelName: "claude-haiku-4-5",
    provider: "ANTHROPIC",
    inputPricePerMillion: "0.80",
    outputPricePerMillion: "4.00",
  },
  {
    modelName: "claude-opus-4",
    provider: "ANTHROPIC",
    inputPricePerMillion: "15.00",
    outputPricePerMillion: "75.00",
  },
  {
    modelName: "claude-sonnet-3-7",
    provider: "ANTHROPIC",
    inputPricePerMillion: "3.00",
    outputPricePerMillion: "15.00",
  },
  {
    modelName: "claude-haiku-3-5",
    provider: "ANTHROPIC",
    inputPricePerMillion: "0.80",
    outputPricePerMillion: "4.00",
  },

  // ----- Google -----
  {
    modelName: "gemini-2.5-pro",
    provider: "GOOGLE",
    inputPricePerMillion: "1.25",
    outputPricePerMillion: "10.00",
  },
  {
    modelName: "gemini-2.5-flash",
    provider: "GOOGLE",
    inputPricePerMillion: "0.075",
    outputPricePerMillion: "0.30",
  },
  {
    modelName: "gemini-2.0-flash",
    provider: "GOOGLE",
    inputPricePerMillion: "0.075",
    outputPricePerMillion: "0.30",
  },

  // ----- SiliconFlow (approximate USD; Chinese providers) -----
  {
    modelName: "deepseek-v3",
    provider: "SILICONFLOW",
    inputPricePerMillion: "0.27",
    outputPricePerMillion: "1.10",
  },
  {
    modelName: "deepseek-r1",
    provider: "SILICONFLOW",
    inputPricePerMillion: "0.55",
    outputPricePerMillion: "2.19",
  },
  {
    modelName: "Qwen/Qwen2.5-72B-Instruct",
    provider: "SILICONFLOW",
    inputPricePerMillion: "0.35",
    outputPricePerMillion: "1.40",
  },
  {
    modelName: "BAAI/bge-large-en-v1.5",
    provider: "SILICONFLOW",
    inputPricePerMillion: "0.02",
    outputPricePerMillion: "0",
  },
] as const;

async function main(): Promise<void> {
  process.stdout.write(`Seeding ${MODEL_CONFIGS.length} model configs...\n`);

  for (const config of MODEL_CONFIGS) {
    await prisma.modelConfig.upsert({
      where: { modelName: config.modelName },
      update: {
        provider: config.provider as never,
        inputPricePerMillion: config.inputPricePerMillion,
        outputPricePerMillion: config.outputPricePerMillion,
        currency: "USD",
        isActive: true,
      },
      create: {
        modelName: config.modelName,
        provider: config.provider as never,
        inputPricePerMillion: config.inputPricePerMillion,
        outputPricePerMillion: config.outputPricePerMillion,
        currency: "USD",
        isActive: true,
      },
    });
    process.stdout.write(`  OK ${config.modelName} (${config.provider})\n`);
  }

  process.stdout.write("Done.\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    process.stderr.write(`${err instanceof Error ? err.stack || err.message : String(err)}\n`);
    await prisma.$disconnect();
    process.exit(1);
  });
