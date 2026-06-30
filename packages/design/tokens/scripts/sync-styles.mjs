import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..", "..");
const designTokensRoot = resolve(packageRoot, "..", "design-tokens");
const generatedStylesPath = resolve(designTokensRoot, "build", "css", "styles.generated.css");
const runtimeStylesPath = resolve(packageRoot, "styles.css");
const biomeBin = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "biome.cmd" : "biome",
);

if (!existsSync(generatedStylesPath)) {
  throw new Error(
    `Missing generated runtime token CSS at ${generatedStylesPath}. Run \`pnpm --filter @nebutra/design-tokens build\` before syncing @nebutra/tokens.`,
  );
}

copyFileSync(generatedStylesPath, runtimeStylesPath);
execFileSync(biomeBin, ["format", "--write", runtimeStylesPath], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.stdout.write("styles.css refreshed from @nebutra/design-tokens\n");
