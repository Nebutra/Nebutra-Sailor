import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * The project's own brand, from the first render.
 *
 * A fresh scaffold used to show Nebutra's name and logo everywhere — welcome
 * page, app header, site — until its owner ran `pnpm brand:init`. The scaffold
 * already knows the project name, so it runs the same pipeline itself:
 * `brand:init --yes --name <Brand>` writes brand.config.ts (text-wordmark logo,
 * Nebutra's colours kept as the neutral default), `brand:apply` generates the
 * brand metadata every surface reads. Both are the template's own scripts; the
 * scaffold does not write generated files by hand.
 *
 * They need the installed workspace (tsx, biome, the token build), so they run
 * after install. When install is skipped or fails the name is left in
 * `.sailor/brand.json` and the first `pnpm dev` applies it.
 */

export const PENDING_BRAND_FILE = path.join(".sailor", "brand.json");

/** Words that read wrong title-cased ("Ai", "Saas"). */
const CASED_WORDS: Record<string, string> = {
  ai: "AI",
  api: "API",
  b2b: "B2B",
  b2c: "B2C",
  cms: "CMS",
  crm: "CRM",
  erp: "ERP",
  hr: "HR",
  io: "IO",
  llm: "LLM",
  saas: "SaaS",
  seo: "SEO",
  ui: "UI",
  ux: "UX",
};

/**
 * A package/folder name as a product name: "acme-rocket" → "Acme Rocket",
 * "@scope/ai_studio" → "AI Studio", "myApp" → "MyApp" (inner capitals kept).
 */
export function brandNameFromProject(projectName: string): string {
  const bare = projectName.trim().replace(/^@[^/]+\//, "");
  const words = bare.split(/[\s._-]+/).filter(Boolean);
  const name = words
    .map((word) => {
      const known = CASED_WORDS[word.toLowerCase()];
      if (known) return known;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
  return name || "My App";
}

export interface BrandApplyResult {
  applied: boolean;
  name: string;
  error?: string;
}

function run(pm: string, args: string[], cwd: string): void {
  execFileSync(pm, args, { cwd, stdio: "pipe", env: { ...process.env, CI: "1" } });
}

/**
 * brand:init --yes + brand:apply in the scaffolded project. Never throws: a
 * failure leaves the pending marker so `pnpm dev` retries it.
 */
export function applyScaffoldBrand(targetDir: string, name: string, pm = "pnpm"): BrandApplyResult {
  try {
    if (!fs.existsSync(path.join(targetDir, "brand.config.ts"))) {
      // `--` so npm/yarn pass the flags through too; brand-init ignores it.
      run(pm, ["run", "brand:init", "--", "--yes", "--name", name], targetDir);
    }
    run(pm, ["run", "brand:apply"], targetDir);
    fs.rmSync(path.join(targetDir, PENDING_BRAND_FILE), { force: true });
    return { applied: true, name };
  } catch (error) {
    writePendingBrand(targetDir, name);
    const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
    return {
      applied: false,
      name,
      error: stderr || (error instanceof Error ? error.message : String(error)),
    };
  }
}

/** Leaves the brand for the first `pnpm dev` (scripts/dev/preview.ts) to apply. */
export function writePendingBrand(targetDir: string, name: string): void {
  const file = path.join(targetDir, PENDING_BRAND_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ name }, null, 2)}\n`);
}
