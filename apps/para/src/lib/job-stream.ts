"use client";

import type { Job } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";
import { gatewayApi } from "./gateway-api";

/**
 * Gateway mode: follow a job's SSE events and write them onto the node (job = node) and the jobs mirror.
 * Each event carries a task envelope already mapped by the gateway to PARA's Job shape.
 */
export function followJob(job: Job): () => void {
  const es = new EventSource(gatewayApi.jobEventsUrl(job.id), { withCredentials: true });
  const apply = (next: Job) => {
    const editor = useEditorStore.getState();
    useJobsStore.getState().upsert(next);
    if (next.status === "queued")
      editor.setNodeStatus(
        next.nodeId,
        "queued",
        next.queuePosition !== undefined ? { queuePosition: next.queuePosition } : {},
      );
    else if (next.status === "running")
      editor.setNodeStatus(
        next.nodeId,
        "running",
        next.startedAt ? { startedAt: next.startedAt } : {},
      );
    else if (next.status === "failed")
      editor.failNode(
        next.nodeId,
        next.error ?? { type: "task_failed", message: "Generation failed" },
      );
    else if (next.status === "completed") {
      const assetId = (next as Job & { result?: { assetId?: string } }).result?.assetId;
      if (assetId) editor.completeNode(next.nodeId, assetId, next.id);
      else
        editor.failNode(next.nodeId, {
          type: "no_output",
          message: "Completed without an output asset",
        });
    }
    if (next.status === "completed" || next.status === "failed") es.close();
  };
  es.addEventListener("task", (e) => {
    try {
      apply(JSON.parse((e as MessageEvent).data) as Job);
    } catch {
      /* ignore malformed frames */
    }
  });
  es.onerror = () => {
    // Fall back to one poll; the origin closes the stream on terminal states.
    void gatewayApi
      .getJob(job.id)
      .then(apply)
      .catch(() => es.close());
  };
  return () => es.close();
}
