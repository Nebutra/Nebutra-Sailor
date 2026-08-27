/**
 * @nebutra/cinema — agentic film-production IP absorbed from a research
 * video pipeline, re-expressed clean-room as pure, dependency-injected
 * orchestration on top of Sailor primitives.
 *
 * SKIP (reused, not re-implemented): typed media DAG + script→shots split
 * (`@nebutra/reel`), agent loop (`@nebutra/agent-runtime`), LLM + image/video
 * generation registry (`@nebutra/agents`), acyclic guard
 * (`@nebutra/graph-model`), errors/cli (`@nebutra/capability-kit`).
 *
 * PORT (this package — the differentiated IP): camera-continuity tree,
 * consistency-ranked best-frame selection, novel→scene segmentation, and the
 * film-director composition. Every model/IO touchpoint is injected, so this
 * is multi-tenant-agnostic and fully unit-testable.
 */

export {
  type BestFrame,
  type FrameCandidate,
  type RankFrames,
  selectBestFrame,
} from "./best-frame";
export {
  buildCameraTree,
  type Camera,
  type CameraParent,
  type CameraTree,
  type InferParents,
  resolveContinuityChain,
} from "./camera-tree";
export {
  type FilmInput,
  type FilmResult,
  type FilmSteps,
  runFilmPipeline,
} from "./director";
export { CinemaError } from "./errors";
export { type CompleteFn, compressNovel, extractScenes } from "./novel-segment";
