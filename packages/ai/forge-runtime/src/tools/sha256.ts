import { createHash } from "node:crypto";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
});

export type Sha256Input = z.infer<typeof InputSchema>;

export interface Sha256Output {
  readonly hex: string;
  readonly algorithm: "sha256";
}

export const sha256Tool: ForgeToolDefinition<Sha256Input, Sha256Output> = {
  id: "hash/sha256",
  slug: "sha256",
  category: "hash",
  title: { zh: "SHA-256", en: "SHA-256 Hash" },
  description: {
    zh: "计算文本的 SHA-256 十六进制摘要",
    en: "Compute SHA-256 hex digest of text",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.hash.sha256",
  engine: {
    name: "node-crypto",
    upstream: "node:crypto createHash (Web Crypto on client later)",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "sha256在线,哈希计算",
    en: "sha256 hash online",
  },
  inputSchema: InputSchema,
  execute: (input) => ({
    algorithm: "sha256" as const,
    hex: createHash("sha256").update(input.text, "utf8").digest("hex"),
  }),
  unitCost: 0,
};
