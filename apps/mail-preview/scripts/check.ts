import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_TEMPLATE_CATALOG } from "../../../packages/email/src/index";

const distDir = new URL("../dist/", import.meta.url);

const failures: string[] = [];
const seen = new Set<string>();

for (const template of EMAIL_TEMPLATE_CATALOG) {
  if (seen.has(template.fileName)) {
    failures.push(`Duplicate preview filename: ${template.fileName}`);
  }
  seen.add(template.fileName);

  const previewPath = join(distDir.pathname, template.fileName);
  if (!existsSync(previewPath)) {
    failures.push(`Missing preview artifact for ${template.id}: ${template.fileName}`);
    continue;
  }

  if (statSync(previewPath).size === 0) {
    failures.push(`Empty preview artifact for ${template.id}: ${template.fileName}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`mail-preview check passed (${EMAIL_TEMPLATE_CATALOG.length} templates)\n`);
