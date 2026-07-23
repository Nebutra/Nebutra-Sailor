import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..", "..");
const designTokensRoot = resolve(packageRoot, "..", "design-tokens");
const generatedThemesPath = resolve(designTokensRoot, "build", "css", "themes.generated.css");
const keyframesPath = resolve(packageRoot, "keyframes.css");
const themesAliasPath = resolve(packageRoot, "themes.css");
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

copyFileSync(generatedThemesPath, keyframesPath);
// Compatibility alias — prefer @nebutra/theme/keyframes.css
writeFileSync(
  themesAliasPath,
  `/**
 * @deprecated Import \`@nebutra/theme/keyframes.css\` instead.
 * themes.css is a compatibility alias (keyframes only — no color moods).
 */
@import "./keyframes.css";
`,
);
execFileSync(biomeBin, ["format", "--write", keyframesPath], {
  cwd: repoRoot,
  stdio: "inherit",
});
process.stdout.write("keyframes.css refreshed from @nebutra/design-tokens (+ themes.css alias)\n");
