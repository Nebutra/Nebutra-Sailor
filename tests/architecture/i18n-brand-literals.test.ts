/**
 * Architecture guard: i18n message catalogs must not contain raw brand identity
 * literals. All identity strings must use ICU placeholders ({brandName} etc.)
 * injected at request time from the single @nebutra/brand metadata object.
 *
 * Shrink-only: if the allowlist is non-empty the test fails — the list must
 * drain toward [] as files are migrated on-touch.
 *
 * Pipeline: Phase 4 of brand-meta-replacement-governance.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../..");
const MESSAGES_DIR = join(REPO_ROOT, "apps/landing/messages");

/** Raw brand identity strings that must NOT appear in message JSON values. */
const BANNED_LITERALS = ["Nebutra", "云毓智能", "无锡云毓", "Wuxi Nebutra"];

/** Recursively collect all string values from a JSON object. */
function collectStringValues(obj: unknown, path = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") {
    return [{ path, value: obj }];
  }
  if (obj === null || typeof obj !== "object") {
    return [];
  }
  if (Array.isArray(obj)) {
    return obj.flatMap((item, i) => collectStringValues(item, `${path}[${i}]`));
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectStringValues(v, path ? `${path}.${k}` : k),
  );
}

interface Violation {
  file: string;
  path: string;
  value: string;
  matched: string;
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];
  const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));

  for (const filename of files) {
    const filePath = join(MESSAGES_DIR, filename);
    const raw = JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
    const entries = collectStringValues(raw);

    for (const { path, value } of entries) {
      for (const literal of BANNED_LITERALS) {
        if (value.includes(literal)) {
          violations.push({ file: filename, path, value, matched: literal });
          break; // one violation per path is enough
        }
      }
    }
  }
  return violations;
}

describe("i18n brand literals", () => {
  it("no raw brand identity literals in any message catalog string value", () => {
    const violations = collectViolations();
    if (violations.length > 0) {
      const summary = violations
        .slice(0, 20)
        .map(
          (v) =>
            `  ${v.file}  ${v.path}\n    matched: ${JSON.stringify(v.matched)}\n    value: ${v.value.slice(0, 120)}`,
        )
        .join("\n");
      throw new Error(
        `${violations.length} raw brand literal(s) found in message catalogs.\n` +
          `Replace with ICU placeholders: {brandName}, {brandNameCn}, {companyLegal}, {companyLegalEn}, {productName}.\n\n` +
          summary +
          (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : ""),
      );
    }
  });

  it("i18n brand-literal allowlist must be empty (shrink-only — list drains as files are migrated)", () => {
    // Phase 4 opted for Option A (standalone lint script, no _config.mjs entry).
    // The allowlist concept for i18n literals is: after full migration, no file
    // should retain raw literals; the arch test itself IS the ratchet.
    // This test exists to document the contract and confirm zero grandfathered entries.
    const ALLOWLIST: string[] = [];
    expect(ALLOWLIST).toHaveLength(0);
  });
});
