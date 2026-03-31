import type { ProviderModel } from "./base.js";

export const GOOGLE_MODELS: ProviderModel[] = [
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Advanced model capable of reasoning through ultra-long contexts.",
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 1.25, // Prompts ≤ 128k
    outputPricePerMillion: 5.0, // Prompts ≤ 128k
    capabilities: ["chat", "vision", "function-calling", "speech-to-text"],
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Versatile, efficient multimodal model for fast text and code tasks.",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
    capabilities: ["chat", "vision", "function-calling", "speech-to-text"],
  },
  {
    id: "text-embedding-004",
    name: "Google Text Embedding 004",
    description: "Google's versatile, state of the art embedding utility.",
    contextWindow: 2048,
    inputPricePerMillion: 0.0, // Free up to limits
    outputPricePerMillion: 0.0,
    capabilities: ["embeddings"],
  },
];
