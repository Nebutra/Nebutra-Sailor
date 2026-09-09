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
      es.close();
      void recordOutput(next);
      return;
    }
    if (next.status === "failed") es.close();
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

/**
 * A completed job's output becomes an account asset (Library › Generated) and lands on the node.
 * Result shape from backends/python/ai handle_para_generate: {assets: [{url, contentType}], mode, text?}.
 */
async function recordOutput(job: Job): Promise<void> {
  const editor = useEditorStore.getState();
  const result = (
    job as Job & { result?: { assets?: Array<{ url: string }>; mode?: string; text?: string } }
  ).result;
  const node = editor.document?.nodes[job.nodeId];
  try {
    if (result?.mode === "text" && node?.type === "text") {
      editor.setNodeStatus(job.nodeId, "completed", {
        text: result.text ?? "",
        jobId: job.id,
        finishedAt: new Date().toISOString(),
      });
      return;
    }
    const first = result?.assets?.[0];
    if (!first) {
      editor.failNode(job.nodeId, {
        type: "no_output",
        message: "Completed without an output asset",
      });
      return;
    }
    const aspect = node?.generator?.params?.aspect;
    const asset = await gatewayApi.createAsset({
      type: node?.type === "video" ? "video" : "image",
      url: first.url,
      label: job.nodeId,
      aspect: aspect === "1:1" || aspect === "9:16" || aspect === "4:3" ? aspect : "16:9",
      origin: "generated",
      jobId: job.id,
      ...(editor.documentId ? { workspaceId: editor.documentId } : {}),
    });
    useEditorStore.getState().completeNode(job.nodeId, asset.id, job.id);
  } catch (e) {
    useEditorStore.getState().failNode(job.nodeId, {
      type: "asset_record_failed",
      message: e instanceof Error ? e.message : "Could not record the output",
    });
  }
}
