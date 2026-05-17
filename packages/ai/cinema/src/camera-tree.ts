/**
 * Camera-continuity tree — the ViMax-distinct IP, re-expressed.
 *
 * A film is shot by multiple cameras; a parent camera's footage encompasses
 * its children's, so a child shot can inherit the parent's frames for
 * temporal/character continuity. The parent inference itself is a model call
 * (injected — never bound to a provider here). The structural invariants are
 * enforced locally with the neutral `@nebutra/graph-model` acyclic guard
 * (governance: reuse, don't re-implement cycle detection).
 */

import type { GraphEdge } from "@nebutra/graph-model";
import { wouldCreateCycle } from "@nebutra/graph-model";
import { CinemaError } from "./errors";

export interface Camera {
  readonly id: string;
  readonly shotIds: readonly string[];
}

export interface CameraParent {
  readonly cameraId: string;
  /** Null = this camera is a root. */
  readonly parentCameraId: string | null;
  /** Which parent shot subsumes this camera (null at root). */
  readonly parentShotId: string | null;
  readonly fullyCovers: boolean;
  readonly missingInfo?: string;
}

/** Injected: infer each camera's parent (a model call in production). */
export type InferParents = (cameras: readonly Camera[]) => Promise<readonly CameraParent[]>;

export interface CameraTree {
  readonly rootId: string;
  readonly cameras: readonly Camera[];
  /** Parent camera id, or null for the root. */
  parentOf(cameraId: string): string | null;
}

/**
 * Build the camera tree: infer parents, enforce that the first camera is the
 * root, and that the parent relation is acyclic (a parent's footage cannot
 * transitively depend on its descendant).
 */
export async function buildCameraTree(
  cameras: readonly Camera[],
  infer: InferParents,
): Promise<CameraTree> {
  if (cameras.length === 0) {
    throw new CinemaError("Cannot build a camera tree from zero cameras.", {
      code: "CINEMA_NO_CAMERAS",
      suggestion: "Pass at least one camera (the root).",
    });
  }

  const parents = await infer(cameras);
  const parentById = new Map<string, string | null>();
  for (const p of parents) parentById.set(p.cameraId, p.parentCameraId);

  const firstId = cameras[0]?.id;
  if (parentById.get(firstId as string)) {
    throw new CinemaError(`The first camera "${firstId}" must be the tree root.`, {
      code: "CINEMA_BAD_ROOT",
      suggestion: "Ensure the inference returns parentCameraId=null for the first camera.",
    });
  }

  // Acyclic guard via graph-model: add parent→child edges incrementally.
  const edges: GraphEdge[] = [];
  for (const p of parents) {
    if (p.parentCameraId == null) continue;
    if (wouldCreateCycle(edges, p.parentCameraId, p.cameraId)) {
      throw new CinemaError(`Camera parent assignment is cyclic at "${p.cameraId}".`, {
        code: "CINEMA_CYCLIC_TREE",
        suggestion:
          "A parent camera must not transitively depend on its descendant; " +
          "re-infer parents or break the cycle.",
      });
    }
    edges.push({ from: p.parentCameraId, to: p.cameraId });
  }

  return {
    rootId: firstId as string,
    cameras,
    parentOf: (id) => parentById.get(id) ?? null,
  };
}

/** Root→node camera order — the frame-inheritance chain for continuity. */
export function resolveContinuityChain(tree: CameraTree, cameraId: string): string[] {
  const chain: string[] = [];
  let cur: string | null = cameraId;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) break; // defensive; tree is acyclic by construction
    seen.add(cur);
    chain.push(cur);
    cur = tree.parentOf(cur);
  }
  return chain.reverse();
}
