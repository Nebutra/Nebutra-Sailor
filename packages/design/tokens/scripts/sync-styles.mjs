import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatGenerated } from "./format-generated.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeStylesPath = resolve(packageRoot, "styles.css");

// Monorepo: packages/design/design-tokens; standalone mirror: node_modules/@nebutra/design-tokens
const generatedStylesCandidates = [
  resolve(packageRoot, "..", "design-tokens", "build", "css", "styles.generated.css"),
  resolve(
    packageRoot,
    "node_modules",
    "@nebutra",
    "design-tokens",
    "build",
    "css",
    "styles.generated.css",
  ),
];

const generatedStylesPath = generatedStylesCandidates.find((p) => existsSync(p));
if (!generatedStylesPath) {
  throw new Error(
    `Missing generated runtime token CSS. Tried:\n${generatedStylesCandidates.map((p) => `  - ${p}`).join("\n")}\n` +
      `Run \`pnpm --filter @nebutra/design-tokens build\` (monorepo) or ensure @nebutra/design-tokens is installed with its build/ output.`,
  );
}

copyFileSync(generatedStylesPath, runtimeStylesPath);
formatGenerated(runtimeStylesPath);
process.stdout.write("styles.css refreshed from @nebutra/design-tokens\n");
