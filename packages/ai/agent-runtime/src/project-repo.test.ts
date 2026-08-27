import { beforeEach, describe, expect, it } from "vitest";
import {
  appendJsonlLine,
  CONVERSATIONS_DIR,
  type CommitRef,
  emptyProjectMetadata,
  type GitHostPort,
  METADATA_PATH,
  type OwnsRepoPredicate,
  ProjectRepo,
  ProjectRepoError,
  parseJsonl,
} from "./project-repo.js";

/**
 * Fake git host: content-addressed by branch HEAD plus per-sha snapshots.
 * Faithfully models "every project is a git repo": writeCommit appends a
 * commit to the branch and freezes a full file snapshot under its sha.
 */
class FakeGitHost implements GitHostPort {
  defaultBranch = "main";
  // repoId -> branch -> ordered commit shas
  private branches = new Map<string, Map<string, string[]>>();
  // repoId -> sha -> full file snapshot
  private snapshots = new Map<string, Map<string, Record<string, string>>>();
  private commitMeta = new Map<string, CommitRef>();
  public writeCount = 0;
  private seq = 0;

  async getDefaultBranch(): Promise<string> {
    return this.defaultBranch;
  }

  private head(repoId: string, branch: string): string | null {
    const shas = this.branches.get(repoId)?.get(branch);
    if (!shas || shas.length === 0) return null;
    return shas[shas.length - 1] ?? null;
  }

  async readFile(repoId: string, path: string, ref?: string | undefined): Promise<string | null> {
    const sha = ref ?? this.head(repoId, this.defaultBranch);
    if (!sha) return null;
    const snap = this.snapshots.get(repoId)?.get(sha);
    if (!snap) return null;
    return snap[path] ?? null;
  }

  async writeCommit(
    repoId: string,
    branch: string,
    files: Record<string, string>,
    message: string,
  ): Promise<CommitRef> {
    this.writeCount += 1;
    const prevSha = this.head(repoId, branch);
    const prevSnap = (prevSha ? this.snapshots.get(repoId)?.get(prevSha) : undefined) ?? {};
    const nextSnap = { ...prevSnap, ...files };
    this.seq += 1;
    const sha = `sha-${this.seq}`;
    if (!this.snapshots.has(repoId)) this.snapshots.set(repoId, new Map());
    this.snapshots.get(repoId)!.set(sha, nextSnap);
    if (!this.branches.has(repoId)) this.branches.set(repoId, new Map());
    const bmap = this.branches.get(repoId)!;
    if (!bmap.has(branch)) bmap.set(branch, []);
    bmap.get(branch)!.push(sha);
    const ref: CommitRef = {
      sha,
      message,
      date: new Date(2026, 0, this.seq).toISOString(),
    };
    this.commitMeta.set(sha, ref);
    return ref;
  }

  async listCommits(
    repoId: string,
    branch: string,
    limit?: number | undefined,
  ): Promise<CommitRef[]> {
    const shas = this.branches.get(repoId)?.get(branch) ?? [];
    const refs = [...shas]
      .reverse()
      .map((s) => this.commitMeta.get(s))
      .filter((r): r is CommitRef => Boolean(r));
    return typeof limit === "number" ? refs.slice(0, limit) : refs;
  }
}

const T = "tenant-1";
const REPO = "tenant-1/proj-a";
const ownsAll: OwnsRepoPredicate = () => true;

function makeRepo(host: FakeGitHost, owns: OwnsRepoPredicate = ownsAll): ProjectRepo {
  return new ProjectRepo({ host, ownsRepo: owns });
}

describe("pure helpers", () => {
  it("parseJsonl tolerates blank and trailing newline", () => {
    expect(parseJsonl("")).toEqual([]);
    expect(parseJsonl("\n\n")).toEqual([]);
    expect(parseJsonl('{"a":1}\n{"b":2}\n')).toEqual([{ a: 1 }, { b: 2 }]);
    expect(parseJsonl('{"a":1}')).toEqual([{ a: 1 }]);
  });

  it("appendJsonlLine is immutable and appends a single line", () => {
    const prev = '{"a":1}\n';
    const next = appendJsonlLine(prev, { b: 2 });
    expect(next).toBe('{"a":1}\n{"b":2}\n');
    expect(prev).toBe('{"a":1}\n');
    expect(appendJsonlLine("", { x: 1 })).toBe('{"x":1}\n');
    expect(appendJsonlLine('{"a":1}', { b: 2 })).toBe('{"a":1}\n{"b":2}\n');
  });

  it("emptyProjectMetadata is well-formed", () => {
    const m = emptyProjectMetadata("proj-a", "Proj A");
    expect(m.projectId).toBe("proj-a");
    expect(m.conversations).toEqual([]);
    expect(m.deployments).toEqual([]);
  });
});

describe("ProjectRepo metadata", () => {
  let host: FakeGitHost;
  let repo: ProjectRepo;
  beforeEach(() => {
    host = new FakeGitHost();
    repo = makeRepo(host);
  });

  it("reads missing metadata as empty without throwing", async () => {
    const m = await repo.readMetadata(T, REPO);
    expect(m.conversations).toEqual([]);
    expect(m.deployments).toEqual([]);
  });

  it("throws typed error on malformed JSON metadata", async () => {
    await host.writeCommit(REPO, "main", { [METADATA_PATH]: "{not json" }, "x");
    await expect(repo.readMetadata(T, REPO)).rejects.toBeInstanceOf(ProjectRepoError);
  });

  it("write -> read round-trips", async () => {
    const meta = emptyProjectMetadata("proj-a", "Proj A");
    const input = { ...meta, productionDomain: "proj-a.example.com" };
    const ref = await repo.writeMetadata(T, REPO, input);
    expect(ref.sha).toBeTruthy();
    const back = await repo.readMetadata(T, REPO);
    expect(back.productionDomain).toBe("proj-a.example.com");
    // input not mutated
    expect(input.conversations).toEqual([]);
  });
});

describe("ProjectRepo conversations", () => {
  let host: FakeGitHost;
  let repo: ProjectRepo;
  beforeEach(() => {
    host = new FakeGitHost();
    repo = makeRepo(host);
  });

  it("appends one commit per call and accumulates", async () => {
    await repo.appendConversationMessage(T, REPO, "c1", { role: "user", text: "hi" });
    expect(host.writeCount).toBe(1);
    await repo.appendConversationMessage(T, REPO, "c1", { role: "assistant", text: "yo" });
    expect(host.writeCount).toBe(2);
    const msgs = await repo.readConversationMessages(T, REPO, "c1");
    expect(msgs).toEqual([
      { role: "user", text: "hi" },
      { role: "assistant", text: "yo" },
    ]);
  });

  it("readConversationMessages tolerates blank / missing file", async () => {
    expect(await repo.readConversationMessages(T, REPO, "none")).toEqual([]);
    await host.writeCommit(REPO, "main", { [`${CONVERSATIONS_DIR}/c2.jsonl`]: "\n\n" }, "blank");
    expect(await repo.readConversationMessages(T, REPO, "c2")).toEqual([]);
  });
});

describe("ProjectRepo history & restore", () => {
  let host: FakeGitHost;
  let repo: ProjectRepo;
  beforeEach(() => {
    host = new FakeGitHost();
    repo = makeRepo(host);
  });

  it("restoreAt reads metadata at a specific sha", async () => {
    const r1 = await repo.writeMetadata(T, REPO, {
      ...emptyProjectMetadata("proj-a", "v1"),
    });
    await repo.writeMetadata(T, REPO, {
      ...emptyProjectMetadata("proj-a", "v2"),
    });
    const restored = await repo.restoreAt(T, REPO, r1.sha);
    expect(restored.metadata.name).toBe("v1");
    const head = await repo.readMetadata(T, REPO);
    expect(head.name).toBe("v2");
  });

  it("historyFromCommits delegates to the port", async () => {
    await repo.writeMetadata(T, REPO, emptyProjectMetadata("proj-a", "v1"));
    await repo.writeMetadata(T, REPO, emptyProjectMetadata("proj-a", "v2"));
    const hist = await repo.historyFromCommits(T, REPO, 1);
    expect(hist).toHaveLength(1);
  });
});

describe("multi-tenant fail-closed", () => {
  let host: FakeGitHost;
  beforeEach(() => {
    host = new FakeGitHost();
  });

  it("empty tenant throws", async () => {
    const repo = makeRepo(host);
    await expect(repo.readMetadata("", REPO)).rejects.toBeInstanceOf(ProjectRepoError);
    await expect(repo.readMetadata("   ", REPO)).rejects.toBeInstanceOf(ProjectRepoError);
  });

  it("denies cross-tenant repo access (ownsRepo default-deny)", async () => {
    const repo = makeRepo(host, (tenant, repoId) => repoId.startsWith(`${tenant}/`));
    await expect(repo.readMetadata("tenant-2", "tenant-1/proj-a")).rejects.toBeInstanceOf(
      ProjectRepoError,
    );
  });

  it("default ownsRepo is deny when not provided", async () => {
    const repo = new ProjectRepo({ host });
    await expect(repo.readMetadata(T, REPO)).rejects.toBeInstanceOf(ProjectRepoError);
  });
});
