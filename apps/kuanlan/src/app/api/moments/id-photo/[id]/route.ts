import { getSignedDownloadUrl } from "@nebutra/storage";
import { getSessionFromRequest } from "@/lib/auth";
import { refundShootCredits } from "@/lib/credits";
import { DbUnavailableError, tenantDbFor } from "@/lib/db";
import { shootLog } from "@/lib/log";
import { failShoot, getShoot, isShootStale, STALE_AFTER_MS } from "@/lib/shoots";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" } as const;

/**
 * Where a shoot is right now.
 *
 * The studio polls this after 开拍 answers with a task id. It reads the row
 * and nothing else — the worker and this endpoint share no memory, which is
 * what lets the page be closed and reopened, or opened on another device, and
 * still see the shoot.
 *
 * It is also where a lost shoot is noticed. A row RUNNING past `STALE_AFTER_MS`
 * has no worker any more; rather than a cron that might not be deployed (see
 * infra/data/database/README.md on retention), the first poll that finds it
 * closes it as FAILED and refunds. Self-healing on read.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const log = shootLog(session.userId);

  try {
    const { db, tenant } = await tenantDbFor(session.userId);
    let row = await getShoot(db, tenant.tenantId, id);
    if (!row) {
      return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
    }

    if (isShootStale(row)) {
      log.warn("stale shoot closed on read", { taskId: id, status: row.status });
      row = await failShoot(db, id, {
        step: "runner",
        name: "StaleShoot",
        message: `no progress for more than ${Math.round(STALE_AFTER_MS / 1000)}s`,
      });
      await refundShootCredits(tenant.tenantId, id, "shoot went stale").catch((error) =>
        log.error("could not refund a stale shoot", error, { taskId: id }),
      );
    }

    const result = row.result
      ? {
          key: row.result.key,
          url: await getSignedDownloadUrl(row.result.key, { bucket: "uploads" }),
          width: row.result.width,
          height: row.result.height,
          dpi: row.result.dpi,
        }
      : null;

    return Response.json(
      {
        id: row.id,
        status: row.status,
        progress: row.progress,
        result,
        error: row.error ? { step: row.error.step, name: row.error.name } : null,
      },
      { headers: noStore },
    );
  } catch (error) {
    if (error instanceof DbUnavailableError) {
      return Response.json({ error: "unavailable" }, { status: 503, headers: noStore });
    }
    log.error("shoot poll failed", error, { taskId: id });
    return Response.json({ error: "unavailable" }, { status: 500, headers: noStore });
  }
}
