/**
 * Canvas engine: deterministic placement, tenant isolation, write-then-
 * broadcast consistency, and per-canvas serialization.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { _resetCanvasLocks } from "../lock";
import { findNextPosition } from "../placement";
import { type GeneratedAsset, placeGeneratedAsset } from "../service";
import { InMemoryCanvasStore } from "../store/memory";
import type { CanvasElement } from "../types";

const img = (over: Partial<GeneratedAsset> = {}): GeneratedAsset => ({
  modality: "image",
  mimeType: "image/svg+xml",
  url: "data:image/svg+xml;base64,AAAA",
  width: 512,
  height: 512,
  ...over,
});

beforeEach(() => {
  _resetCanvasLocks();
});

describe("findNextPosition", () => {
  it("places the first element at the origin", () => {
    expect(findNextPosition([], { width: 100, height: 100 })).toEqual({ x: 0, y: 0 });
  });

  it("never overlaps an existing element (respects gap)", () => {
    const existing: CanvasElement[] = [
      { id: "a", type: "image", x: 0, y: 0, width: 200, height: 200, ref: "f" },
    ];
    const p = findNextPosition(existing, { width: 200, height: 200 });
    const clash = p.x < 200 + 40 && p.x + 200 + 40 > 0 && p.y < 200 + 40 && p.y + 200 + 40 > 0;
    expect(clash).toBe(false);
  });

  it("is deterministic for identical input", () => {
    const existing: CanvasElement[] = [
      { id: "a", type: "image", x: 0, y: 0, width: 300, height: 100, ref: "f" },
    ];
    const a = findNextPosition(existing, { width: 100, height: 100 });
    const b = findNextPosition(existing, { width: 100, height: 100 });
    expect(a).toEqual(b);
  });
});

describe("placeGeneratedAsset", () => {
  it("persists before returning the patch (scene is durable)", async () => {
    const store = new InMemoryCanvasStore();
    const { patch } = await placeGeneratedAsset(store, "org_1", "c1", img());

    const reloaded = await store.get("org_1", "c1");
    expect(reloaded?.scene.elements).toHaveLength(1);
    expect(reloaded?.scene.elements[0]?.id).toBe(patch.element.id);
    expect(reloaded?.scene.files).toHaveLength(1);
    expect(reloaded?.thumbnail).toBe(patch.thumbnail);
  });

  it("isolates canvases by tenant", async () => {
    const store = new InMemoryCanvasStore();
    await placeGeneratedAsset(store, "org_a", "shared-id", img());
    await placeGeneratedAsset(store, "org_b", "shared-id", img());

    expect((await store.get("org_a", "shared-id"))?.scene.elements).toHaveLength(1);
    expect(await store.list("org_a")).toHaveLength(1);
    expect(await store.list("org_b")).toHaveLength(1);
  });

  it("embeds video by URL (no file entry)", async () => {
    const store = new InMemoryCanvasStore();
    const { patch } = await placeGeneratedAsset(
      store,
      "org_1",
      "c1",
      img({ modality: "video", url: "https://x.test/v.mp4", mimeType: "video/mp4" }),
    );
    expect(patch.element.type).toBe("embeddable");
    expect(patch.element.ref).toBe("https://x.test/v.mp4");
    expect(patch.file).toBeUndefined();
  });

  it("serializes concurrent placements on the same canvas (no stacking)", async () => {
    const store = new InMemoryCanvasStore();
    await Promise.all(
      Array.from({ length: 6 }, () => placeGeneratedAsset(store, "org_1", "c1", img())),
    );
    const scene = (await store.get("org_1", "c1"))?.scene;
    expect(scene?.elements).toHaveLength(6);
    // Every element occupies a distinct position.
    const positions = new Set(scene?.elements.map((e) => `${e.x},${e.y}`));
    expect(positions.size).toBe(6);
  });
});
