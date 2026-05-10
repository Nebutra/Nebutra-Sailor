import { logger } from "@nebutra/logger";
import {
  defaultTokensDir,
  defaultTokensStudioDir,
  readTokenSets,
  validateDtcgTree,
} from "../io.js";
import type {
  DesignSyncProvider,
  HealthStatus,
  PenpotProviderConfig,
  PullOptions,
  PullResult,
  PushOptions,
  PushResult,
} from "../types.js";

// =============================================================================
// Penpot Provider — China-friendly + self-hostable Figma alternative
// =============================================================================
// Penpot speaks DTCG natively (one of its differentiators) and exposes a
// public REST API. The provider is wired with full surface area so customers
// can swap providers without changing application code, but real network
// calls stay behind a `dryRun || !credsReady` guard until the operator
// explicitly provisions PENPOT_TOKEN.
//
// Why this matters:
//   - Penpot can be self-hosted, sidesteps the Figma block in mainland China.
//   - DTCG-native means we do not need a translation step like with Figma.
//   - Tokens Studio plugin also targets Penpot — designers keep the same UX.
// =============================================================================

const DEFAULT_PENPOT_API = "https://design.penpot.app/api";

export class PenpotProvider implements DesignSyncProvider {
  readonly name = "penpot" as const;

  private readonly tokensDir: string;
  private readonly tokensStudioDir: string;
  private readonly apiUrl: string;
  private readonly token: string | undefined;
  private readonly fileId: string | undefined;
  private readonly teamId: string | undefined;

  constructor(config: PenpotProviderConfig) {
    this.tokensDir = config.tokensDir ?? defaultTokensDir();
    this.tokensStudioDir = config.tokensStudioDir ?? defaultTokensStudioDir();
    this.apiUrl = config.apiUrl ?? process.env.PENPOT_API_URL ?? DEFAULT_PENPOT_API;
    this.token = config.token ?? process.env.PENPOT_TOKEN ?? undefined;
    this.fileId = config.fileId ?? process.env.PENPOT_FILE_ID ?? undefined;
    this.teamId = config.teamId ?? process.env.PENPOT_TEAM_ID ?? undefined;

    logger.info("[design-sync:penpot] Provider initialised", {
      apiUrl: this.apiUrl,
      hasToken: Boolean(this.token),
      hasFileId: Boolean(this.fileId),
    });
  }

  async pull(options: PullOptions = {}): Promise<PullResult> {
    if (!this.credsReady()) {
      // No credentials → fall through to local DTCG, mirroring git-only.
      const sets = await readTokenSets(this.tokensDir);
      const filtered = filterSets(sets, options.themes);
      logger.warn("[design-sync:penpot] pull falling back to local DTCG (no PENPOT_TOKEN)");
      return {
        sets: filtered,
        written: false,
        provider: "penpot",
        pulledAt: new Date().toISOString(),
        summary: `penpot: PENPOT_TOKEN missing — returned ${filtered.length} local DTCG set(s)`,
      };
    }

    // Real pull placeholder — when wired up, this calls:
    //   GET {apiUrl}/rpc/command/get-file?id={fileId}
    //   Authorization: Token {token}
    // and projects the design-tokens collection back into DTCG sets.
    // See https://design.penpot.app/api/docs for the full RPC catalogue.
    throw new Error(
      "[design-sync:penpot] live pull is not yet implemented. " +
        "Unset PENPOT_TOKEN to fall back to local DTCG, or open packages/design/design-sync/DESIGN.md for the rollout plan.",
    );
  }

  async push(options: PushOptions = {}): Promise<PushResult> {
    const all = await readTokenSets(this.tokensDir);
    const sets = filterSets(all, options.themes);

    for (const set of sets) {
      const errors = validateDtcgTree(set.tokens);
      if (errors.length > 0) {
        throw new Error(
          `[design-sync:penpot] DTCG validation failed for ${set.relativePath}:\n  - ${errors.join(
            "\n  - ",
          )}`,
        );
      }
    }

    const credsReady = this.credsReady();
    const explicitDryRun = options.dryRun ?? false;
    const dryRun = explicitDryRun || !credsReady;

    if (dryRun) {
      logger.warn("[design-sync:penpot] push skipped (dry-run scaffold)", {
        reason: credsReady ? "explicit dryRun" : "missing credentials",
        sets: sets.length,
      });
      return {
        pushed: false,
        sets: sets.map((s) => s.relativePath),
        provider: "penpot",
        pushedAt: new Date().toISOString(),
        summary: credsReady
          ? `penpot: dry-run — would POST ${sets.length} DTCG set(s) to ${this.apiUrl}/rpc/command/update-file-design-tokens`
          : "penpot: dry-run — PENPOT_TOKEN or PENPOT_FILE_ID missing",
        dryRun: true,
      };
    }

    // Real push placeholder — when wired up, this calls:
    //   POST {apiUrl}/rpc/command/update-file-design-tokens
    //   Authorization: Token {token}
    //   body: { fileId, tokens: dtcgTree }
    throw new Error(
      "[design-sync:penpot] live push is not yet implemented. " +
        "Use { dryRun: true } until the Penpot RPC integration is wired up.",
    );
  }

  async healthcheck(): Promise<HealthStatus> {
    const detected: string[] = [];
    const missing: string[] = [];

    if (this.token) detected.push("PENPOT_TOKEN");
    else missing.push("PENPOT_TOKEN");

    if (this.fileId) detected.push("PENPOT_FILE_ID");
    else missing.push("PENPOT_FILE_ID");

    if (this.teamId) detected.push("PENPOT_TEAM_ID");
    detected.push(`PENPOT_API_URL=${this.apiUrl}`);

    const ok = missing.length === 0;
    return {
      ok,
      provider: "penpot",
      message: ok
        ? `penpot: credentials present (api=${this.apiUrl})`
        : `penpot: not ready — missing ${missing.join(", ")}`,
      detectedEnv: detected,
      missingEnv: missing,
    };
  }

  /**
   * Reserved for future use — exposes the configured tokens-studio directory
   * so consumers (e.g. CI workflows) can attach Penpot-side metadata mirrors.
   */
  getTokensStudioDir(): string {
    return this.tokensStudioDir;
  }

  private credsReady(): boolean {
    return Boolean(this.token && this.fileId);
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
