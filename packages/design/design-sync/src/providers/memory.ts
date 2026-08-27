import { logger } from "@nebutra/logger";
import type {
  DesignSyncProvider,
  DesignTokenSet,
  HealthStatus,
  MemoryProviderConfig,
  PullOptions,
  PullResult,
  PushOptions,
  PushResult,
} from "../types";

// =============================================================================
// Memory Provider — in-memory test fixture
// =============================================================================
// Used in unit tests and CI dry-runs where touching the filesystem or
// hitting a remote API would be wasteful. Tracks `pull`/`push` calls so
// tests can assert behaviour.
// NOT for production.
// =============================================================================

export class MemoryProvider implements DesignSyncProvider {
  readonly name = "memory" as const;

  private sets: DesignTokenSet[];
  public readonly pullCalls: PullOptions[] = [];
  public readonly pushCalls: PushOptions[] = [];

  constructor(config: MemoryProviderConfig) {
    this.sets = config.initialSets ?? [];
    logger.info("[design-sync:memory] Provider initialised (test fixture only)");
  }

  async pull(options: PullOptions = {}): Promise<PullResult> {
    this.pullCalls.push(options);
    const sets = filterSets(this.sets, options.themes);
    return {
      sets,
      written: false,
      provider: "memory",
      pulledAt: new Date().toISOString(),
      summary: `memory: returned ${sets.length} in-memory token set(s)`,
    };
  }

  async push(options: PushOptions = {}): Promise<PushResult> {
    this.pushCalls.push(options);
    const filtered = filterSets(this.sets, options.themes);
    const dryRun = options.dryRun ?? false;
    return {
      pushed: !dryRun,
      sets: filtered.map((s) => s.relativePath),
      provider: "memory",
      pushedAt: new Date().toISOString(),
      summary: `memory: ${dryRun ? "dry-run" : "applied"} ${filtered.length} set(s)`,
      dryRun,
    };
  }

  async healthcheck(): Promise<HealthStatus> {
    return {
      ok: true,
      provider: "memory",
      message: "memory provider always healthy (test fixture)",
      detectedEnv: [],
      missingEnv: [],
    };
  }

  /**
   * Replace the in-memory set list — useful in tests for asserting how
   * the provider responds to different remote states.
   */
  replaceSets(sets: DesignTokenSet[]): void {
    this.sets = [...sets];
  }
}

function filterSets(
  sets: DesignTokenSet[],
  themes: readonly string[] | undefined,
): DesignTokenSet[] {
  if (!themes || themes.length === 0) return sets;
  const wanted = new Set(themes);
  return sets.filter((s) => wanted.has(s.name) || wanted.has(s.relativePath));
}
