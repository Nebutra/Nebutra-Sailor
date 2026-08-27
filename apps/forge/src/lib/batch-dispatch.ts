import {
  dispatchJob,
  type ForgeJob,
  getDefaultJobStore,
  invokeTool,
  resolveJobDispatchMode,
} from "@nebutra/forge-runtime";
import { getForgeRegistry } from "@/lib/registry";

/**
 * Fire-and-forget one batch item. Never shares a promise chain with siblings.
 */
export function dispatchBatchItem(job: ForgeJob, input: unknown): void {
  if (job.status === "skipped") return;

  const store = getDefaultJobStore();
  const mode = resolveJobDispatchMode();
  const payload = {
    jobId: job.id,
    toolId: job.toolId,
    input: input ?? {},
  };

  void (async () => {
    try {
      await store.markRunning(job.id);
      if (mode === "inline") {
        const result = await invokeTool(getForgeRegistry(), {
          toolId: job.toolId,
          input: input ?? {},
          requestId: job.id,
        });
        if (result.ok) await store.complete(job.id, result.output);
        else await store.fail(job.id, `${result.code}: ${result.message}`);
        return;
      }
      await dispatchJob(payload);
    } catch (err) {
      await store.fail(job.id, err instanceof Error ? err.message : String(err));
    }
  })();
}
