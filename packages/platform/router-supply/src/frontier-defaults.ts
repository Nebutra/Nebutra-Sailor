/**
 * Snapshot of public model ids for Router alias defaults.
 *
 * SSOT for the full frontier catalog remains `packages/ai/ai-providers/src/frontier.ts`.
 * This package is published standalone and must not import the private
 * `@nebutra/ai-providers` package. When frontier bare ids change, update both.
 */

/** Bare id when the client omits `model`. */
export const DEFAULT_PUBLIC_MODEL = "gpt-5.6-luna";

/** Public face ids used to seed lab alias table rows. */
export const ROUTER_PUBLIC_MODEL_IDS: readonly string[] = [
  "gpt-5.6-luna",
  "gpt-5.6-terra",
  "gpt-5.6-sol",
  "gpt-image-2",
  "claude-sonnet-5",
  "claude-fable-5",
  "claude-opus-4.8",
  "claude-haiku-4.5",
  "gemini-3.6-flash",
  "gemini-3.1-pro",
  "deepseek-v4-flash",
  "deepseek-v4-pro",
];
