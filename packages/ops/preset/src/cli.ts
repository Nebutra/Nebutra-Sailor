import { loadPresetConfig } from "./config-loader";
import { getFeatureEnvVars, resolveConfig } from "./index";

async function main() {
  const loaded = await loadPresetConfig();
  if (loaded.deprecated) {
    process.stderr.write(
      "[@nebutra/preset] DEPRECATION: `nebutra.config.ts` is deprecated. Rename it to `preset.config.ts`.\n",
    );
  }
  const resolved = resolveConfig(loaded.config);
  const envVars = getFeatureEnvVars(resolved);

  const lines = Object.entries(envVars)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);

  process.stdout.write(lines.join("\n") + "\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
