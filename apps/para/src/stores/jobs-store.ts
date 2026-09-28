import { create } from "zustand";
import { generatorOf, resolveReferences, upstreamNodes } from "@/domain/nodes";
import type { Asset, GeneratorState, Job } from "@/domain/types";
import { GatewayError, gatewayApi, isGatewayMode } from "@/lib/gateway-api";
import { getQueryClient } from "@/lib/query-client";
import { assets } from "@/mock/data";
import { useEditorStore } from "./editor-store";
import { mockOutputAsset, mockText } from "./mock-outputs";

/** An asset's URL from the one cache the canvas and the gallery read. */
function assetUrl(id: string): string | undefined {
  const cached = getQueryClient().getQueryData<Asset[]>(["assets"]);
  return (cached ?? assets).find((a) => a.id === id)?.url;
}

/** Put an asset where every reader finds it: the mock table and the query cache. */
function publishMockAsset(asset: Asset): void {
  assets.unshift(asset);
  const client = getQueryClient();
  const cached = client.getQueryData<Asset[]>(["assets"]);
  if (cached) client.setQueryData<Asset[]>(["assets"], [asset, ...cached]);
}

/**
 * Job = node (A). This store mirrors the node's task state for the top-bar indicator and popover;
 * the node is always the primary status surface. Module-level so jobs survive route changes (A).
 * Mock mode runs a local scheduler; gateway mode POSTs to /api/v1/para/jobs and follows SSE events.
 */
interface JobsState {
  jobs: Job[];
  /** `config` is the committed snapshot: what the node's draft said at the moment of admission. */
  enqueue: (nodeId: string, label: string, estimated?: number) => string;
  /**
   * Re-attach to work the server is still doing, after a reload.
   *
   * This store is seeded by `enqueue`, so it only ever knew about jobs the current session
   * started. Node status, however, is persisted in the document — so refreshing the page mid-run
   * left the node reading "running" forever with nothing behind it and no way back. The document
   * also persists each node's `jobId`, which is enough to ask the gateway what actually happened
   * without needing a job-list endpoint that does not exist.
   */
  reconcile: () => Promise<void>;
  cancel: (jobId: string) => void;
  upsert: (job: Job) => void;
  tick: () => void;
}

const ACTIVE = new Set(["queued", "running"]);

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],

  upsert: (job) => {
    const jobs = get().jobs;
    const i = jobs.findIndex(
      (j) => j.id === job.id || (j.nodeId === job.nodeId && ACTIVE.has(j.status)),
    );
    set({ jobs: i >= 0 ? jobs.map((j, k) => (k === i ? { ...j, ...job } : j)) : [...jobs, job] });
  },

  enqueue: (nodeId, label, estimated) => {
    const id = `j-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const queued = get().jobs.filter((j) => j.status === "queued").length;
    const editor = useEditorStore.getState();
    // Snapshot before anything can await: from here the node's draft may change under us.
    const node = editor.document?.nodes[nodeId];
    const draft: GeneratorState = node
      ? generatorOf(node)
      : { mode: "image", model: "Auto", count: 1 };
    // Wires become references here, with the upstream output's URL: an image wired into a video
    // node reaches the origin as its first frame. Resolved now, not stored on the draft, so a
    // regenerated upstream is what the next run reads.
    const references =
      editor.document && node ? resolveReferences(editor.document, nodeId, assetUrl) : [];
    const { references: _draftRefs, ...rest } = draft;
    const config: GeneratorState = references.length ? { ...rest, references } : rest;
    const job: Job = {
      id,
      nodeId,
      label,
      status: "queued",
      progress: 0,
      queuePosition: queued + 1,
      config,
      ...(estimated !== undefined ? { cost: { estimated, currency: "credits" } } : {}),
    };
    set({ jobs: [...get().jobs, job] });
    editor.setNodeStatus(nodeId, "queued", {
      queuePosition: queued + 1,
      jobId: id,
      ...(estimated !== undefined ? { cost: { estimated, currency: "credits" as const } } : {}),
    });

    if (isGatewayMode) {
      const workspaceId = editor.documentId;
      if (!node || !workspaceId) return id;
      void import("@/lib/job-stream").then(({ followJob }) =>
        gatewayApi
          .createJob({ workspaceId, nodeId, generator: config })
          .then((created) => {
            const real = { ...created, label, config, ...(job.cost ? { cost: job.cost } : {}) };
            set({ jobs: get().jobs.map((j) => (j.id === id ? real : j)) });
            useEditorStore.getState().setNodeStatus(nodeId, real.status, {
              jobId: real.id,
              ...(real.queuePosition !== undefined ? { queuePosition: real.queuePosition } : {}),
            });
            followJob(real);
          })
          .catch((e: unknown) => {
            // Pre-admission rejection (credits, quota, origin down): terminal on the node, shown inline.
            // A short wallet gets its own type so the node can offer the way to top up.
            const error =
              e instanceof GatewayError && e.status === 402
                ? { type: "insufficient_credits", message: "积分不足", retryable: true }
                : {
                    type: "rejected",
                    message: e instanceof Error ? e.message : "生成请求未被受理",
                    retryable: true,
                  };
            set({
              jobs: get().jobs.map((j) => (j.id === id ? { ...j, status: "failed", error } : j)),
            });
            useEditorStore.getState().failNode(nodeId, error);
          }),
      );
    }
    return id;
  },

  /** Immediate when queued, best-effort when running (C — fal semantics). */
  reconcile: async () => {
    const editor = useEditorStore.getState();
    const nodes = Object.values(editor.document?.nodes ?? {});
    const orphaned = nodes.filter(
      (n) => ACTIVE.has(n.status) && n.jobId && !get().jobs.some((j) => j.id === n.jobId),
    );
    if (!orphaned.length) return;

    if (!isGatewayMode) {
      // Mock mode has no server to ask; a task that outlived its scheduler is simply gone.
      for (const n of orphaned) {
        useEditorStore.getState().failNode(n.id, {
          type: "interrupted",
          message: "生成已中断",
          retryable: true,
        });
      }
      return;
    }

    const { followJob } = await import("@/lib/job-stream");
    await Promise.all(
      orphaned.map(async (n) => {
        const jobId = n.jobId as string;
        try {
          const job = await gatewayApi.getJob(jobId);
          get().upsert(job);
          useEditorStore.getState().setNodeStatus(n.id, job.status, {
            ...(job.queuePosition !== undefined ? { queuePosition: job.queuePosition } : {}),
          });
          if (ACTIVE.has(job.status)) followJob(job);
        } catch {
          // The job is gone from the origin's side. Say so on the node rather than leave it
          // spinning: an unrecoverable state the user can retry beats one they can only reload.
          useEditorStore.getState().failNode(n.id, {
            type: "lost",
            message: "这次生成无法恢复",
            retryable: true,
          });
        }
      }),
    );
  },

  cancel: (jobId) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job || !ACTIVE.has(job.status)) return;
    if (isGatewayMode && !jobId.startsWith("j-")) {
      void gatewayApi.cancelJob(jobId).then((j) => get().upsert({ ...j, label: job.label }));
      return;
    }
    const error = {
      type: "cancelled",
      message: job.status === "queued" ? "已取消" : "已停止",
      retryable: true,
    };
    set({ jobs: get().jobs.map((j) => (j.id === jobId ? { ...j, status: "failed", error } : j)) });
    useEditorStore.getState().failNode(job.nodeId, error);
  },

  /** Mock scheduler only: one running job at a time, ~2.5 s per job. */
  tick: () => {
    if (isGatewayMode) return;
    const editor = useEditorStore.getState();
    const jobs = get().jobs.map((j) => ({ ...j }));
    let running = jobs.find((j) => j.status === "running");
    if (!running) {
      running = jobs.find((j) => j.status === "queued");
      if (!running) return;
      running.status = "running";
      running.startedAt = new Date().toISOString();
      editor.setNodeStatus(running.nodeId, "running", { startedAt: running.startedAt });
    } else {
      running.progress = Math.min(1, running.progress + 0.2);
      if (running.progress >= 1) {
        running.status = "completed";
        running.finishedAt = new Date().toISOString();
        const node = editor.document?.nodes[running.nodeId];
        if (running.cost?.estimated !== undefined) running.cost.actual = running.cost.estimated;
        if (!node) {
          // The node was deleted mid-run; the job still finished, it just has nowhere to land.
        } else if (node.type === "text") {
          editor.setNodeStatus(node.id, "completed", {
            text: mockText(running.config?.prompt),
            jobId: running.id,
            finishedAt: new Date().toISOString(),
          });
        } else {
          const doc = editor.document;
          const upstream = doc
            ? upstreamNodes(doc, node.id).find((n) => n.type !== "text" && n.assetId)
            : undefined;
          const upstreamUrl =
            upstream && upstream.type !== "text" && upstream.assetId
              ? assetUrl(upstream.assetId)
              : undefined;
          const asset = mockOutputAsset(
            node,
            running.id,
            { projectId: editor.projectId, workspaceId: editor.documentId },
            upstreamUrl,
          );
          publishMockAsset(asset);
          editor.completeNode(node.id, asset.id, running.id);
        }
      }
    }
    let pos = 1;
    for (const j of jobs) if (j.status === "queued") j.queuePosition = pos++;
    set({ jobs });
  },
}));

export const selectActiveJobs = (jobs: Job[]) => jobs.filter((j) => ACTIVE.has(j.status));
