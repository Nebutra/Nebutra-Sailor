/**
 * Novel → compressed chunks → scene units — ViMax-distinct IP, re-expressed.
 *
 * Long-form adaptation: compress chapters (preserving plot/character) then
 * segment into filmable scenes. Both steps are model calls — injected via a
 * `CompleteFn` (the same injection shape `@nebutra/reel/storyboard` uses, so
 * callers wire it to `@nebutra/agents` once). RAG retrieval, when used, is
 * supplied by `@nebutra/knowledge-rag` through the same injection — not a
 * hard dependency here.
 */

import { CinemaError } from "./errors";

/** Injected model call: prompt in, completion text out. */
export type CompleteFn = (prompt: string) => Promise<string>;

/** Compress each chunk independently; order is preserved. */
export async function compressNovel(
  chunks: readonly string[],
  complete: CompleteFn,
): Promise<string[]> {
  return Promise.all(
    chunks.map((chunk) =>
      complete(
        `Compress this passage, preserving plot, character and emotional ` +
          `beats; output prose only:\n\n${chunk}`,
      ),
    ),
  );
}

/**
 * Extract ordered scene units from compressed text. The model is asked for a
 * JSON array of scene strings; parsing tolerates surrounding prose but a
 * non-array response is a hard error (a silent empty list would drop story).
 */
export async function extractScenes(compressed: string, complete: CompleteFn): Promise<string[]> {
  const raw = await complete(
    `Split the following into a JSON array of self-contained, filmable ` +
      `scene descriptions in narrative order. Output ONLY the array:\n\n${compressed}`,
  );
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed: unknown = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        return parsed as string[];
      }
    } catch {
      // fall through to the structured error below
    }
  }
  throw new CinemaError("Scene extraction did not return a JSON string array.", {
    code: "CINEMA_SCENE_PARSE",
    suggestion:
      "Constrain the model to emit a JSON array of strings (use a schema / " +
      "response-format), or retry — output was not parseable.",
  });
}
