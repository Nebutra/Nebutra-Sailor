/**
 * The write-then-broadcast placement service — the core consistency
 * invariant absorbed from the source product.
 *
 * For one (tenant, canvas), under the canvas lock:
 *   1. load the authoritative scene,
 *   2. compute a non-overlapping position server-side,
 *   3. append the element/file and **persist** the new scene,
 *   4. return a {@link ScenePatch}.
 *
 * The caller broadcasts the returned patch over the realtime channel *after*
 * this resolves. Persisting before broadcasting is what makes the websocket
 * a pure optimization: a client that never receives the event recovers the
 * identical state on reload. Reversing the order reintroduces the
 * lost-update bug.
 */

import { logger } from "@nebutra/logger";
import { withCanvasLock } from "./lock";
import { findNextPosition } from "./placement";
import type {
  AtelierCanvas,
  CanvasElement,
  CanvasFile,
  CanvasScene,
  CanvasStore,
  ScenePatch,
} from "./types";

const log = logger.child({ module: "atelier-canvas/service" });

/** A generated asset, shaped to match `@nebutra/agents` GenerationResult. */
export interface GeneratedAsset {
  readonly modality: "image" | "video";
  readonly mimeType: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  /** Carried into element.meta for provenance (prompt, model, provider). */
  readonly meta?: Readonly<Record<string, unknown>>;
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * Place a generated asset on a canvas. Creates the canvas on first write.
 * Concurrency-safe per (tenant, canvas) via {@link withCanvasLock}.
 */
export async function placeGeneratedAsset(
  store: CanvasStore,
  tenantId: string,
  canvasId: string,
  asset: GeneratedAsset,
): Promise<{ patch: ScenePatch; canvas: AtelierCanvas }> {
  return withCanvasLock(tenantId, canvasId, async () => {
    const current =
      (await store.get(tenantId, canvasId)) ?? (await store.create(tenantId, canvasId, canvasId));

    const position = findNextPosition(current.scene.elements, {
      width: asset.width,
      height: asset.height,
    });

    // Images carry a file the client resolves by id; videos embed by URL.
    let file: CanvasFile | undefined;
    let ref: string;
    if (asset.modality === "image") {
      file = { id: newId("file"), mimeType: asset.mimeType, dataURL: asset.url };
      ref = file.id;
    } else {
      ref = asset.url;
    }

    const element: CanvasElement = {
      id: newId("el"),
      type: asset.modality === "image" ? "image" : "embeddable",
      x: position.x,
      y: position.y,
      width: asset.width,
      height: asset.height,
      ref,
      ...(asset.meta ? { meta: asset.meta } : {}),
    };

    const nextScene: CanvasScene = {
      elements: [...current.scene.elements, element],
      files: file ? [...current.scene.files, file] : current.scene.files,
    };

    // Thumbnail = latest asset (matches source product's grid-preview rule).
    const thumbnail = asset.url;

    // (3) Persist BEFORE returning — broadcast happens in the caller, after.
    const canvas = await store.save(tenantId, canvasId, nextScene, thumbnail);

    log.debug("placed generated asset", {
      tenantId,
      canvasId,
      modality: asset.modality,
      x: position.x,
      y: position.y,
    });

    const patch: ScenePatch = {
      canvasId,
      tenantId,
      element,
      ...(file ? { file } : {}),
      thumbnail,
    };
    return { patch, canvas };
  });
}
