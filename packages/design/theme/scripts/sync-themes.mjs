import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..", "..");
const designTokensRoot = resolve(packageRoot, "..", "design-tokens");
const generatedThemesPath = resolve(designTokensRoot, "build", "css", "themes.generated.css");
const runtimeThemesPath = resolve(packageRoot, "themes.css");
const biomeBin = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "biome.cmd" : "biome",
);

if (!existsSync(generatedThemesPath)) {
  throw new Error(
    `Missing generated theme CSS at ${generatedThemesPath}. Run \`pnpm --filter @nebutra/design-tokens build\` before syncing @nebutra/theme.`,
  );
}

copyFileSync(generatedThemesPath, runtimeThemesPath);
execFileSync(biomeBin, ["format", "--write", runtimeThemesPath], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.stdout.write("themes.css refreshed from @nebutra/design-tokens\n");
