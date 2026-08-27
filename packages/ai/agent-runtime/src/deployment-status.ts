import { z } from "zod";

/**
 * Deployment lifecycle status model.
 *
 * Commit-keyed deploy state plus a newest-first timeline derivation.
 * Pure, deterministic, immutable. Multi-tenant fail-closed at the
 * public boundary. The preview domain suffix is always injected —
 * there is no hardcoded host anywhere in this module.
 */

export type DeployState = "idle" | "deploying" | "live" | "failed";

export interface DeploymentUiStatus {
  state: DeployState;
  commitSha?: string | undefined;
  url?: string | undefined;
  deploymentId?: string | undefined;
}

export interface DeploymentTimelineEntry {
  commitSha: string;
  commitMessage: string;
  commitDate: string;
  state: DeployState;
  url?: string | undefined;
}

/** Structural commit reference — declared locally, no sibling imports. */
export interface DeploymentCommitRef {
  sha: string;
  message: string;
  date: string;
}

export interface DeploymentRecord {
  commitSha: string;
  deploymentId: string | null;
  state: DeployState;
}

export class DeploymentStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentStateError";
  }
}

const deployStateSchema = z.enum(["idle", "deploying", "live", "failed"]);

const deploymentRecordSchema = z.object({
  commitSha: z.string(),
  deploymentId: z.string().nullable(),
  state: deployStateSchema,
});

const commitRefSchema = z.object({
  sha: z.string(),
  message: z.string(),
  date: z.string(),
});

const latestStatusInputSchema = z.object({
  latestCommitSha: z.string(),
  deployments: z.array(deploymentRecordSchema),
  isAgentRunning: z.boolean(),
});

const timelineOptsSchema = z.object({
  domainSuffix: z.string().min(1),
  isAgentRunning: z.boolean(),
  latestCommitSha: z.string(),
});

export type LatestStatusInput = z.infer<typeof latestStatusInputSchema>;
export type TimelineOpts = z.infer<typeof timelineOptsSchema>;

/** Stable, non-cryptographic hash → short deterministic slug. */
function slugForSha(commitSha: string): string {
  let hash = 2166136261;
  for (let i = 0; i < commitSha.length; i += 1) {
    hash ^= commitSha.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Deterministic per-commit preview domain built from an injected suffix.
 * No hardcoded host — the suffix fully determines the zone.
 */
export function domainForCommit(commitSha: string, domainSuffix: string): string {
  return `${slugForSha(commitSha)}${domainSuffix}`;
}

function findRecord(
  deployments: readonly DeploymentRecord[],
  commitSha: string,
): DeploymentRecord | undefined {
  return deployments.find((d) => d.commitSha === commitSha);
}

/**
 * Faithful rule: matching record state wins; else deploying when the
 * agent is running; else idle. `live` only when a matching record is
 * explicitly live. Never throws.
 */
export function deriveLatestStatus(input: {
  latestCommitSha: string;
  deployments: readonly DeploymentRecord[];
  isAgentRunning: boolean;
}): DeploymentUiStatus {
  const { latestCommitSha, deployments, isAgentRunning } = input;
  const record = findRecord(deployments, latestCommitSha);

  if (record) {
    return {
      state: record.state,
      commitSha: latestCommitSha,
      deploymentId: record.deploymentId ?? undefined,
    };
  }

  if (isAgentRunning) {
    return { state: "deploying", commitSha: latestCommitSha };
  }

  return { state: "idle", commitSha: latestCommitSha };
}

/**
 * One entry per commit, newest-first order preserved from input.
 * Matching deployment record wins; the head commit gets `deploying`
 * when the agent is running and has no terminal record; older
 * unmatched commits resolve to `idle`. Immutable, deterministic.
 */
export function deriveTimelineFromCommits(
  commits: readonly DeploymentCommitRef[],
  deployments: readonly DeploymentRecord[],
  opts: TimelineOpts,
): DeploymentTimelineEntry[] {
  const { domainSuffix, isAgentRunning, latestCommitSha } = opts;

  return commits.map((commit) => {
    const record = findRecord(deployments, commit.sha);
    let state: DeployState;

    if (record) {
      state = record.state;
    } else if (commit.sha === latestCommitSha && isAgentRunning) {
      state = "deploying";
    } else {
      state = "idle";
    }

    const entry: DeploymentTimelineEntry = {
      commitSha: commit.sha,
      commitMessage: commit.message,
      commitDate: commit.date,
      state,
    };

    if (state === "live" || state === "deploying") {
      return { ...entry, url: domainForCommit(commit.sha, domainSuffix) };
    }
    return entry;
  });
}

type TransitionEvent = "start" | "succeed" | "fail";

const LEGAL_TRANSITIONS: Record<TransitionEvent, Partial<Record<DeployState, DeployState>>> = {
  start: { idle: "deploying", failed: "deploying" },
  succeed: { deploying: "live" },
  fail: { deploying: "failed" },
};

/**
 * Explicit deploy state machine. Illegal transitions throw a typed
 * error. `reset` always returns to idle regardless of current state.
 */
export function advanceState(
  current: DeployState,
  event: "start" | "succeed" | "fail" | "reset",
): DeployState {
  if (event === "reset") {
    return "idle";
  }

  const next = LEGAL_TRANSITIONS[event][current];
  if (next === undefined) {
    throw new DeploymentStateError(
      `Illegal deploy transition: cannot '${event}' from '${current}'`,
    );
  }
  return next;
}

function assertTenant(tenantId: string): void {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new DeploymentStateError("tenantId is required (fail-closed)");
  }
}

/** Public tenant-scoped status entry — fail-closed, zod-validated. */
export function getDeploymentStatus(
  tenantId: string,
  input: LatestStatusInput,
): DeploymentUiStatus {
  assertTenant(tenantId);
  const parsed = latestStatusInputSchema.parse(input);
  return deriveLatestStatus(parsed);
}

/** Public tenant-scoped timeline entry — fail-closed, zod-validated. */
export function getDeploymentTimeline(
  tenantId: string,
  commits: readonly DeploymentCommitRef[],
  deployments: readonly DeploymentRecord[],
  opts: TimelineOpts,
): DeploymentTimelineEntry[] {
  assertTenant(tenantId);
  const parsedCommits = z.array(commitRefSchema).parse(commits);
  const parsedDeployments = z.array(deploymentRecordSchema).parse(deployments);
  const parsedOpts = timelineOptsSchema.parse(opts);
  return deriveTimelineFromCommits(parsedCommits, parsedDeployments, parsedOpts);
}
