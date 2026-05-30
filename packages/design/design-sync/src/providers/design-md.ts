import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { logger } from "@nebutra/logger";
import { defaultTokensDir, readTokenSets } from "../io";
import { importFromDesignMd } from "../serialize/from-design-md";
import { serializeToDesignMd } from "../serialize/to-design-md";
import type {
  DesignMdProviderConfig,
  DesignSyncProvider,
  HealthStatus,
  PullOptions,
  PullResult,
  PushOptions,
  PushResult,
} from "../types";

// =============================================================================
// DesignMd Provider — AI-native DESIGN.md format (@google/design.md)
// =============================================================================
// The "design tool" here is a DESIGN.md file in the repo root (or a
// configurable path). Push = repo DTCG → DESIGN.md (with official lint gate).
// Pull = DESIGN.md → a `themes/<brand>.json` DTCG file in tokensDir.
//
// Why DESIGN.md?
//   - Zero external dependencies at runtime (just a file in git)
//   - AI-native: models can read/write DESIGN.md directly
//   - Google's @google/design.md spec mandates lint rules (broken-ref, contrast)
//   - Bridges the gap for indie hackers who want typed tokens without a design tool
// =============================================================================

/**
 * Default DESIGN.md path: <cwd>/DESIGN.md
 */
function defaultDesignMdPath(cwd: string = process.cwd()): string {
  return join(cwd, "DESIGN.md");
}

// ─── Lint Gate ────────────────────────────────────────────────────────────────

/**
 * Import ONLY from `@google/design.md/linter` — never from the main entry
 * (it auto-runs a CLI). The `lint` function is synchronous and returns a
 * `LintReport` with `findings[]` and `summary.errors`.
 */
import type { LintReport } from "@google/design.md/linter";

/**
 * Throw if the LintReport contains any error-severity findings.
 * Warnings do not throw — they are surfaced in the push summary.
 * Used as the fail-closed gate before writing a DESIGN.md.
 *
 * @param report - The LintReport returned by `lint(content)`.
 * @param source - A human-readable label for the file (used in the error message).
 * @throws When `report.summary.errors > 0`.
 */
export function assertLintClean(report: LintReport, source: string): void {
  if (report.summary.errors === 0) return;

  const errorFindings = report.findings.filter((f) => f.severity === "error");
  const detail = errorFindings
    .map((f) => (f.path ? `  ${f.path}: ${f.message}` : `  ${f.message}`))
    .join("\n");

  throw new Error(
    `[design-md] Lint failed for ${source} — ${report.summary.errors} error(s):\n${detail}`,
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export class DesignMdProvider implements DesignSyncProvider {
  readonly name = "design-md" as const;

  private readonly tokensDir: string;
  private readonly designMdPath: string;

  constructor(config: DesignMdProviderConfig) {
    this.tokensDir = config.tokensDir ?? defaultTokensDir();
    this.designMdPath = config.designMdPath ?? process.env.DESIGN_MD_PATH ?? defaultDesignMdPath();

    logger.info("[design-sync:design-md] Provider initialised", {
      tokensDir: this.tokensDir,
      designMdPath: this.designMdPath,
    });
  }

  // ── Pull: DESIGN.md → tokensDir/themes/<brand>.json ──────────────────────

  async pull(options: PullOptions = {}): Promise<PullResult> {
    // Graceful handling: if DESIGN.md does not exist, return an empty result.
    let content: string;
    try {
      content = await readFile(this.designMdPath, "utf8");
    } catch {
      logger.warn("[design-sync:design-md] DESIGN.md not found, returning empty pull result", {
        designMdPath: this.designMdPath,
      });
      return {
        sets: [],
        written: false,
        provider: "design-md",
        pulledAt: new Date().toISOString(),
        summary: `design-md: DESIGN.md not found at ${this.designMdPath} — no sets pulled`,
      };
    }

    const { set, report } = importFromDesignMd(content);

    const dryRun = options.dryRun ?? false;
    if (!dryRun) {
      const target = join(this.tokensDir, set.relativePath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, `${JSON.stringify(set.tokens, null, 2)}\n`, "utf8");
      logger.info("[design-sync:design-md] pull wrote token set", {
        relativePath: set.relativePath,
      });
    }

    const missingCount = report.missingRequired.length;
    const unmappedCount = report.unmapped.length;
    const reportSuffix =
      missingCount > 0 || unmappedCount > 0
        ? ` (missingRequired: ${missingCount}, unmapped: ${unmappedCount})`
        : "";

    return {
      sets: [set],
      written: !dryRun,
      provider: "design-md",
      pulledAt: new Date().toISOString(),
      summary: dryRun
        ? `design-md: dry-run — would write ${set.relativePath}${reportSuffix}`
        : `design-md: wrote ${set.relativePath}${reportSuffix}`,
    };
  }

  // ── Push: tokensDir → DESIGN.md (with official lint gate) ────────────────

  async push(options: PushOptions = {}): Promise<PushResult> {
    const all = await readTokenSets(this.tokensDir);

    // Serialize all sets into DESIGN.md content.
    const content = serializeToDesignMd(all);

    // Run the official lint gate — fail closed on any error finding.
    let lintReport: LintReport;
    try {
      const { lint } = await import("@google/design.md/linter");
      lintReport = lint(content);
    } catch (err) {
      throw new Error(
        `[design-md] Lint gate failed to run on ${this.designMdPath}: ${(err as Error)?.message ?? String(err)}`,
      );
    }

    // Collect warnings for the summary (they don't block the write).
    const warnings = lintReport.findings
      .filter((f) => f.severity === "warning")
      .map((f) => (f.path ? `${f.path}: ${f.message}` : f.message));

    // Throw if any error-severity findings are present.
    assertLintClean(lintReport, relative(process.cwd(), this.designMdPath) || this.designMdPath);

    const dryRun = options.dryRun ?? false;
    if (!dryRun) {
      await mkdir(dirname(this.designMdPath), { recursive: true });
      await writeFile(this.designMdPath, content, "utf8");
      logger.info("[design-sync:design-md] push wrote DESIGN.md", {
        designMdPath: this.designMdPath,
        sets: all.length,
      });
    } else {
      logger.info("[design-sync:design-md] push dry-run — lint passed, file NOT written", {
        designMdPath: this.designMdPath,
      });
    }

    const warnSuffix = warnings.length > 0 ? ` (${warnings.length} warning(s))` : "";

    return {
      pushed: !dryRun,
      sets: [this.designMdPath],
      provider: "design-md",
      pushedAt: new Date().toISOString(),
      summary: dryRun
        ? `design-md: dry-run — lint passed, would write ${this.designMdPath}${warnSuffix}`
        : `design-md: wrote ${this.designMdPath} from ${all.length} DTCG set(s)${warnSuffix}`,
      dryRun,
    };
  }

  // ── Healthcheck ───────────────────────────────────────────────────────────

  async healthcheck(): Promise<HealthStatus> {
    const detected: string[] = [];
    const missing: string[] = [];

    // 1. Check tokensDir exists.
    try {
      const info = await stat(this.tokensDir);
      if (info.isDirectory()) {
        detected.push("tokensDir");
      } else {
        missing.push("tokensDir (not a directory)");
      }
    } catch {
      missing.push("tokensDir (does not exist)");
    }

    // 2. Check the @google/design.md lib is importable (it's a dep, should always be).
    try {
      await import("@google/design.md/linter");
      detected.push("@google/design.md");
    } catch {
      missing.push("@google/design.md (lib not importable)");
    }

    // 3. Check DESIGN_MD_PATH env var and designMdPath parent dir.
    const envPath = process.env.DESIGN_MD_PATH;
    if (envPath) {
      detected.push(`DESIGN_MD_PATH=${envPath}`);
    } else {
      missing.push("DESIGN_MD_PATH");
    }

    // 4. Check the parent directory of designMdPath is writable.
    const mdDir = dirname(this.designMdPath);
    try {
      await access(mdDir);
      detected.push("designMdPath.parent");
    } catch {
      missing.push("designMdPath.parent (not accessible)");
    }

    const ok = !missing.some(
      (m) =>
        m === "tokensDir (does not exist)" ||
        m === "tokensDir (not a directory)" ||
        m === "@google/design.md (lib not importable)" ||
        m === "designMdPath.parent (not accessible)",
    );

    return {
      ok,
      provider: "design-md",
      message: ok
        ? `design-md: ready — tokensDir found, lint lib present, designMdPath=${this.designMdPath}`
        : `design-md: not ready — missing: ${missing.filter((m) => m !== "DESIGN_MD_PATH").join(", ")}`,
      detectedEnv: detected,
      missingEnv: missing,
    };
  }
}
