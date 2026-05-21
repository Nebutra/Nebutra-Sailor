import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const designTokensRoot = resolve(packageRoot, "..", "design-tokens");
const generatedStylesPath = resolve(designTokensRoot, "build", "css", "styles.generated.css");
const runtimeStylesPath = resolve(packageRoot, "styles.css");

if (!existsSync(generatedStylesPath)) {
  throw new Error(
    `Missing generated runtime token CSS at ${generatedStylesPath}. Run \`pnpm --filter @nebutra/design-tokens build\` before syncing @nebutra/tokens.`,
  );
}

copyFileSync(generatedStylesPath, runtimeStylesPath);
process.stdout.write("styles.css refreshed from @nebutra/design-tokens\n");
