import { describe, expect, it } from "vitest";
import {
  advanceState,
  type DeploymentCommitRef,
  type DeploymentRecord,
  deriveLatestStatus,
  deriveTimelineFromCommits,
  domainForCommit,
  getDeploymentStatus,
  getDeploymentTimeline,
} from "./deployment-status.js";

const SUFFIX = ".preview.example.test";

describe("domainForCommit", () => {
  it("is deterministic for the same input", () => {
    expect(domainForCommit("abc1234", SUFFIX)).toBe(domainForCommit("abc1234", SUFFIX));
  });

  it("uses the injected suffix and never a hardcoded host", () => {
    const d = domainForCommit("deadbeef", SUFFIX);
    expect(d.endsWith(SUFFIX)).toBe(true);
    const other = domainForCommit("deadbeef", ".other.zone");
    expect(other.endsWith(".other.zone")).toBe(true);
    expect(d).not.toBe(other);
  });

  it("differs per commit sha", () => {
    expect(domainForCommit("aaa", SUFFIX)).not.toBe(domainForCommit("bbb", SUFFIX));
  });
});

describe("deriveLatestStatus", () => {
  it("uses the matching deployment record state when present", () => {
    const s = deriveLatestStatus({
      latestCommitSha: "c1",
      deployments: [{ commitSha: "c1", deploymentId: "d1", state: "live" }],
      isAgentRunning: false,
    });
    expect(s.state).toBe("live");
    expect(s.commitSha).toBe("c1");
    expect(s.deploymentId).toBe("d1");
  });

  it("returns deploying when no record matches and agent is running", () => {
    const s = deriveLatestStatus({
      latestCommitSha: "c2",
      deployments: [{ commitSha: "other", deploymentId: "d", state: "live" }],
      isAgentRunning: true,
    });
    expect(s.state).toBe("deploying");
  });

  it("returns idle when no record matches and agent not running", () => {
    const s = deriveLatestStatus({
      latestCommitSha: "c3",
      deployments: [],
      isAgentRunning: false,
    });
    expect(s.state).toBe("idle");
  });

  it("is live only when an explicit matching record is live", () => {
    const s = deriveLatestStatus({
      latestCommitSha: "c4",
      deployments: [{ commitSha: "c4", deploymentId: "d4", state: "failed" }],
      isAgentRunning: true,
    });
    expect(s.state).toBe("failed");
  });

  it("never throws on empty input", () => {
    expect(() =>
      deriveLatestStatus({ latestCommitSha: "", deployments: [], isAgentRunning: false }),
    ).not.toThrow();
  });
});

describe("deriveTimelineFromCommits", () => {
  const commits: DeploymentCommitRef[] = [
    { sha: "head", message: "head msg", date: "2026-05-17" },
    { sha: "mid", message: "mid msg", date: "2026-05-16" },
    { sha: "old", message: "old msg", date: "2026-05-15" },
  ];

  it("produces one entry per commit preserving input order", () => {
    const t = deriveTimelineFromCommits(commits, [], {
      domainSuffix: SUFFIX,
      isAgentRunning: false,
      latestCommitSha: "head",
    });
    expect(t.map((e) => e.commitSha)).toEqual(["head", "mid", "old"]);
  });

  it("head gets deploying when agent running and no terminal record", () => {
    const t = deriveTimelineFromCommits(commits, [], {
      domainSuffix: SUFFIX,
      isAgentRunning: true,
      latestCommitSha: "head",
    });
    expect(t[0]?.state).toBe("deploying");
    expect(t[1]?.state).toBe("idle");
    expect(t[2]?.state).toBe("idle");
  });

  it("matching deployment record wins over agent-running default", () => {
    const t = deriveTimelineFromCommits(
      commits,
      [{ commitSha: "head", deploymentId: "d", state: "failed" }],
      {
        domainSuffix: SUFFIX,
        isAgentRunning: true,
        latestCommitSha: "head",
      },
    );
    expect(t[0]?.state).toBe("failed");
  });

  it("url only present for live/deploying entries", () => {
    const t = deriveTimelineFromCommits(
      commits,
      [{ commitSha: "mid", deploymentId: "d", state: "live" }],
      {
        domainSuffix: SUFFIX,
        isAgentRunning: true,
        latestCommitSha: "head",
      },
    );
    expect(t[0]?.url).toBe(domainForCommit("head", SUFFIX)); // deploying
    expect(t[1]?.url).toBe(domainForCommit("mid", SUFFIX)); // live
    expect(t[2]?.url).toBeUndefined(); // idle
  });

  it("does not mutate inputs", () => {
    const cs = structuredClone(commits);
    const ds: DeploymentRecord[] = [{ commitSha: "head", deploymentId: "d", state: "live" }];
    const dsClone = structuredClone(ds);
    deriveTimelineFromCommits(cs, ds, {
      domainSuffix: SUFFIX,
      isAgentRunning: true,
      latestCommitSha: "head",
    });
    expect(cs).toEqual(commits);
    expect(ds).toEqual(dsClone);
  });
});

describe("advanceState", () => {
  it("allows legal transitions", () => {
    expect(advanceState("idle", "start")).toBe("deploying");
    expect(advanceState("deploying", "succeed")).toBe("live");
    expect(advanceState("deploying", "fail")).toBe("failed");
  });

  it("reset always returns idle", () => {
    expect(advanceState("live", "reset")).toBe("idle");
    expect(advanceState("failed", "reset")).toBe("idle");
    expect(advanceState("idle", "reset")).toBe("idle");
  });

  it("throws on illegal transitions", () => {
    expect(() => advanceState("idle", "succeed")).toThrow();
    expect(() => advanceState("live", "start")).toThrow();
  });
});

describe("tenant-scoped entries", () => {
  it("fails closed on empty tenantId", () => {
    expect(() =>
      getDeploymentStatus("", {
        latestCommitSha: "c1",
        deployments: [],
        isAgentRunning: false,
      }),
    ).toThrow();
    expect(() =>
      getDeploymentTimeline("", [], [], {
        domainSuffix: SUFFIX,
        isAgentRunning: false,
        latestCommitSha: "c1",
      }),
    ).toThrow();
  });

  it("returns status for a valid tenant", () => {
    const s = getDeploymentStatus("tenant_1", {
      latestCommitSha: "c1",
      deployments: [{ commitSha: "c1", deploymentId: "d1", state: "live" }],
      isAgentRunning: false,
    });
    expect(s.state).toBe("live");
  });

  it("returns timeline for a valid tenant", () => {
    const t = getDeploymentTimeline(
      "tenant_1",
      [{ sha: "head", message: "m", date: "2026-05-17" }],
      [],
      { domainSuffix: SUFFIX, isAgentRunning: true, latestCommitSha: "head" },
    );
    expect(t).toHaveLength(1);
    expect(t[0]?.state).toBe("deploying");
  });

  it("rejects malformed input via zod", () => {
    expect(() =>
      getDeploymentStatus("tenant_1", {
        // @ts-expect-error invalid state
        deployments: [{ commitSha: "c1", deploymentId: "d1", state: "bogus" }],
        latestCommitSha: "c1",
        isAgentRunning: false,
      }),
    ).toThrow();
  });
});
