import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const designTokensRoot = resolve(packageRoot, "..", "design-tokens");
const generatedThemesPath = resolve(designTokensRoot, "build", "css", "themes.generated.css");
const runtimeThemesPath = resolve(packageRoot, "themes.css");

if (!existsSync(generatedThemesPath)) {
  throw new Error(
    `Missing generated theme CSS at ${generatedThemesPath}. Run \`pnpm --filter @nebutra/design-tokens build\` before syncing @nebutra/theme.`,
  );
}

copyFileSync(generatedThemesPath, runtimeThemesPath);
process.stdout.write("themes.css refreshed from @nebutra/design-tokens\n");
