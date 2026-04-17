/**
 * Seed ModelConfig table with LLM pricing from models.dev (via tokenlens).
 *
 * Source of truth: https://models.dev/api.json — community-maintained, updated
 * whenever providers change their pricing. `tokenlens` is a thin TypeScript
 * wrapper around it.
 *
 * Usage:
 *   pnpm --filter @nebutra/db seed:models
 *   pnpm --filter @nebutra/db seed:models --offline   # use embedded fallback
 */

import type { ProviderInfo, ProviderModel } from "@tokenlens/core";
import { FetchModelsError, fetchModels } from "@tokenlens/fetch";
import { prisma } from "../src/index.js";

type AIProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";

/**
 * Map models.dev provider IDs to our AIProvider enum.
 * Anything unknown maps to CUSTOM.
 */
const PROVIDER_MAP: Record<string, AIProvider> = {
  openai: "OPENAI",
  anthropic: "ANTHROPIC",
  google: "GOOGLE",
  "google-vertex": "GOOGLE",
  "google-vertex-anthropic": "ANTHROPIC",
  "amazon-bedrock": "ANTHROPIC", // most bedrock usage is claude
  siliconflow: "SILICONFLOW",
  deepseek: "SILICONFLOW", // treat deepseek as a siliconflow-compatible provider
  alibaba: "SILICONFLOW",
  qwen: "SILICONFLOW",
  moonshot: "SILICONFLOW",
  zhipu: "SILICONFLOW",
};

function mapProvider(id: string): AIProvider {
  return PROVIDER_MAP[id] ?? "CUSTOM";
}

/**
 * Embedded fallback — only used when network is unavailable (--offline or fetch error).
 * Kept MINIMAL: just enough for dev env smoke tests.
 * For production pricing, always use `fetchModels()`.
 */
const OFFLINE_FALLBACK: Array<{
  modelName: string;
  provider: AIProvider;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
}> = [
  {
    modelName: "gpt-4o-mini",
    provider: "OPENAI",
    inputPricePerMillion: "0.15",
    outputPricePerMillion: "0.60",
  },
  {
    modelName: "gpt-4o",
    provider: "OPENAI",
    inputPricePerMillion: "2.50",
    outputPricePerMillion: "10.00",
  },
  {
    modelName: "claude-sonnet-4-5",
    provider: "ANTHROPIC",
    inputPricePerMillion: "3.00",
    outputPricePerMillion: "15.00",
  },
  {
    modelName: "gemini-2.5-flash",
    provider: "GOOGLE",
    inputPricePerMillion: "0.075",
    outputPricePerMillion: "0.30",
  },
  {
    modelName: "deepseek-chat",
    provider: "SILICONFLOW",
    inputPricePerMillion: "0.27",
    outputPricePerMillion: "1.10",
  },
];

interface SeedRow {
  modelName: string;
  provider: AIProvider;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
}

/**
 * Build seed rows from the models.dev catalog.
 * Skips models without both input and output pricing.
 */
function catalogToRows(catalog: Record<string, ProviderInfo>): SeedRow[] {
  const rows: SeedRow[] = [];

  for (const [providerId, providerInfo] of Object.entries(catalog)) {
    const provider = mapProvider(providerId);

    for (const [, model] of Object.entries(providerInfo.models) as [string, ProviderModel][]) {
      const inputCost = model.cost?.input;
      const outputCost = model.cost?.output;

      // models.dev costs are USD per million tokens already (match our schema).
      if (typeof inputCost !== "number" || typeof outputCost !== "number") continue;

      rows.push({
        modelName: model.id,
        provider,
        inputPricePerMillion: inputCost.toString(),
        outputPricePerMillion: outputCost.toString(),
      });
    }
  }

  return rows;
}

async function loadSeedRows(offline: boolean): Promise<SeedRow[]> {
  if (offline) {
    process.stdout.write("Offline mode: using embedded fallback\n");
    return OFFLINE_FALLBACK;
  }

  try {
    process.stdout.write("Fetching models.dev catalog via @tokenlens/fetch...\n");
    const catalog = await fetchModels();
    const rows = catalogToRows(catalog);
    process.stdout.write(`Loaded ${rows.length} models with complete pricing\n`);
    return rows;
  } catch (err) {
    const message = err instanceof FetchModelsError ? `${err.code}: ${err.message}` : String(err);
    process.stderr.write(`models.dev fetch failed (${message}), using offline fallback\n`);
    return OFFLINE_FALLBACK;
  }
}

async function main(): Promise<void> {
  const offline = process.argv.includes("--offline");
  const rows = await loadSeedRows(offline);

  process.stdout.write(`Seeding ${rows.length} model configs...\n`);

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.modelConfig.findUnique({
      where: { modelName: row.modelName },
      select: { id: true },
    });

    await prisma.modelConfig.upsert({
      where: { modelName: row.modelName },
      update: {
        provider: row.provider as never,
        inputPricePerMillion: row.inputPricePerMillion,
        outputPricePerMillion: row.outputPricePerMillion,
        currency: "USD",
        isActive: true,
      },
      create: {
        modelName: row.modelName,
        provider: row.provider as never,
        inputPricePerMillion: row.inputPricePerMillion,
        outputPricePerMillion: row.outputPricePerMillion,
        currency: "USD",
        isActive: true,
      },
    });

    if (existing) updated++;
    else created++;
  }

  process.stdout.write(`Done: ${created} created, ${updated} updated\n`);
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
