import { z } from "zod";

/**
 * Git-backed project repository model.
 *
 * Faithful re-expression of the "every project is a git repo" persistence
 * model: a project's metadata and conversation logs live AS committed files
 * inside its repository. The commit graph IS the history — there is no
 * in-memory snapshot ring (that is `workbench.ts`'s concern). The actual
 * provider-specific git implementation is injected via `GitHostPort`; this
 * module never performs git operations itself.
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type DeploymentState = "idle" | "deploying" | "live" | "failed";

export interface DeploymentSummary {
  commitSha: string;
  commitMessage: string;
  commitDate: string;
  domain: string;
  url: string;
  deploymentId: string | null;
  state: DeploymentState;
}

export interface ProjectMetadata {
  projectId: string;
  name: string;
  conversations: ConversationSummary[];
  deployments: DeploymentSummary[];
  productionDomain?: string | undefined;
  productionDeploymentId?: string | undefined;
}

export interface CommitRef {
  sha: string;
  message: string;
  date: string;
}

// ---------------------------------------------------------------------------
// Injected git-host port (provider-specific git impl is NOT ported here)
// ---------------------------------------------------------------------------

export interface GitHostPort {
  getDefaultBranch(repoId: string): Promise<string>;
  readFile(repoId: string, path: string, ref?: string | undefined): Promise<string | null>;
  writeCommit(
    repoId: string,
    branch: string,
    files: Record<string, string>,
    message: string,
  ): Promise<CommitRef>;
  listCommits(repoId: string, branch: string, limit?: number | undefined): Promise<CommitRef[]>;
}

/** Default-deny ownership predicate: cross-tenant access impossible unless wired. */
export type OwnsRepoPredicate = (tenantId: string, repoId: string) => boolean | Promise<boolean>;

export interface ProjectRepoDeps {
  host: GitHostPort;
  ownsRepo?: OwnsRepoPredicate | undefined;
}

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export type ProjectRepoErrorCode = "tenant_required" | "tenant_denied" | "metadata_malformed";

export class ProjectRepoError extends Error {
  public readonly code: ProjectRepoErrorCode;
  constructor(code: ProjectRepoErrorCode, message: string) {
    super(message);
    this.name = "ProjectRepoError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const METADATA_PATH = "metadata.json";
export const CONVERSATIONS_DIR = "conversations";

const conversationPath = (conversationId: string): string =>
  `${CONVERSATIONS_DIR}/${conversationId}.jsonl`;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Parse JSONL content; tolerant of blank lines and trailing newline. */
export function parseJsonl(content: string): unknown[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}

/** Append one JSON line to existing JSONL content (immutable; never mutates input). */
export function appendJsonlLine(prev: string, value: unknown): string {
  const base = prev.length > 0 && !prev.endsWith("\n") ? `${prev}\n` : prev;
  return `${base}${JSON.stringify(value)}\n`;
}

/** Well-formed empty metadata — used when a project repo has no metadata yet. */
export function emptyProjectMetadata(projectId: string, name: string): ProjectMetadata {
  return {
    projectId,
    name,
    conversations: [],
    deployments: [],
  };
}

// ---------------------------------------------------------------------------
// Zod schema (boundary validation)
// ---------------------------------------------------------------------------

const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const deploymentSummarySchema = z.object({
  commitSha: z.string(),
  commitMessage: z.string(),
  commitDate: z.string(),
  domain: z.string(),
  url: z.string(),
  deploymentId: z.string().nullable(),
  state: z.enum(["idle", "deploying", "live", "failed"]),
});

const projectMetadataSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  conversations: z.array(conversationSummarySchema),
  deployments: z.array(deploymentSummarySchema),
  productionDomain: z.string().optional(),
  productionDeploymentId: z.string().optional(),
});

function normalizeMetadata(meta: ProjectMetadata): ProjectMetadata {
  const parsed = projectMetadataSchema.parse(meta);
  const out: ProjectMetadata = {
    projectId: parsed.projectId,
    name: parsed.name,
    conversations: parsed.conversations,
    deployments: parsed.deployments,
  };
  if (parsed.productionDomain !== undefined) {
    out.productionDomain = parsed.productionDomain;
  }
  if (parsed.productionDeploymentId !== undefined) {
    out.productionDeploymentId = parsed.productionDeploymentId;
  }
  return out;
}

// ---------------------------------------------------------------------------
// ProjectRepo
// ---------------------------------------------------------------------------

export class ProjectRepo {
  private readonly host: GitHostPort;
  private readonly ownsRepo: OwnsRepoPredicate;

  constructor(deps: ProjectRepoDeps) {
    this.host = deps.host;
    // Default-deny: if no ownership predicate is wired, all access is denied.
    this.ownsRepo = deps.ownsRepo ?? (() => false);
  }

  private async authorize(tenantId: string, repoId: string): Promise<void> {
    if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
      throw new ProjectRepoError("tenant_required", "tenantId is required");
    }
    const owns = await this.ownsRepo(tenantId, repoId);
    if (!owns) {
      throw new ProjectRepoError(
        "tenant_denied",
        `tenant ${tenantId} may not access repo ${repoId}`,
      );
    }
  }

  private async defaultBranch(repoId: string): Promise<string> {
    return this.host.getDefaultBranch(repoId);
  }

  async readMetadata(tenantId: string, repoId: string): Promise<ProjectMetadata> {
    await this.authorize(tenantId, repoId);
    const raw = await this.host.readFile(repoId, METADATA_PATH);
    if (raw === null) {
      return emptyProjectMetadata("", "");
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new ProjectRepoError("metadata_malformed", `${METADATA_PATH} is not valid JSON`);
    }
    const result = projectMetadataSchema.safeParse(parsedJson);
    if (!result.success) {
      throw new ProjectRepoError(
        "metadata_malformed",
        `${METADATA_PATH} does not match the project metadata schema`,
      );
    }
    return normalizeMetadata(result.data);
  }

  async writeMetadata(tenantId: string, repoId: string, meta: ProjectMetadata): Promise<CommitRef> {
    await this.authorize(tenantId, repoId);
    const normalized = normalizeMetadata(meta);
    const branch = await this.defaultBranch(repoId);
    return this.host.writeCommit(
      repoId,
      branch,
      { [METADATA_PATH]: `${JSON.stringify(normalized, null, 2)}\n` },
      "chore: update project metadata",
    );
  }

  async appendConversationMessage(
    tenantId: string,
    repoId: string,
    conversationId: string,
    message: unknown,
  ): Promise<CommitRef> {
    await this.authorize(tenantId, repoId);
    const path = conversationPath(conversationId);
    const existing = (await this.host.readFile(repoId, path)) ?? "";
    const next = appendJsonlLine(existing, message);
    const branch = await this.defaultBranch(repoId);
    // One commit per call = one commit per turn.
    return this.host.writeCommit(
      repoId,
      branch,
      { [path]: next },
      `chore: append message to ${conversationId}`,
    );
  }

  async readConversationMessages(
    tenantId: string,
    repoId: string,
    conversationId: string,
  ): Promise<unknown[]> {
    await this.authorize(tenantId, repoId);
    const raw = await this.host.readFile(repoId, conversationPath(conversationId));
    if (raw === null) return [];
    return parseJsonl(raw);
  }

  async restoreAt(
    tenantId: string,
    repoId: string,
    sha: string,
  ): Promise<{ metadata: ProjectMetadata }> {
    await this.authorize(tenantId, repoId);
    const raw = await this.host.readFile(repoId, METADATA_PATH, sha);
    if (raw === null) {
      return { metadata: emptyProjectMetadata("", "") };
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new ProjectRepoError(
        "metadata_malformed",
        `${METADATA_PATH} at ${sha} is not valid JSON`,
      );
    }
    const result = projectMetadataSchema.safeParse(parsedJson);
    if (!result.success) {
      throw new ProjectRepoError(
        "metadata_malformed",
        `${METADATA_PATH} at ${sha} does not match the project metadata schema`,
      );
    }
    return { metadata: normalizeMetadata(result.data) };
  }

  async historyFromCommits(
    tenantId: string,
    repoId: string,
    limit?: number | undefined,
  ): Promise<CommitRef[]> {
    await this.authorize(tenantId, repoId);
    const branch = await this.defaultBranch(repoId);
    return this.host.listCommits(repoId, branch, limit);
  }
}
