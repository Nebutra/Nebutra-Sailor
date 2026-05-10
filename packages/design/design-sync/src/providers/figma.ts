import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@nebutra/logger";
import { defaultTokensDir, defaultTokensStudioDir, readTokenSets, validateDtcgTree } from "../io";
import type {
  DesignSyncProvider,
  FigmaProviderConfig,
  HealthStatus,
  PullOptions,
  PullResult,
  PushOptions,
  PushResult,
} from "../types";

// =============================================================================
// Figma Provider — Figma + Tokens Studio
// =============================================================================
// Architecture (matches the legacy `.tokens-studio/config.json` setup):
//
//   Figma (Tokens Studio plugin) ──► GitHub branch ──► repo (DTCG JSON)
//                              ▲                             │
//                              └─── pull from main ──────────┘
//
// The plugin owns the git transport. This provider:
//   - validates that the Tokens Studio config + DTCG tree are well-formed
//   - "pull" reads the DTCG files the plugin already wrote to git
//   - "push" is a dry-run scaffold for the Figma Variables REST API
//     (PATCH /v1/files/:file_key/variables) — the user must opt in by
//     providing FIGMA_PERSONAL_ACCESS_TOKEN + FIGMA_FILE_ID and removing
//     the early-exit guard.
//
// All Tokens Studio metadata that previously lived in `.tokens-studio/` is
// still consumed from disk so the existing designer onboarding does not break.
// =============================================================================

const FIGMA_API_ROOT = "https://api.figma.com";

export class FigmaProvider implements DesignSyncProvider {
  readonly name = "figma" as const;

  private readonly tokensDir: string;
  private readonly tokensStudioDir: string;
  private readonly personalAccessToken: string | undefined;
  private readonly fileId: string | undefined;
  private readonly githubRepo: string | undefined;
  private readonly githubBranch: string;

  constructor(config: FigmaProviderConfig) {
    this.tokensDir = config.tokensDir ?? defaultTokensDir();
    this.tokensStudioDir = config.tokensStudioDir ?? defaultTokensStudioDir();
    this.personalAccessToken =
      config.personalAccessToken ?? process.env.FIGMA_PERSONAL_ACCESS_TOKEN ?? undefined;
    this.fileId = config.fileId ?? process.env.FIGMA_FILE_ID ?? undefined;
    this.githubRepo = config.githubRepo ?? process.env.FIGMA_GITHUB_REPO ?? undefined;
    this.githubBranch = config.githubBranch ?? process.env.FIGMA_GITHUB_BRANCH ?? "main";

    logger.info("[design-sync:figma] Provider initialised", {
      tokensDir: this.tokensDir,
      hasToken: Boolean(this.personalAccessToken),
      hasFileId: Boolean(this.fileId),
    });
  }

  async pull(options: PullOptions = {}): Promise<PullResult> {
    // Tokens Studio plugin already wrote DTCG files to git on `pull`.
    // We just re-read them from disk and (optionally) validate Tokens
    // Studio metadata so the result mirrors what the plugin would emit.
    const sets = await readTokenSets(this.tokensDir);
    const filtered = filterSets(sets, options.themes);
    await this.assertTokensStudioMetadata();

    return {
      sets: filtered,
      written: false,
      provider: "figma",
      pulledAt: new Date().toISOString(),
      summary: `figma: read ${filtered.length} DTCG token set(s) (Tokens Studio plugin owns the git transport)`,
    };
  }

  async push(options: PushOptions = {}): Promise<PushResult> {
    // Pre-flight: validate DTCG before attempting any remote call.
    const all = await readTokenSets(this.tokensDir);
    const sets = filterSets(all, options.themes);

    for (const set of sets) {
      const errors = validateDtcgTree(set.tokens);
      if (errors.length > 0) {
        throw new Error(
          `[design-sync:figma] DTCG validation failed for ${set.relativePath}:\n  - ${errors.join(
            "\n  - ",
          )}`,
        );
      }
    }

    const credsReady = Boolean(this.personalAccessToken && this.fileId);
    const explicitDryRun = options.dryRun ?? false;
    const dryRun = explicitDryRun || !credsReady;

    if (dryRun) {
      logger.warn("[design-sync:figma] push skipped (dry-run scaffold)", {
        reason: credsReady ? "explicit dryRun" : "missing credentials",
        sets: sets.length,
      });
      return {
        pushed: false,
        sets: sets.map((s) => s.relativePath),
        provider: "figma",
        pushedAt: new Date().toISOString(),
        summary: credsReady
          ? `figma: dry-run — would PATCH ${sets.length} set(s) to ${FIGMA_API_ROOT}/v1/files/${this.fileId}/variables`
          : "figma: dry-run — FIGMA_PERSONAL_ACCESS_TOKEN or FIGMA_FILE_ID not set",
        dryRun: true,
      };
    }

    // Real push placeholder — kept guarded until the user opts in.
    // The integration will call the Figma Variables REST API:
    //   PATCH /v1/files/:file_key/variables
    //   X-Figma-Token: <personalAccessToken>
    // See https://www.figma.com/developers/api#variables
    throw new Error(
      "[design-sync:figma] live push to Figma Variables REST API is not yet implemented. " +
        "Use { dryRun: true } or unset FIGMA_PERSONAL_ACCESS_TOKEN until the integration is wired up. " +
        "See packages/design/design-sync/DESIGN.md for the rollout plan.",
    );
  }

  async healthcheck(): Promise<HealthStatus> {
    const detected: string[] = [];
    const missing: string[] = [];

    if (this.personalAccessToken) detected.push("FIGMA_PERSONAL_ACCESS_TOKEN");
    else missing.push("FIGMA_PERSONAL_ACCESS_TOKEN");

    if (this.fileId) detected.push("FIGMA_FILE_ID");
    else missing.push("FIGMA_FILE_ID");

    if (this.githubRepo) detected.push("FIGMA_GITHUB_REPO");
    if (this.githubBranch) detected.push(`FIGMA_GITHUB_BRANCH=${this.githubBranch}`);

    let tokensStudioOk = true;
    let tokensStudioMessage = "";
    try {
      await this.assertTokensStudioMetadata();
    } catch (error) {
      tokensStudioOk = false;
      tokensStudioMessage = (error as Error).message;
      missing.push("tokens-studio metadata");
    }

    const ok = missing.length === 0 && tokensStudioOk;
    return {
      ok,
      provider: "figma",
      message: ok
        ? "figma: credentials present + Tokens Studio metadata valid"
        : `figma: not ready — ${[
            missing.length > 0 ? `missing ${missing.join(", ")}` : "",
            tokensStudioMessage,
          ]
            .filter(Boolean)
            .join("; ")}`,
      detectedEnv: detected,
      missingEnv: missing,
    };
  }

  /**
   * Assert that `.tokens-studio/{config,metadata,themes}.json` exist + parse.
   * The plugin refuses to load the design system if any of these are missing
   * or malformed; surfacing the failure here prevents silent drift.
   */
  private async assertTokensStudioMetadata(): Promise<void> {
    const required = ["config.json", "metadata.json", "themes.json"];
    const errors: string[] = [];

    try {
      const info = await stat(this.tokensStudioDir);
      if (!info.isDirectory()) {
        throw new Error(`${this.tokensStudioDir} is not a directory`);
      }
    } catch (error) {
      throw new Error(
        `[design-sync:figma] Tokens Studio metadata directory missing at ${this.tokensStudioDir}: ${(error as Error).message}`,
      );
    }

    for (const file of required) {
      const path = join(this.tokensStudioDir, file);
      try {
        const raw = await readFile(path, "utf8");
        JSON.parse(raw);
      } catch (error) {
        errors.push(`${path}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `[design-sync:figma] Tokens Studio metadata invalid:\n  - ${errors.join("\n  - ")}`,
      );
    }
  }
}

function filterSets<T extends { name: string; relativePath: string }>(
  sets: T[],
  themes: readonly string[] | undefined,
): T[] {
  if (!themes || themes.length === 0) return sets;
  const wanted = new Set(themes);
  return sets.filter((s) => wanted.has(s.name) || wanted.has(s.relativePath));
}
