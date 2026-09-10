import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./editor-store";
import { useJobsStore } from "./jobs-store";

const doc = () => ({
  version: 2,
  viewport: { x: 0, y: 0, zoom: 1 },
  edges: {},
  nodes: {
    a: {
      id: "a",
      type: "image" as const,
      assetId: "a001",
      status: "completed" as const,
      createdBy: "import" as const,
      x: 10,
      y: 10,
      width: 100,
      height: 40,
    },
  },
});

const editor = () => useEditorStore.getState();
const jobs = () => useJobsStore.getState();

/**
 * The generator panel used to split one form across two owners: mode, model and count committed to
 * the store immediately, while the prompt lived in React state that a `key` remount destroyed. These
 * tests pin the single-owner model, because the symptom — a half-typed prompt vanishing when you
 * click another node — is invisible to a type checker and easy to reintroduce.
 */
describe("generator config ownership", () => {
  beforeEach(() => {
    useJobsStore.setState({ jobs: [] });
    editor().load("d", doc());
  });

  it("keeps a prompt that was typed but never generated", () => {
    editor().updateGenerator("a", { prompt: "make it colder" });
    // Selecting elsewhere and back is what used to remount the panel and drop the draft.
    editor().select(["a"]);
    editor().select([]);
    editor().select(["a"]);
    expect(editor().document?.nodes.a?.generator?.prompt).toBe("make it colder");
  });

  it("admits a job with a snapshot of the config, not a live reference", () => {
    editor().updateGenerator("a", { mode: "image", model: "GPT Image 2", prompt: "a heron" });
    const jobId = jobs().enqueue("a", "Generate · a", 1);

    // The user keeps editing while it runs. That configures the next run, not the running one.
    editor().updateGenerator("a", { model: "Nano Banana 2", prompt: "a heron at dusk" });

    const job = jobs().jobs.find((j) => j.id === jobId);
    expect(job?.config?.model).toBe("GPT Image 2");
    expect(job?.config?.prompt).toBe("a heron");
    expect(editor().document?.nodes.a?.generator?.model).toBe("Nano Banana 2");
  });

  it("cannot hold a model the mode does not offer", () => {
    editor().updateGenerator("a", { mode: "image", model: "GPT Image 2" });
    // Switching to video must not leave an image model behind for the origin to reject.
    editor().updateGenerator("a", { mode: "video" });
    expect(editor().document?.nodes.a?.generator?.model).toBe("Auto");

    editor().updateGenerator("a", { model: "Kling 3" });
    expect(editor().document?.nodes.a?.generator?.model).toBe("Kling 3");

    // The guard belongs to the store, so a caller that bypasses the panel is corrected too.
    editor().updateGenerator("a", { model: "Nano Banana 2" });
    expect(editor().document?.nodes.a?.generator?.model).toBe("Auto");
  });

  it("does not leave a node running forever after a reload", async () => {
    // What a reload looks like: the document remembers the node was running and which job it was,
    // the jobs store remembers nothing. Mock mode has no server to ask, so the honest outcome is a
    // retryable failure on the node rather than a spinner that never resolves.
    editor().load("d", {
      ...doc(),
      nodes: {
        a: {
          ...doc().nodes.a,
          status: "running" as const,
          jobId: "j-from-a-previous-session",
        },
      },
    });
    useJobsStore.setState({ jobs: [] });

    await jobs().reconcile();

    const node = editor().document?.nodes.a;
    expect(node?.status).toBe("failed");
    expect(node?.error?.retryable).toBe(true);
  });

  it("leaves a settled node alone when reconciling", async () => {
    editor().load("d", doc());
    await jobs().reconcile();
    expect(editor().document?.nodes.a?.status).toBe("completed");
  });

  it("records the estimated cost it was admitted with", () => {
    const jobId = jobs().enqueue("a", "Generate · a", 7);
    expect(jobs().jobs.find((j) => j.id === jobId)?.cost).toEqual({
      estimated: 7,
      currency: "credits",
    });
  });
});
