import { stat } from "node:fs/promises";
import { logger } from "@nebutra/logger";
import {
  defaultTokensDir,
  defaultTokensStudioDir,
  readTokenSets,
  validateDtcgTree,
  writeTokenSet,
} from "../io";
import type {
  DesignSyncProvider,
  GitOnlyProviderConfig,
  HealthStatus,
  PullOptions,
  PullResult,
  PushOptions,
  PushResult,
} from "../types";

// =============================================================================
// Git-Only Provider — DTCG-only, no design tool
// =============================================================================
// This is the zero-config default for indie hackers, AI-driven dev workflows,
// and any team that does NOT use a design tool. It treats the local
// `packages/design/design-tokens/tokens` directory as the single source of truth.
//
// `pull` simply re-reads the DTCG files (a no-op refresh).
// `push` validates + re-serialises (formats) the DTCG files in place.
// =============================================================================

export class GitOnlyProvider implements DesignSyncProvider {
  readonly name = "git-only" as const;

  private readonly tokensDir: string;
  private readonly tokensStudioDir: string;

  constructor(config: GitOnlyProviderConfig) {
    this.tokensDir = config.tokensDir ?? defaultTokensDir();
    this.tokensStudioDir = config.tokensStudioDir ?? defaultTokensStudioDir();
    logger.info("[design-sync:git-only] Provider initialised", {
      tokensDir: this.tokensDir,
    });
  }

  async pull(options: PullOptions = {}): Promise<PullResult> {
    const sets = await readTokenSets(this.tokensDir);
    const filtered = filterSets(sets, options.themes);

    return {
      sets: filtered,
      written: false,
      provider: "git-only",
      pulledAt: new Date().toISOString(),
      summary: `Read ${filtered.length} DTCG token set(s) from ${this.tokensDir}`,
    };
  }

  async push(options: PushOptions = {}): Promise<PushResult> {
    const all = await readTokenSets(this.tokensDir);
    const sets = filterSets(all, options.themes);

    // Validate every set before re-serialising — fail closed on bad DTCG.
    for (const set of sets) {
      const errors = validateDtcgTree(set.tokens);
      if (errors.length > 0) {
        throw new Error(
          `[design-sync:git-only] DTCG validation failed for ${set.relativePath}:\n  - ${errors.join(
            "\n  - ",
          )}`,
        );
      }
    }

    const dryRun = options.dryRun ?? false;
    if (!dryRun) {
      for (const set of sets) {
        await writeTokenSet(this.tokensDir, set);
      }
    }

    return {
      pushed: !dryRun,
      sets: sets.map((s) => s.relativePath),
      provider: "git-only",
      pushedAt: new Date().toISOString(),
      summary: dryRun
        ? `Validated ${sets.length} DTCG file(s) (dry-run, no files modified)`
        : `Reformatted ${sets.length} DTCG file(s) under ${this.tokensDir}`,
      dryRun,
    };
  }

  async healthcheck(): Promise<HealthStatus> {
    const detected: string[] = [];
    const missing: string[] = [];

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

    try {
      const info = await stat(this.tokensStudioDir);
      if (info.isDirectory()) {
        detected.push("tokensStudioDir");
      }
    } catch {
      // tokens-studio dir is optional for git-only mode
    }

    const ok = missing.length === 0;
    return {
      ok,
      provider: "git-only",
      message: ok
        ? `git-only ready — DTCG source dir found at ${this.tokensDir}`
        : `git-only misconfigured — missing: ${missing.join(", ")}`,
      detectedEnv: detected,
      missingEnv: missing,
    };
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
