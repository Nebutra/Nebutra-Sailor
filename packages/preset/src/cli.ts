import type { NebutraConfig } from "./index";
import { getFeatureEnvVars, resolveConfig } from "./index";

async function loadConfigModule(): Promise<{ default: NebutraConfig }> {
  try {
    return (await import("../../../preset.config")) as { default: NebutraConfig };
  } catch {
    const legacy = (await import("../../../nebutra.config")) as { default: NebutraConfig };
    process.stderr.write(
      "[@nebutra/preset] DEPRECATION: `nebutra.config.ts` is deprecated. Rename it to `preset.config.ts`.\n",
    );
    return legacy;
  }
}

async function main() {
  const configModule = await loadConfigModule();
  const config = configModule.default;
  const resolved = resolveConfig(config);
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
