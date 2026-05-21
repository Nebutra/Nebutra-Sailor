import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const designTokensRoot = resolve(packageRoot, "..", "design-tokens");
const generatedStylesPath = resolve(designTokensRoot, "build", "css", "styles.generated.css");
const runtimeStylesPath = resolve(packageRoot, "styles.css");

const build = spawnSync(process.execPath, ["style-dictionary.config.mjs"], {
  cwd: designTokensRoot,
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(generatedStylesPath)) {
  throw new Error(
    `Missing generated runtime token CSS at ${generatedStylesPath}. The @nebutra/design-tokens build must emit it before @nebutra/tokens can publish.`,
  );
}

copyFileSync(generatedStylesPath, runtimeStylesPath);
process.stdout.write("styles.css refreshed from @nebutra/design-tokens\n");
