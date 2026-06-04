import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig, type NebutraConfig, type NebutraConfigInput } from "./config";

export interface LoadedPresetConfig {
  config: NebutraConfig;
  source: string;
  deprecated: boolean;
}

async function importConfig(filePath: string): Promise<NebutraConfigInput> {
  const mod = (await import(pathToFileURL(filePath).href)) as { default?: NebutraConfigInput };
  if (!mod.default) {
    throw new Error(`Preset config ${filePath} must export a default config.`);
  }
  return mod.default;
}

function readJsonConfig(filePath: string): NebutraConfigInput {
  return JSON.parse(readFileSync(filePath, "utf8")) as NebutraConfigInput;
}

export async function loadPresetConfig(rootDir = process.cwd()): Promise<LoadedPresetConfig> {
  const modernCandidates = ["preset.config.ts", "preset.config.mjs", "preset.config.js"];
  for (const source of modernCandidates) {
    const filePath = join(rootDir, source);
    if (existsSync(filePath)) {
      return {
        config: defineConfig(await importConfig(filePath)),
        source,
        deprecated: false,
      };
    }
  }

  const legacyCandidates = ["nebutra.config.ts", "nebutra.config.mjs", "nebutra.config.js"];
  for (const source of legacyCandidates) {
    const filePath = join(rootDir, source);
    if (existsSync(filePath)) {
      return {
        config: defineConfig(await importConfig(filePath)),
        source,
        deprecated: true,
      };
    }
  }

  const jsonSource = "nebutra.config.json";
  const jsonPath = join(rootDir, jsonSource);
  if (existsSync(jsonPath)) {
    return {
      config: defineConfig(readJsonConfig(jsonPath)),
      source: jsonSource,
      deprecated: false,
    };
  }

  throw new Error(
    "Preset config not found. Expected preset.config.ts, nebutra.config.ts, or nebutra.config.json in the project root.",
  );
}
