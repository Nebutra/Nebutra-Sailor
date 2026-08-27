import type { JobPayload, JobStatusInfo, QueueProvider } from "@nebutra/queue";
import type { PresignedUpload, UploadProvider, UploadTarget } from "@nebutra/uploads";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
    organizationMember: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
    organizationInvitation: { findMany: vi.fn() },
    uploadRecord: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedFindUnique = vi.mocked(db.user.findUnique);
const mockedMembers = vi.mocked(db.organizationMember.findMany);
const mockedAudit = vi.mocked(db.auditLog.findMany);
const mockedInvitations = vi.mocked(db.organizationInvitation.findMany);
const mockedCreate = vi.mocked(db.uploadRecord.create);
const mockedUpdate = vi.mocked(db.uploadRecord.update);
const mockedFindFirst = vi.mocked(db.uploadRecord.findFirst);
const mockedRecordFindUnique = vi.mocked(db.uploadRecord.findUnique);

// ── Durable-store double ────────────────────────────────────────────────────
// A row map standing in for the `uploads` table, so the route exercises the
// same read/write path it uses against Prisma.

interface UploadRow {
  id: string;
  tenantId: string;
  userId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  bucket: string;
  objectKey: string;
  sizeBytes: bigint;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

let rows: Map<string, UploadRow>;

function wireUploadRecordMocks() {
  mockedCreate.mockImplementation((async (args: { data: UploadRow }) => {
    const row = { ...args.data, createdAt: new Date() };
    rows.set(row.id, row);
    return row;
  }) as never);

  mockedUpdate.mockImplementation((async (args: {
    where: { id: string };
    data: Partial<UploadRow>;
  }) => {
    const existing = rows.get(args.where.id);
    if (!existing) throw new Error("Record not found");
    // Prisma writes a Json column wholesale — the double must replace, not
    // merge, or it would hide callers that drop sibling metadata keys.
    const next = { ...existing, ...args.data } as UploadRow;
    rows.set(next.id, next);
    return next;
  }) as never);

  mockedRecordFindUnique.mockImplementation((async (args: { where: { id: string } }) => {
    return rows.get(args.where.id) ?? null;
  }) as never);

  mockedFindFirst.mockImplementation((async (args: {
    where: { id: string; userId: string; bucket: string };
  }) => {
    const row = rows.get(args.where.id);
    if (!row) return null;
    if (row.userId !== args.where.userId || row.bucket !== args.where.bucket) return null;
    return row;
  }) as never);
}

// ── Queue double ────────────────────────────────────────────────────────────

class FakeQueue implements QueueProvider {
  readonly name = "memory" as const;
  readonly enqueued: JobPayload[] = [];
  private handlers = new Map<string, (job: JobPayload) => Promise<void>>();
  private statuses = new Map<string, JobStatusInfo>();

  /** When false, jobs stay queued until `drain()` is called. */
  constructor(private readonly autoRun = false) {}

  async enqueue(job: JobPayload) {
    this.enqueued.push(job);
    this.statuses.set(job.id, {
      id: job.id,
      queue: job.queue,
      status: "pending",
      attempts: 0,
      maxRetries: job.options?.maxRetries ?? 3,
      createdAt: job.createdAt,
    });
    if (this.autoRun) await this.drain();
    return { jobId: job.id, accepted: true, provider: "memory" as const };
  }

  async enqueueBatch(jobs: JobPayload[]) {
    const results = [];
    for (const job of jobs) results.push(await this.enqueue(job));
    return results;
  }

  registerHandler<T extends Record<string, unknown>>(
    queue: string,
    type: string,
    handler: (job: JobPayload & { data: T }) => Promise<void>,
  ) {
    this.handlers.set(`${queue}:${type}`, handler as (job: JobPayload) => Promise<void>);
  }

  async drain() {
    for (const job of this.enqueued.splice(0)) {
      const handler = this.handlers.get(`${job.queue}:${job.type}`);
      if (!handler) continue;
      try {
        await handler(job);
        this.statuses.set(job.id, {
          ...(this.statuses.get(job.id) as JobStatusInfo),
          status: "completed",
          attempts: 1,
        });
      } catch (error) {
        this.statuses.set(job.id, {
          ...(this.statuses.get(job.id) as JobStatusInfo),
          status: "dead-lettered",
          attempts: 1,
          failedReason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async getJobStatus(jobId: string) {
    return this.statuses.get(jobId);
  }

  async close() {
    this.handlers.clear();
  }
}

// ── Uploads double ──────────────────────────────────────────────────────────

class FakeUploads implements UploadProvider {
  readonly objects = new Map<string, string>();
  private pendingKeys = new Map<string, string>();

  constructor(private readonly acceptPut = true) {}

  async createPresignedUpload(target: UploadTarget): Promise<PresignedUpload> {
    const token = `tok_${this.pendingKeys.size}`;
    this.pendingKeys.set(token, `${target.bucket}/${target.key}`);
    return {
      url: `https://storage.example/put/${token}`,
      method: "PUT",
      headers: { "x-amz-acl": target.acl ?? "private" },
      expiresAt: new Date(Date.now() + 3_600_000),
      uploadId: token,
    };
  }

  async createMultipartUpload(): Promise<never> {
    throw new Error("not used");
  }
  async completeMultipartUpload(): Promise<never> {
    throw new Error("not used");
  }
  async abortMultipartUpload(): Promise<void> {}
  async getTusEndpoint(): Promise<never> {
    throw new Error("not used");
  }
  async deleteFile(): Promise<void> {}

  async getDownloadUrl(bucket: string, key: string, expiresInSec?: number): Promise<string> {
    return `https://storage.example/signed/${bucket}/${key}?expires=${expiresInSec ?? 0}`;
  }

  async close(): Promise<void> {}

  fetchImpl: typeof fetch = async (input, init) => {
    const token = String(input).split("/").pop() ?? "";
    const target = this.pendingKeys.get(token);
    if (!target || !this.acceptPut) {
      return new Response("denied", { status: 403 });
    }
    this.objects.set(target, String(init?.body ?? ""));
    return new Response(null, { status: 200, headers: { etag: `"etag-${token}"` } });
  };
}

async function loadRoute() {
  return import("@/app/api/account/export/route");
}

async function loadService() {
  return import("@/app/api/account/export/_service");
}

async function injectRuntime(queue: QueueProvider, uploads: FakeUploads) {
  const { setExportRuntimeForTests } = await loadService();
  setExportRuntimeForTests({
    queue,
    uploads,
    fetchImpl: uploads.fetchImpl,
    uploadProviderName: "fake",
  });
}

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: {} as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

function defaultDbReturns() {
  mockedFindUnique.mockResolvedValue({
    id: "user_1",
    email: "alice@example.com",
    name: "Alice",
  } as never);
  mockedMembers.mockResolvedValue([] as never);
  mockedAudit.mockResolvedValue([] as never);
  mockedInvitations.mockResolvedValue([] as never);
}

describe("/api/account/export", () => {
  beforeEach(async () => {
    vi.resetModules();
    rows = new Map();
    mockedGetAuth.mockReset();
    mockedFindUnique.mockReset();
    mockedMembers.mockReset();
    mockedAudit.mockReset();
    mockedInvitations.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedFindFirst.mockReset();
    mockedRecordFindUnique.mockReset();
    wireUploadRecordMocks();
    const { __resetExportRuntimeForTests } = await loadService();
    __resetExportRuntimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when there is no session (POST)", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 202 with an exportId and enqueues a build job", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const queue = new FakeQueue();
    const uploads = new FakeUploads();
    await injectRuntime(queue, uploads);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    expect(response.status).toBe(202);
    const body = (await response.json()) as {
      exportId: string;
      status: string;
      jobId: string;
      queueProvider: string;
      estimatedReadyAt: string;
    };
    expect(body.exportId).toMatch(/[0-9a-f-]{36}/);
    expect(body.status).toBe("pending");
    expect(typeof body.estimatedReadyAt).toBe("string");
    expect(body.queueProvider).toBe("memory");
    expect(queue.enqueued).toHaveLength(1);
    expect(queue.enqueued[0]?.queue).toBe("account-export");
    // Nothing is written to storage on the request path.
    expect(uploads.objects.size).toBe(0);
  });

  it("GET reports pending while the job has not run", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const queue = new FakeQueue();
    await injectRuntime(queue, new FakeUploads());

    const { POST, GET } = await loadRoute();
    const created = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    const { exportId } = (await created.json()) as { exportId: string };

    const response = await GET(
      new Request(`https://app.example/api/account/export?id=${exportId}`),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string; downloadUrl?: string };
    expect(body.status).toBe("pending");
    expect(body.downloadUrl).toBeUndefined();
  });

  it("GET returns 404 when the export does not belong to the caller", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const queue = new FakeQueue();
    await injectRuntime(queue, new FakeUploads());
    const { POST, GET } = await loadRoute();

    // Create an export as user_1
    const created = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    const { exportId } = (await created.json()) as { exportId: string };

    // Switch session to user_2 — the very same id must not resolve.
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: "user_2" }));
    const response = await GET(
      new Request(`https://app.example/api/account/export?id=${exportId}`),
    );
    expect(response.status).toBe(404);
  });

  it("GET returns a presigned download URL once the artifact is stored", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const queue = new FakeQueue();
    const uploads = new FakeUploads();
    await injectRuntime(queue, uploads);

    const { POST, GET } = await loadRoute();
    const created = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    const { exportId } = (await created.json()) as { exportId: string };

    await queue.drain();

    const response = await GET(
      new Request(`https://app.example/api/account/export?id=${exportId}`),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      sizeBytes: number;
      downloadUrl?: string;
      expiresAt?: string;
    };
    expect(body.status).toBe("ready");
    expect(body.sizeBytes).toBeGreaterThan(0);
    expect(body.downloadUrl).toContain(`account-exports/user_1/${exportId}.json`);
    expect(body.downloadUrl).toContain("expires=900");
    expect(new Date(body.expiresAt ?? "").getTime()).toBeGreaterThan(Date.now());

    // The artifact really landed in storage and carries the account payload.
    expect(uploads.objects.size).toBe(1);
    const [, artifact] = [...uploads.objects.entries()][0] ?? [];
    const parsed = JSON.parse(artifact ?? "{}") as {
      user: unknown;
      organizations: unknown[];
      auditEvents: unknown[];
    };
    expect(parsed.user).toBeTruthy();
    expect(Array.isArray(parsed.organizations)).toBe(true);
    expect(Array.isArray(parsed.auditEvents)).toBe(true);
  });

  it("GET reports failed when the storage write is rejected", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const queue = new FakeQueue();
    const uploads = new FakeUploads(false);
    await injectRuntime(queue, uploads);

    const { POST, GET } = await loadRoute();
    const created = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );
    const { exportId } = (await created.json()) as { exportId: string };

    await queue.drain();

    const response = await GET(
      new Request(`https://app.example/api/account/export?id=${exportId}`),
    );
    const body = (await response.json()) as { status: string; failedReason?: string };
    expect(body.status).toBe("failed");
    expect(body.failedReason).toContain("403");
    // Recording the failure must not wipe the rest of the metadata column.
    expect(rows.get(exportId)?.metadata).toMatchObject({
      kind: "account-export",
      jobId: expect.any(String),
    });
  });

  it("POST returns 501 when the store cannot issue a private, expiring URL", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    defaultDbReturns();
    const queue = new FakeQueue();
    const uploads = new FakeUploads();
    const { setExportRuntimeForTests } = await loadService();
    setExportRuntimeForTests({
      queue,
      uploads,
      fetchImpl: uploads.fetchImpl,
      uploadProviderName: "blob",
      supportsPrivateDownload: false,
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("https://app.example/api/account/export", { method: "POST" }),
    );

    expect(response.status).toBe(501);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("blob");
    // Nothing durable was created and nothing was enqueued.
    expect(rows.size).toBe(0);
    expect(queue.enqueued).toHaveLength(0);
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/account/export?id=abc"));
    expect(response.status).toBe(401);
  });

  it("GET returns 400 when id query param is missing", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/account/export"));
    expect(response.status).toBe(400);
  });
});
