/**
 * Film-director composition — the ViMax pipeline form, re-expressed as a
 * thin, fully-injected orchestrator. Every stage (write script, split shots,
 * build cameras, infer parents, render a shot) is supplied by the caller and
 * wired to Sailor primitives (`@nebutra/agents`, `@nebutra/reel`,
 * `@nebutra/cinema` camera tree). This module owns only the sequencing and
 * the cross-shot continuity guarantee — no model, no I/O.
 */

import { buildCameraTree, type Camera, type CameraParent, type CameraTree } from "./camera-tree";

export interface FilmInput {
  readonly idea: string;
}

export interface FilmSteps {
  readonly writeScript: (idea: string) => Promise<string>;
  readonly splitShots: (script: string) => Promise<readonly string[]>;
  readonly buildCameras: (shots: readonly string[]) => Promise<readonly Camera[]>;
  readonly inferParents: (cameras: readonly Camera[]) => Promise<readonly CameraParent[]>;
  readonly renderShot: (shot: string, index: number) => Promise<{ uri: string }>;
}

export interface FilmResult {
  readonly script: string;
  readonly shots: readonly string[];
  readonly cameraTree: CameraTree;
  readonly clips: ReadonlyArray<{ shot: string; uri: string }>;
}

/**
 * Run idea → script → shots → cameras (acyclic continuity tree) → per-shot
 * render → assembled clip list. Shots render in narrative order so a later
 * shot can reuse an earlier one's frames for continuity.
 */
export async function runFilmPipeline(input: FilmInput, steps: FilmSteps): Promise<FilmResult> {
  const script = await steps.writeScript(input.idea);
  const shots = await steps.splitShots(script);
  const cameras = await steps.buildCameras(shots);
  const cameraTree = await buildCameraTree(cameras, steps.inferParents);

  const clips: Array<{ shot: string; uri: string }> = [];
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i] as string;
    const { uri } = await steps.renderShot(shot, i);
    clips.push({ shot, uri });
  }

  return { script, shots, cameraTree, clips };
}
