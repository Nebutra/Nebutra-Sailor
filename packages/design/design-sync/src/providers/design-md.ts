import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { LintReport } from "@google/design.md/linter";
import { logger } from "@nebutra/logger";
import { defaultTokensDir, readTokenSets, writeTokenSet } from "../io";
import { importFromDesignMd } from "../serialize/from-design-md";
import { serializeToDesignMd } from "../serialize/to-design-md";
import { serializeToPreviewHtml } from "../serialize/to-preview-html";
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

/**
 * Derive the preview file path from the DESIGN.md path.
 *
 * Replaces a trailing `.md` extension with `.preview.html`;
 * if the path does not end in `.md`, appends `.preview.html`.
 *
 * Examples:
 *   "/repo/DESIGN.md"        → "/repo/DESIGN.preview.html"
 *   "/repo/design/tokens.md" → "/repo/design/tokens.preview.html"
 *   "/repo/DESIGN"           → "/repo/DESIGN.preview.html"
 */
export function previewHtmlPathFor(mdPath: string): string {
  if (mdPath.endsWith(".md")) {
    return `${mdPath.slice(0, -3)}.preview.html`;
  }
  return `${mdPath}.preview.html`;
}

// ─── Lint Gate ────────────────────────────────────────────────────────────────

/**
 * Throw if the LintReport contains any error-severity findings.
 * Warnings do not throw — they are surfaced in the push summary.
 * Used as the fail-closed gate before writing a DESIGN.md.
 *
 * Fail-closed on either signal: error-severity findings in `findings[]`
 * OR a non-zero `summary.errors` count.
 *
 * @param report - The LintReport returned by `lint(content)`.
 * @param source - A human-readable label for the file (used in the error message).
 * @throws When error-severity findings are present or `summary.errors > 0`.
 */
export function assertLintClean(report: LintReport, source: string): void {
  const errorFindings = report.findings.filter((f) => f.severity === "error");
  if (errorFindings.length === 0 && report.summary.errors === 0) return;

  const count = errorFindings.length || report.summary.errors;
  const detail = errorFindings
    .map((f) => (f.path ? `  ${f.path}: ${f.message}` : `  ${f.message}`))
    .join("\n");

  throw new Error(`[design-md] Lint failed for ${source} — ${count} error(s):\n${detail}`);
}

// ─── Lint Runner ─────────────────────────────────────────────────────────────

/**
 * Dynamically imports the @google/design.md linter and runs it on `content`.
 * Extracted as a named export so tests can verify the `[design-md]`-prefixed
 * error thrown when the dynamic import or lint call itself fails.
 *
 * @throws When the linter import or invocation throws — error is wrapped with a
 *   `[design-md] Lint gate failed to run on <label>:` prefix.
 */
export async function runLintGate(content: string, label: string): Promise<LintReport> {
  try {
    const { lint } = await import("@google/design.md/linter");
    return lint(content);
  } catch (err) {
    throw new Error(
      `[design-md] Lint gate failed to run on ${label}: ${(err as Error)?.message ?? String(err)}`,
    );
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export class DesignMdProvider implements DesignSyncProvider {
  readonly name = "design-md" as const;

  private readonly tokensDir: string;
  private readonly designMdPath: string;
  private readonly designSystemName: string | undefined;
  private readonly designSystemDescription: string | undefined;

  constructor(config: DesignMdProviderConfig) {
    this.tokensDir = config.tokensDir ?? defaultTokensDir();
    this.designMdPath = config.designMdPath ?? process.env.DESIGN_MD_PATH ?? defaultDesignMdPath();
    this.designSystemName = config.name;
    this.designSystemDescription = config.description;

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

    if (report.warnings.length > 0 || report.missingRequired.length > 0) {
      logger.warn("[design-sync:design-md] imported DESIGN.md has gaps", {
        warnings: report.warnings.length,
        missingRequired: report.missingRequired,
      });
    }

    const dryRun = options.dryRun ?? false;
    if (!dryRun) {
      await writeTokenSet(this.tokensDir, set);
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
    const content = serializeToDesignMd(all, {
      ...(this.designSystemName !== undefined ? { name: this.designSystemName } : {}),
      ...(this.designSystemDescription !== undefined
        ? { description: this.designSystemDescription }
        : {}),
    });

    // Compute a consistent, human-readable path label (relative preferred).
    const mdLabel = relative(process.cwd(), this.designMdPath) || this.designMdPath;

    // Run the official lint gate — fail closed on any error finding.
    const lintReport = await runLintGate(content, mdLabel);

    // Collect warnings for the summary (they don't block the write).
    const warnings = lintReport.findings
      .filter((f) => f.severity === "warning")
      .map((f) => (f.path ? `${f.path}: ${f.message}` : f.message));

    // Throw if any error-severity findings are present.
    assertLintClean(lintReport, mdLabel);

    // Compute the sibling preview path (before the write, so it's always defined)
    const previewPath = previewHtmlPathFor(this.designMdPath);

    const dryRun = options.dryRun ?? false;
    if (!dryRun) {
      await mkdir(dirname(this.designMdPath), { recursive: true });
      await writeFile(this.designMdPath, content, "utf8");
      logger.info("[design-sync:design-md] push wrote DESIGN.md", {
        designMdPath: this.designMdPath,
        sets: all.length,
      });

      // Generate and write the sibling visual preview
      const previewHtml = serializeToPreviewHtml(all, {
        ...(this.designSystemName !== undefined ? { name: this.designSystemName } : {}),
      });
      await writeFile(previewPath, previewHtml, "utf8");
      logger.info("[design-sync:design-md] push wrote preview", {
        previewPath,
      });
    } else {
      logger.info("[design-sync:design-md] push dry-run — lint passed, files NOT written", {
        designMdPath: this.designMdPath,
        previewPath,
      });
    }

    const warnSuffix = warnings.length > 0 ? ` (${warnings.length} warning(s))` : "";

    return {
      pushed: !dryRun,
      sets: dryRun ? [this.designMdPath] : [this.designMdPath, previewPath],
      provider: "design-md",
      pushedAt: new Date().toISOString(),
      summary: dryRun
        ? `design-md: dry-run — lint passed, would write ${mdLabel}${warnSuffix}`
        : `design-md: wrote ${mdLabel} from ${all.length} DTCG set(s)${warnSuffix}`,
      dryRun,
    };
  }

  // ── Healthcheck ───────────────────────────────────────────────────────────

  async healthcheck(): Promise<HealthStatus> {
    const detected: string[] = [];
    const missing: string[] = [];

    // 1. Check tokensDir exists.
    let tokensDirOk = false;
    try {
      const info = await stat(this.tokensDir);
      if (info.isDirectory()) {
        tokensDirOk = true;
        detected.push("tokensDir");
      } else {
        missing.push("tokensDir (not a directory)");
      }
    } catch {
      missing.push("tokensDir (does not exist)");
    }

    // 2. Check the @google/design.md lib is importable (it's a dep, should always be).
    let lintLibOk = false;
    try {
      await import("@google/design.md/linter");
      lintLibOk = true;
      detected.push("@google/design.md");
    } catch {
      missing.push("@google/design.md (lib not importable)");
    }

    // 3. List DESIGN_MD_PATH in detectedEnv when it's set (it's optional, not required).
    const envPath = process.env.DESIGN_MD_PATH;
    if (envPath) {
      detected.push(`DESIGN_MD_PATH=${envPath}`);
    }

    // 4. Check the parent directory of designMdPath is accessible.
    let mdDirOk = false;
    const mdDir = dirname(this.designMdPath);
    try {
      await access(mdDir);
      mdDirOk = true;
      detected.push("designMdPath.parent");
    } catch {
      missing.push("designMdPath.parent (not accessible)");
    }

    const ok = tokensDirOk && lintLibOk && mdDirOk;

    return {
      ok,
      provider: "design-md",
      message: ok
        ? `design-md: ready — tokensDir found, lint lib present, designMdPath=${this.designMdPath}`
        : `design-md: not ready — missing: ${missing.join(", ")}`,
      detectedEnv: detected,
      missingEnv: missing,
    };
  }
}
