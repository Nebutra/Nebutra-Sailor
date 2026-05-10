import { z } from "zod";

// =============================================================================
// Core Design-Sync Abstraction — Provider-agnostic design-tool sync
// =============================================================================
// Purpose: keep design-tool token sources (Figma + Tokens Studio, Penpot, etc.)
// in lock-step with the canonical W3C DTCG JSON files committed to the repo.
//
// The application code never imports a provider directly — it imports
// `getDesignSync()` and the runtime resolves the correct backend.
// =============================================================================

/**
 * Supported design-sync backend providers.
 *
 * - `figma`     — Figma + Tokens Studio plugin (DTCG via GitHub provider sync)
 * - `penpot`    — Penpot REST API (self-hostable, China-friendly)
 * - `git-only`  — No design tool; reads/writes local DTCG files directly
 * - `memory`    — In-memory test fixture (CI / unit tests only)
 */
export type DesignSyncProviderType = "figma" | "penpot" | "git-only" | "memory";

// ── DTCG Token Schema ───────────────────────────────────────────────────────

/**
 * A W3C Design Tokens Community Group (DTCG) leaf token.
 * Every leaf MUST carry both `$value` and `$type`.
 *
 * Spec: https://design-tokens.github.io/community-group/format/
 */
export const DesignTokenLeafSchema = z
  .object({
    $value: z.unknown(),
    $type: z.string(),
    $description: z.string().optional(),
    $extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type DesignTokenLeaf = z.infer<typeof DesignTokenLeafSchema>;

/**
 * A DTCG token tree is a recursive map of named groups and leaves.
 * Groups are plain objects; leaves carry `$value` + `$type`.
 */
export type DesignTokenTree = {
  [key: string]: DesignTokenTree | DesignTokenLeaf;
};

/**
 * A single DTCG file = one token set (e.g. `core.json`, `themes/light.json`).
 */
export interface DesignTokenSet {
  /** Token-set name (matches file basename without extension, e.g. "core") */
  name: string;
  /** Path relative to the tokens directory (e.g. "themes/light.json") */
  relativePath: string;
  /** Parsed DTCG tree */
  tokens: DesignTokenTree;
}

// ── Sync Operations ─────────────────────────────────────────────────────────

export interface PullOptions {
  /**
   * Optional theme/token-set filter. When omitted, all sets are pulled.
   * Provider-specific naming applies (e.g. Figma collection IDs).
   */
  themes?: string[];
  /**
   * If true, the provider should validate but NOT write to the local repo.
   * Used by CI to verify a remote state without producing diffs.
   */
  dryRun?: boolean;
  /** Tenant scoping for multi-workspace SaaS deployments */
  tenantId?: string;
}

export interface PushOptions {
  /** Restrict the push to specific token sets */
  themes?: string[];
  /**
   * If true, the provider should compute the diff but NOT call the remote API.
   * `figma.push({ dryRun: true })` is the default until the user opts in.
   */
  dryRun?: boolean;
  /** Tenant scoping */
  tenantId?: string;
}

export interface PullResult {
  /** Token sets that were retrieved */
  sets: DesignTokenSet[];
  /** Whether the local repo was modified */
  written: boolean;
  /** Provider that produced the result */
  provider: DesignSyncProviderType;
  /** ISO-8601 timestamp */
  pulledAt: string;
  /** Human-readable summary line for CLI output */
  summary: string;
}

export interface PushResult {
  /** Whether the remote design tool was modified */
  pushed: boolean;
  /** Token sets that were sent (or would have been sent in a dry-run) */
  sets: string[];
  /** Provider name */
  provider: DesignSyncProviderType;
  /** ISO-8601 timestamp */
  pushedAt: string;
  /** Human-readable summary */
  summary: string;
  /** True when the provider intentionally skipped the call (no creds, dry-run) */
  dryRun: boolean;
}

export interface HealthStatus {
  /** Is the provider configured + reachable? */
  ok: boolean;
  /** Provider name */
  provider: DesignSyncProviderType;
  /** Free-form diagnostic */
  message: string;
  /** Detected env var names that are present (not their values) */
  detectedEnv: string[];
  /** Detected env var names that are missing */
  missingEnv: string[];
}

// ── Provider Interface ──────────────────────────────────────────────────────

/**
 * Every design-sync backend implements this interface.
 * The factory (`createDesignSync`) returns a `DesignSyncProvider`.
 */
export interface DesignSyncProvider {
  readonly name: DesignSyncProviderType;

  /**
   * Pull: design-tool → repo (DTCG JSON).
   * For `git-only` this is a no-op read of local files.
   */
  pull(options?: PullOptions): Promise<PullResult>;

  /**
   * Push: repo (DTCG JSON) → design-tool.
   * For `git-only` this is a no-op write/format of local files.
   * Real providers default to dry-run unless explicit credentials exist.
   */
  push(options?: PushOptions): Promise<PushResult>;

  /**
   * Confirm the provider has the env vars / file access it needs.
   */
  healthcheck(): Promise<HealthStatus>;
}

// ── Provider Configs ────────────────────────────────────────────────────────

/**
 * Shared options every provider accepts. The tokens directory is the
 * filesystem source of truth (DTCG JSON), independent of which design tool
 * we sync with.
 */
export interface BaseProviderConfig {
  /**
   * Absolute path to the DTCG tokens directory.
   * Defaults to `<cwd>/packages/design/design-tokens/tokens`.
   */
  tokensDir?: string;
  /**
   * Absolute path to the `.tokens-studio` metadata directory (if used).
   * Defaults to `<cwd>/.tokens-studio`.
   */
  tokensStudioDir?: string;
}

export interface FigmaProviderConfig extends BaseProviderConfig {
  provider: "figma";
  /** Figma personal access token. Defaults to `process.env.FIGMA_PERSONAL_ACCESS_TOKEN`. */
  personalAccessToken?: string;
  /** Figma file ID (the `:file_key` segment in the URL). */
  fileId?: string;
  /** GitHub repo (owner/name) used by the Tokens Studio plugin sync. */
  githubRepo?: string;
  /** GitHub branch the plugin pushes to. Defaults to `main`. */
  githubBranch?: string;
}

export interface PenpotProviderConfig extends BaseProviderConfig {
  provider: "penpot";
  /** Penpot API URL — public cloud or self-hosted. */
  apiUrl?: string;
  /** Penpot personal access token. */
  token?: string;
  /** Penpot file ID. */
  fileId?: string;
  /** Penpot team / workspace ID. */
  teamId?: string;
}

export interface GitOnlyProviderConfig extends BaseProviderConfig {
  provider: "git-only";
}

export interface MemoryProviderConfig extends BaseProviderConfig {
  provider: "memory";
  /** Optional initial in-memory token sets (used in tests). */
  initialSets?: DesignTokenSet[];
}

export type DesignSyncConfig =
  | FigmaProviderConfig
  | PenpotProviderConfig
  | GitOnlyProviderConfig
  | MemoryProviderConfig;
