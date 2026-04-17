import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DocsFramework } from "./config.js";

export interface DocsConfig {
  framework: DocsFramework;
  projectName: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COPYABLE_EXT = /\.(md|mdx|json|ts|tsx|js|mjs|cjs|yaml|yml)$/;

/**
 * Resolves the templates directory regardless of whether we're running from
 * the bundled `dist/` output or directly from `src/` during dev.
 */
function resolveTemplateDir(framework: string): string {
  const candidates = [
    // dist/index.js → ../templates/docs/<framework>
    path.join(__dirname, "..", "templates", "docs", framework),
    // src/utils/docs.ts → ../../templates/docs/<framework>
    path.join(__dirname, "..", "..", "templates", "docs", framework),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  // Fall back to the first (will throw with a clear message in caller)
  return candidates[0];
}

export async function applyDocsTemplate(targetDir: string, config: DocsConfig): Promise<void> {
  if (config.framework === "none") return;

  // v1.1.0: only fumadocs is implemented; non-fumadocs choices fall back.
  const effectiveFramework = config.framework === "fumadocs" ? "fumadocs" : "fumadocs";

  const templateDir = resolveTemplateDir(effectiveFramework);
  const appsDir = path.join(targetDir, "apps", "docs");

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Docs template not found: ${templateDir}`);
  }

  copyRecursive(templateDir, appsDir);

  replacePlaceholders(appsDir, {
    "{PRODUCT_NAME}": config.projectName,
  });
}

function copyRecursive(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function replacePlaceholders(dir: string, replacements: Record<string, string>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replacePlaceholders(p, replacements);
    } else if (COPYABLE_EXT.test(entry.name)) {
      let content = fs.readFileSync(p, "utf-8");
      for (const [key, value] of Object.entries(replacements)) {
        content = content.split(key).join(value);
      }
      fs.writeFileSync(p, content);
    }
  }
}
