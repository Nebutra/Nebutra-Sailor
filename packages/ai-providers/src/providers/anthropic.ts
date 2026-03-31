import type { ProviderModel } from "./base.js";

// Note: Anthropic models generally only support chat/vision capabilities natively via prompt caching.
// Prices mapped to per-million-tokens standard.
export const ANTHROPIC_MODELS: ProviderModel[] = [
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    description:
      "Ideal balance of intelligence and speed, designed for high endurance coding and analysis.",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    capabilities: ["chat", "vision", "function-calling"],
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    description: "Most powerful model for highly complex tasks, navigating open-ended prompts.",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputPricePerMillion: 15.0,
    outputPricePerMillion: 75.0,
    capabilities: ["chat", "vision", "function-calling"],
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    description: "Fastest and most compact model for near-instant responsiveness.",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    capabilities: ["chat", "function-calling"],
  },
];
