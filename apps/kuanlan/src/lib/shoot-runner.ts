import "server-only";

import type { Logger } from "@nebutra/logger";
import type { IdPhotoPrint } from "@/catalog/skus";
import { refundShootCredits } from "./credits";
import { idPhotoShootBrief, image2SizeForSku, shootWithImage2 } from "./image2";
import { persistIdPhotoMoment } from "./resources.server";
import {
  failShoot,
  markShootRunning,
  type ShootFailure,
  type ShootStore,
  setShootProgress,
  succeedShoot,
} from "./shoots";

/**
 * The worker.
 *
 * Runs after the response has already gone out — via `after()` from
 * `next/server` — so the person pressing 开拍 gets a task id back in a moment
 * and the model call happens on its own time. The row is the only channel
 * between the two: every step here lands in `status` / `progress`, and the
 * poll endpoint reads that row and nothing else.
 *
 * Why not the queue package: `@nebutra/queue` refuses its in-memory provider in
 * production, and it is right to — a queued job that lives only in this
 * process is lost on restart, and a shoot that was already paid for and then
 * lost is exactly the failure this whole layer exists to prevent. The durable
 * thing is the row. A row this runner never returns to is caught by
 * `isShootStale` on the next poll and closed with a refund. QStash or Redis can
 * replace `after()` later without touching the row contract.
 *
 * Nothing thrown escapes. There is no caller to throw to.
 */
export type RunShootInput = {
  db: ShootStore;
  tenantId: string;
  userId: string;
  taskId: string;
  print: IdPhotoPrint;
  source: Buffer;
  mimeType: string;
  log: Logger;
};

export async function runShoot(input: RunShootInput): Promise<void> {
  const { db, tenantId, userId, taskId, print, source, mimeType, log } = input;
  const started = Date.now();
  let step: ShootFailure["step"] = "router";

  try {
    await markShootRunning(db, taskId);

    step = "router";
    const frame = await shootWithImage2({
      image: source,
      prompt: idPhotoShootBrief(print),
      size: image2SizeForSku(print),
      mimeType,
    });
    await setShootProgress(db, taskId, 60);

    step = "compose";
    const { composeIdPhoto } = await import("./id-photo");
    const result = await composeIdPhoto({ source: frame, sku: print });
    await setShootProgress(db, taskId, 85);

    step = "store";
    const stored = await persistIdPhotoMoment({
      id: taskId,
      userId,
      skuId: print.id,
      sizeId: print.sizeId,
      print: result.png,
    });
    await succeedShoot(db, taskId, {
      key: stored.key,
      width: result.width,
      height: result.height,
      dpi: result.dpi,
    });

    log.info("shoot done", { taskId, ms: Date.now() - started });
  } catch (error) {
    const ms = Date.now() - started;
    log.error("shoot failed", error, { taskId, step, ms });

    // Record first, refund second, and let neither failure hide the other.
    await failShoot(db, taskId, {
      step,
      name: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message.slice(0, 500) : String(error),
    }).catch((recordError) => log.error("could not record the failure", recordError, { taskId }));

    await refundShootCredits(tenantId, taskId, `shoot failed at ${step}`)
      .then((r) =>
        log.info("shoot refunded", { taskId, refunded: r.refunded, balance: r.balanceAfter }),
      )
      .catch((refundError) => log.error("could not refund the shoot", refundError, { taskId }));
  }
}
