/**
 * Shared context for named compile presets + generic fallback.
 */

import type { Json } from "../compile-helpers";
import type { InferredRecipeHints } from "../infer-recipe";

export interface CompileContext {
  colors: Record<string, string>;
  font: Json;
  radius: Json;
  refero: Json;
  recipeHints: InferredRecipeHints;
  warnings: string[];
  id: string;
  siteName: string;
}
