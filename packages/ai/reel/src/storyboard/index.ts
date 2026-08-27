/**
 * @nebutra/reel/storyboard — script/novel/custom → shots, plus the shot
 * identity + result-routing primitives that keep per-shot reference images
 * isolated under concurrent batch generation.
 */

export {
  getSplitPrompt,
  STORYBOARD_NOVEL_PROMPT,
  STORYBOARD_SCRIPT_PROMPT,
  STORYBOARD_TABLE_SUMMARY_PROMPT,
  type StoryboardPromptMode,
  type StoryboardSplitMode,
} from "./prompts";
export {
  buildShotSourceId,
  isSameShotId,
  MAX_STORYBOARD_OUTPUT_HISTORY,
  makeShotFocusKey,
  normalizeShotId,
  parseShotSourceId,
  pushOutputHistory,
  type Shot,
  SIMPLE_NUMERIC_SHOT_ID_RE,
  type StoryboardPlan,
  type StoryboardScene,
  type StoryboardTransition,
  storyboardTotalDuration,
} from "./shot";
export {
  type CompleteFn,
  parseJsonArrayFromText,
  type SplitOptions,
  splitScriptIntoShots,
} from "./split";
