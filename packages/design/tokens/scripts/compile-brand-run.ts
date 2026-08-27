import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { compileReferoTokens } from "../src/brand-package/index";

function parseArgs(argv: string[]) {
  let input: string | null = null;
  let id: string | undefined;
  let name: string | undefined;
  let out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id") id = argv[++i];
    else if (a === "--name") name = argv[++i];
    else if (a === "--out") out = argv[++i];
    else if (!a.startsWith("-")) input = resolve(a);
  }
  return { input, id, name, out };
}

const args = parseArgs(process.argv.slice(2));
if (!args.input) {
  process.stderr.write(
    "Usage: compile-brand.mjs <dir|tokens.json> [--id id] [--name name] [--out dir]\n",
  );
  process.exit(1);
}

const st = statSync(args.input);
let tokens: Record<string, unknown>;
let designMd = "";
let hintId = "custom";

if (st.isDirectory()) {
  const tokensPath = join(args.input, "tokens.json");
  try {
    tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  } catch {
    throw new Error(`No tokens.json in ${args.input}`);
  }
  const designPath = join(args.input, "DESIGN.md");
  try {
    designMd = readFileSync(designPath, "utf8");
  } catch {
    designMd = "";
  }
  hintId = basename(args.input).toLowerCase();
} else {
  tokens = JSON.parse(readFileSync(args.input, "utf8"));
  hintId = basename(args.input, ".json").toLowerCase();
}

const result = compileReferoTokens({
  tokens,
  designMd,
  id: args.id ?? hintId,
  name: args.name,
});

const packageRoot = resolve(import.meta.dirname, "..");
const outDir = args.out ? resolve(args.out) : join(packageRoot, "brands", result.brand.id);
mkdirSync(outDir, { recursive: true });
// brand.json is SSOT — skin CSS only under skins/<id>.css (via emit-skins)
writeFileSync(join(outDir, "brand.json"), `${JSON.stringify(result.brand, null, 2)}\n`);
mkdirSync(join(packageRoot, "skins"), { recursive: true });
writeFileSync(join(packageRoot, "skins", `${result.brand.id}.css`), result.css);

process.stdout.write(
  `${JSON.stringify(
    {
      out: outDir,
      id: result.brand.id,
      recipe: result.brand.recipe.buttonDefault,
      warnings: result.warnings,
      note: "brand.json is SSOT; re-run emit-skins after hand-edits to brand.json",
    },
    null,
    2,
  )}\n`,
);
