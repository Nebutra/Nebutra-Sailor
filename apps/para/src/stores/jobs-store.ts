import { create } from "zustand";
import type { Job } from "@/domain/types";
import { assets } from "@/mock/data";
import { useEditorStore } from "./editor-store";

/**
 * Job = node (A). This store mirrors the node's task state for the top-bar indicator and popover;
 * the node is always the primary status surface. Module-level so jobs survive route changes (A).
 * Completed jobs are not "jobs" any more — their outputs live in Library › Generated.
 */
interface JobsState {
  jobs: Job[];
  enqueue: (nodeId: string, label: string, estimated?: number) => string;
  cancel: (jobId: string) => void;
  tick: () => void;
}

const ACTIVE = new Set(["queued", "running"]);

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],

  enqueue: (nodeId, label, estimated) => {
    const id = `j-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const queued = get().jobs.filter((j) => j.status === "queued").length;
    const job: Job = {
      id,
      nodeId,
      label,
      status: "queued",
      progress: 0,
      queuePosition: queued + 1,
      ...(estimated !== undefined ? { cost: { estimated, currency: "credits" } } : {}),
    };
    set({ jobs: [...get().jobs, job] });
    useEditorStore
      .getState()
      .setNodeStatus(nodeId, "queued", { queuePosition: queued + 1, jobId: id });
    return id;
  },

  /** Immediate when queued, best-effort when running (C — fal semantics). */
  cancel: (jobId) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job || !ACTIVE.has(job.status)) return;
    const error = {
      type: "cancelled",
      message: job.status === "queued" ? "Cancelled" : "Stopped",
      retryable: true,
    };
    set({ jobs: get().jobs.map((j) => (j.id === jobId ? { ...j, status: "failed", error } : j)) });
    useEditorStore.getState().failNode(job.nodeId, error);
  },

  /** Mock scheduler: one running job at a time, ~2.5 s per job. */
  tick: () => {
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
        const pool = assets.filter((a) => a.type === (node?.type === "video" ? "video" : "image"));
        const pick = pool[(jobs.length + running.nodeId.length) % Math.max(1, pool.length)];
        if (running.cost?.estimated !== undefined) running.cost.actual = running.cost.estimated;
        if (pick) editor.completeNode(running.nodeId, pick.id, running.id);
        else editor.failNode(running.nodeId, { type: "no_output", message: "No output produced" });
      }
    }
    let pos = 1;
    for (const j of jobs) if (j.status === "queued") j.queuePosition = pos++;
    set({ jobs });
  },
}));

export const selectActiveJobs = (jobs: Job[]) => jobs.filter((j) => ACTIVE.has(j.status));
