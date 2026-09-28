import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./editor-store";
import { useJobsStore } from "./jobs-store";

describe("jobs-store drives node status", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .load("d", { version: 2, nodes: {}, edges: {}, viewport: { x: 0, y: 0, zoom: 1 } });
    useJobsStore.setState({ jobs: [] });
  });

  it("queued → running → completed lands an output on the node", () => {
    const id = useEditorStore.getState().derive({ mode: "image", createdBy: "user" }) as string;
    useJobsStore.getState().enqueue(id, "Variant", 1);
    expect(useEditorStore.getState().document?.nodes[id]?.status).toBe("queued");
    const tick = useJobsStore.getState().tick;
    tick();
    expect(useEditorStore.getState().document?.nodes[id]?.status).toBe("running");
    for (let i = 0; i < 6; i++) tick();
    const n = useEditorStore.getState().document?.nodes[id];
    expect(n?.status).toBe("completed");
    expect(n?.type === "image" && n.assetId).toBeTruthy();
  });

  it("cancel while queued is immediate and terminal", () => {
    const id = useEditorStore.getState().derive({ mode: "image", createdBy: "user" }) as string;
    const jobId = useJobsStore.getState().enqueue(id, "Variant");
    useJobsStore.getState().cancel(jobId);
    expect(useEditorStore.getState().document?.nodes[id]?.status).toBe("failed");
    expect(useJobsStore.getState().jobs[0]?.error?.type).toBe("cancelled");
  });
});

describe("jobs carry wired references", () => {
  beforeEach(() => {
    useEditorStore
      .getState()
      .load("d", { version: 2, nodes: {}, edges: {}, viewport: { x: 0, y: 0, zoom: 1 } });
    useJobsStore.setState({ jobs: [] });
  });

  it("a video wired from a finished image sends that image's URL as its first frame", () => {
    const editor = useEditorStore.getState();
    const img = editor.createNode({ mode: "image", at: { x: 0, y: 0 } }) as string;
    editor.completeNode(img, "a001", "j0");
    const vid = editor.createNode({ mode: "video", at: { x: 500, y: 0 }, sourceId: img }) as string;
    const jobId = useJobsStore.getState().enqueue(vid, "视频", 100);
    const job = useJobsStore.getState().jobs.find((j) => j.id === jobId);
    expect(job?.config?.references).toEqual([{ kind: "node", id: img, url: "/mock/a001.svg" }]);
    // The draft itself is not rewritten with resolved URLs.
    expect(useEditorStore.getState().document?.nodes[vid]?.generator?.references).toEqual([
      { kind: "node", id: img },
    ]);
  });

  it("an unwired node sends no references at all", () => {
    const vid = useEditorStore
      .getState()
      .createNode({ mode: "video", at: { x: 0, y: 0 } }) as string;
    const jobId = useJobsStore.getState().enqueue(vid, "视频", 100);
    expect(useJobsStore.getState().jobs.find((j) => j.id === jobId)?.config).not.toHaveProperty(
      "references",
    );
  });
});
