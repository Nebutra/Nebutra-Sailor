/**
 * Script → shots split.
 *
 * The source called a chat model with a mode-specific system prompt and parsed
 * a JSON array out of the reply. We keep that flow but inject the completion
 * function (`complete`) so the package stays decoupled from any specific LLM
 * runtime — wire it to `@nebutra/agents` (optional peer) in the app, or to a
 * stub in tests. Robust JSON-array extraction tolerates code fences and prose.
 */

import { getSplitPrompt, type StoryboardPromptMode } from "./prompts";
import type { Shot } from "./shot";

/** Injected model call: system + user text → assistant text. */
export type CompleteFn = (system: string, user: string) => Promise<string>;

/** Pull the first JSON array out of arbitrary model output. */
export function parseJsonArrayFromText(text: string): unknown[] {
  if (typeof text !== "string") return [];
  const fenced = text.replace(/```(?:json)?/gi, "");
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface SplitOptions {
  readonly mode?: StoryboardPromptMode;
  /** Used only when mode === "custom". */
  readonly customPrompt?: string;
  /** Shot defaults applied to every produced shot. */
  readonly defaults?: Partial<Pick<Shot, "model" | "ratio" | "resolution" | "duration">>;
}

function shotFromItem(item: unknown, idx: number, defaults: SplitOptions["defaults"]): Shot {
  const obj = (item ?? {}) as Record<string, unknown>;
  const prompt = String(obj.prompt ?? obj.description ?? "").trim();
  const description = String(obj.description ?? obj.prompt ?? "").trim();
  const sceneIndex = typeof obj.scene_index === "number" ? obj.scene_index : idx + 1;
  return {
    id: `shot-${Date.now()}-${idx}`,
    sceneIndex,
    prompt,
    description,
    ...(defaults?.model ? { model: defaults.model } : {}),
    ...(defaults?.ratio ? { ratio: defaults.ratio } : {}),
    ...(defaults?.resolution ? { resolution: defaults.resolution } : {}),
    ...(defaults?.duration ? { duration: defaults.duration } : {}),
    status: "draft",
    outputEnabled: false,
    selectedImageIndex: -1,
    outputHistory: [],
    outputHistoryCursor: -1,
    referenceImages: [],
  };
}

/**
 * Split `scriptText` into shots via the injected `complete`. Throws if the
 * model returns nothing parseable (caller decides UX).
 */
export async function splitScriptIntoShots(
  scriptText: string,
  complete: CompleteFn,
  options: SplitOptions = {},
): Promise<Shot[]> {
  const text = scriptText.trim();
  if (!text) throw new Error("storyboard: script text is empty");
  const mode = options.mode ?? "script";
  const system = getSplitPrompt(mode, options.customPrompt);

  const reply = await complete(system, text);
  const items = parseJsonArrayFromText(reply);
  if (items.length === 0) {
    throw new Error("storyboard: model returned no usable shots");
  }
  return items.map((item, idx) => shotFromItem(item, idx, options.defaults));
}
