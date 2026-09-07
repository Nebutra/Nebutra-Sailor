import "server-only";

import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@nebutra/db";

/**
 * A shoot is a `Task` row.
 *
 * Until this module the truth about a Moment was an R2 listing: a key existed
 * or it did not, and nothing could say what failed, what was still running, or
 * how many a person had ever taken. The platform's `Task` model was built for
 * exactly this — status, progress, payload, result, error, idempotency key,
 * timestamps — and nobody had written a row to it yet. This is the first
 * writer, so the pattern stays here rather than becoming a shared repository
 * the closure phase does not authorise.
 *
 * Every query goes through a tenant-scoped client (`tenantDbFor`), so a person
 * can only ever see their own rows, and the three `Task` indexes all lead with
 * `tenantId` — "this person's shoots, newest first" is an index hit.
 */

export const SHOOT_TASK_TYPE = "kuanlan.id-photo";

/** Keep in step with `Task.idempotencyKey @db.VarChar(120)`. */
const IDEMPOTENCY_KEY_MAX = 120;

export type ShootPayload = {
  skuId: string;
  sizeId: string;
  /** SHA-256 of the uploaded portrait — the portrait itself is never stored. */
  sourceHash: string;
};

export type ShootResult = {
  key: string;
  width: number;
  height: number;
  dpi: number;
};

export type ShootFailure = {
  step: "resolve" | "router" | "compose" | "store";
  name: string;
  message: string;
};

export type ShootStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type ShootRow = {
  id: string;
  status: ShootStatus;
  payload: ShootPayload;
  result: ShootResult | null;
  error: ShootFailure | null;
  createdAt: Date;
  completedAt: Date | null;
};

/**
 * The subset of the Prisma client a shoot touches. Narrow on purpose so the
 * tests can hand in a plain object and so the coupling to the generated client
 * stays at the edge.
 */
export type ShootStore = Pick<PrismaClient, "task">;

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * The same person, the same spec, the same portrait → the same key.
 *
 * A double-click, a retried request, a refresh mid-submit all collapse onto one
 * row, which is what stops a second call to the model. The portrait goes in as a
 * hash so the key never carries the image, and the whole thing is hashed again
 * so it fits the column whatever the ids look like.
 */
export function shootIdempotencyKey(input: {
  userId: string;
  skuId: string;
  sizeId: string;
  sourceHash: string;
}): string {
  const material = [input.userId, input.skuId, input.sizeId, input.sourceHash].join("|");
  return createHash("sha256").update(material).digest("hex").slice(0, IDEMPOTENCY_KEY_MAX);
}

function toRow(task: {
  id: string;
  status: string;
  payload: unknown;
  result: unknown;
  error: unknown;
  createdAt: Date;
  completedAt: Date | null;
}): ShootRow {
  return {
    id: task.id,
    status: task.status as ShootStatus,
    payload: task.payload as ShootPayload,
    result: (task.result as ShootResult | null) ?? null,
    error: (task.error as ShootFailure | null) ?? null,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  };
}

/**
 * Open a shoot, or hand back the one already open for this exact request.
 *
 * `Task.idempotencyKey` has no unique index — adding one is a platform
 * migration this app must not run — so this is find-then-create. Two identical
 * submits landing inside one database round trip can both create; the model is
 * called twice in that window and the second row simply wins the listing. The
 * window is a few milliseconds and the cost is one duplicate shot, which is a
 * far better failure than the unbounded one this replaces.
 *
 * A FAILED row does not block a retry: the person asked again on purpose.
 */
export async function openShoot(
  db: ShootStore,
  input: {
    tenantId: string;
    userId: string;
    idempotencyKey: string;
    payload: ShootPayload;
  },
): Promise<{ row: ShootRow; reused: boolean }> {
  const existing = await db.task.findFirst({
    where: {
      tenantId: input.tenantId,
      type: SHOOT_TASK_TYPE,
      idempotencyKey: input.idempotencyKey,
      status: { in: ["QUEUED", "RUNNING", "SUCCEEDED"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return { row: toRow(existing), reused: true };
  }

  // Still synchronous at this point in the roadmap: the row is RUNNING from
  // the moment it exists, because the request that created it is the worker.
  // B2 introduces QUEUED as a real state.
  const created = await db.task.create({
    data: {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      type: SHOOT_TASK_TYPE,
      status: "RUNNING",
      priority: "NORMAL",
      progress: 0,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      idempotencyKey: input.idempotencyKey,
      queueName: "ai",
      startedAt: new Date(),
    },
  });
  return { row: toRow(created), reused: false };
}

export async function succeedShoot(
  db: ShootStore,
  taskId: string,
  result: ShootResult,
): Promise<ShootRow> {
  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      status: "SUCCEEDED",
      progress: 100,
      result: result as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });
  return toRow(updated);
}

/**
 * Record why. `name` and `message` only — never a stack, which can carry
 * filesystem paths, and never the brief, which is a system prompt.
 */
export async function failShoot(
  db: ShootStore,
  taskId: string,
  failure: ShootFailure,
): Promise<ShootRow> {
  const updated = await db.task.update({
    where: { id: taskId },
    data: {
      status: "FAILED",
      error: failure as unknown as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });
  return toRow(updated);
}

/**
 * This person's finished shoots, newest first.
 *
 * `total` counts every SUCCEEDED row; `limit` bounds what comes back. The
 * `(tenantId, type, createdAt desc)` index carries both.
 */
export async function listShoots(
  db: ShootStore,
  tenantId: string,
  options: { limit?: number } = {},
): Promise<{ rows: ShootRow[]; total: number }> {
  const where = { tenantId, type: SHOOT_TASK_TYPE, status: "SUCCEEDED" as const };
  const [rows, total] = await Promise.all([
    db.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(options.limit != null ? { take: options.limit } : {}),
    }),
    db.task.count({ where }),
  ]);
  return { rows: rows.map(toRow), total };
}
