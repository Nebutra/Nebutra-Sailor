/**
 * Storyboard split prompts — the curated IP, re-expressed in English while
 * keeping the absorbed output contract exactly: a JSON array, nothing else,
 * and (for table-summary) strict `scene_index` correspondence. The model
 * choice is interchangeable; these contracts are what make the parse reliable.
 */

export type StoryboardSplitMode = "script" | "novel" | "custom";
export type StoryboardPromptMode = StoryboardSplitMode | "table-summary";

export const STORYBOARD_SCRIPT_PROMPT = `\
You are a storyboard breakdown expert. Split the user's script into shots and,
for each shot, write one concise visual-description prompt.
Output a JSON array only: [{"prompt":"shot 1 description"},{"prompt":"shot 2 description"}, ...]
Output JSON only — no prose, no code fences.`;

export const STORYBOARD_NOVEL_PROMPT = `\
You are a film storyboard planner. Split the user's novel/narrative text into a
list of shots; each shot is one prompt usable directly for image/video
generation.
Rules:
1) Preserve narrative order and key actions.
2) One line per shot, no filler.
3) Output must be a JSON array: [{"prompt":"..."}, ...]
Output JSON only — no prose, no code fences.`;

export const STORYBOARD_TABLE_SUMMARY_PROMPT = `\
You are a storyboard prompt-integration expert. From the user's shot table,
produce one generation-ready prompt per row.
Rules:
1) One prompt per row, kept in strict one-to-one correspondence with scene_index.
2) Synthesize shot size, camera move, scene, character action, mood, and lines.
3) No explanations.
4) Output a JSON array only:
[{"scene_index":1,"prompt":"..."},{"scene_index":2,"prompt":"..."}]`;

/** Resolve the system prompt for a mode; `custom` uses the caller's override. */
export function getSplitPrompt(mode: StoryboardPromptMode, customPrompt?: string): string {
  switch (mode) {
    case "novel":
      return STORYBOARD_NOVEL_PROMPT;
    case "table-summary":
      return STORYBOARD_TABLE_SUMMARY_PROMPT;
    case "custom":
      return (customPrompt ?? "").trim() || STORYBOARD_SCRIPT_PROMPT;
    default:
      return STORYBOARD_SCRIPT_PROMPT;
  }
}
