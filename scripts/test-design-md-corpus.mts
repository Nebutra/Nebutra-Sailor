/**
 * DESIGN.md corpus harness — consume real ecosystem files (VoltAgent/awesome-design-md)
 * through our importer + preview adapter + official linter.
 *
 * Usage: pnpm exec tsx scripts/test-design-md-corpus.mts <file.md> [<file.md> ...]
 * Emits a JSON array (one record per file) on stdout. Each record:
 *   { brand, parseOk, threw, validateErr, colorCount, missingRequired, unmapped,
 *     warnings, previewLightOk, previewDarkOk, primaryRendered, lintErrors, note }
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { lint } from "@google/design.md/linter";
import { importFromDesignMd } from "../packages/design/design-sync/src/serialize/from-design-md";

type Rec = Record<string, unknown>;

function run(file: string): Rec {
  const brand = basename(file).replace(/\.md$/u, "");
  const rec: Rec = { brand, parseOk: false, threw: null };
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch (e) {
    return { ...rec, threw: `read: ${(e as Error).message}` };
  }

  // 1. Importer (DESIGN.md → DTCG theme set). Throws on invalid DTCG (fail-closed).
  let tokens: Record<string, Record<string, { $value?: string }>> = {};
  try {
    const { set, report } = importFromDesignMd(content);
    tokens = set.tokens as typeof tokens;
    rec.parseOk = true;
    rec.colorCount = Object.keys(tokens.color ?? {}).length;
    rec.missingRequired = report.missingRequired.length;
    rec.unmapped = report.unmapped.length;
    rec.warnings = report.warnings.length;
    rec.themeName = set.name;
  } catch (e) {
    return { ...rec, threw: `import: ${(e as Error).message}` };
  }

  // 2. Renderable proxy — the preview adapter keys off color.primary / radius / fontFamily.
  // (The adapter itself is covered by apps/web unit tests + the live Playwright smoke; here
  // we just confirm the imported set carries something renderable, never a silent-empty pass.)
  rec.hasPrimary = Boolean(tokens.color?.primary?.$value);
  rec.hasAnyColor = (rec.colorCount as number) > 0;
  rec.radiusCount = Object.keys((tokens.radius as Record<string, unknown>) ?? {}).length;
  rec.hasFontFamily = Boolean(
    (tokens.fontFamily as Record<string, { $value?: string }>)?.sans?.$value,
  );
  // Every-dimension audit: what does the importer actually carry per file?
  rec.spacingCount = Object.keys((tokens.spacing as Record<string, unknown>) ?? {}).length;
  rec.shadowCount = Object.keys((tokens.shadow as Record<string, unknown>) ?? {}).length;
  rec.tokenGroups = Object.keys(tokens).filter((g) => Object.keys(tokens[g] ?? {}).length > 0);

  // 3. Official linter on the raw source (informational — is the real file spec-clean?).
  try {
    const report = lint(content);
    rec.lintErrors = report.summary.errors;
    rec.lintWarnings = report.summary.warnings;
  } catch (e) {
    rec.lintErrors = `threw: ${(e as Error).message}`;
  }

  return rec;
}

const files = process.argv.slice(2);
const results = files.map(run);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
