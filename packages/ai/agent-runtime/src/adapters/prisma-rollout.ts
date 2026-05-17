/**
 * Durable rollout-store backend: `RolloutPersistencePort` over Prisma.
 *
 * This is the fail-loud system-of-record adapter (table `agent_rollout_lines`,
 * migration `20260519000000_add_agent_rollout_store`). Unlike a best-effort
 * audit log it never swallows a failed write — a rejected `put` propagates so
 * the caller's "never silently drop" contract holds.
 *
 * Reusability: it depends only on a minimal injected delegate (the
 * `PrismaAuditDelegate` pattern), NOT on the generated Prisma client or
 * `@nebutra/db`. Any tenant-scoped Prisma client (`getTenantDb(orgId)`)
 * structurally satisfies it, so this package stays dependency-light.
 */

import { z } from "zod";
import type { RolloutPersistencePort } from "../rollout-store-persistent";

/**
 * Minimal structural slice of `prisma.agentRolloutLine`. Decoupled from the
 * generated client on purpose — only these two operations are needed.
 */
export interface PrismaRolloutDelegate {
  create(args: {
    data: {
      tenantId: string;
      threadId: string;
      seq: number;
      at: Date;
      payload: string;
    };
  }): Promise<unknown>;
  findMany(args: {
    where: { tenantId: string; threadId: string };
    orderBy: { seq: "asc" };
    select: { seq: true; payload: true };
  }): Promise<{ seq: number; payload: string }[]>;
}

/** Resolves the delegate per call so a request-scoped (RLS) client can be used. */
export type RolloutDelegateResolver =
  | PrismaRolloutDelegate
  | ((tenantId: string) => PrismaRolloutDelegate | Promise<PrismaRolloutDelegate>);

const recordSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  threadId: z.string().min(1, "threadId is required"),
  seq: z.number().int().nonnegative(),
  at: z.string().min(1),
  payload: z.string(),
});

const querySchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  threadId: z.string().min(1, "threadId is required"),
});

async function resolve(
  resolver: RolloutDelegateResolver,
  tenantId: string,
): Promise<PrismaRolloutDelegate> {
  return typeof resolver === "function" ? resolver(tenantId) : resolver;
}

/**
 * Build a {@link RolloutPersistencePort} backed by Prisma.
 *
 * @param delegate a `PrismaRolloutDelegate`, or a resolver mapping a tenantId
 *   to one (use the latter to obtain a per-tenant RLS client per call).
 */
export function createPrismaRolloutPersistence(
  delegate: RolloutDelegateResolver,
): RolloutPersistencePort {
  return {
    async put(record): Promise<void> {
      const r = recordSchema.parse(record);
      const at = new Date(r.at);
      if (Number.isNaN(at.getTime())) {
        throw new Error(`invalid timestamp: ${r.at}`);
      }
      const db = await resolve(delegate, r.tenantId);
      // Fail-loud: any persistence rejection propagates to the caller.
      await db.create({
        data: {
          tenantId: r.tenantId,
          threadId: r.threadId,
          seq: r.seq,
          at,
          payload: r.payload,
        },
      });
    },

    async list(tenantId, threadId): Promise<{ seq: number; payload: string }[]> {
      const q = querySchema.parse({ tenantId, threadId });
      const db = await resolve(delegate, q.tenantId);
      const rows = await db.findMany({
        where: { tenantId: q.tenantId, threadId: q.threadId },
        orderBy: { seq: "asc" },
        select: { seq: true, payload: true },
      });
      return rows.map((row) => ({ seq: row.seq, payload: row.payload }));
    },
  };
}
