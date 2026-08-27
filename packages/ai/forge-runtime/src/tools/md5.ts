import { createHash } from "node:crypto";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
});

export type Md5Input = z.infer<typeof InputSchema>;

export interface Md5Output {
  readonly hex: string;
  readonly algorithm: "md5";
}

export const md5Tool: ForgeToolDefinition<Md5Input, Md5Output> = {
  id: "hash/md5",
  slug: "md5",
  category: "hash",
  title: { zh: "MD5", en: "MD5 Hash" },
  description: {
    zh: "计算文本 MD5（仅校验/兼容，勿用于密码存储）",
    en: "Compute MD5 hex digest (legacy checksum only)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.hash.md5",
  engine: {
    name: "node-crypto",
    upstream: "node:crypto createHash('md5')",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "md5在线加密",
    en: "md5 hash online",
  },
  inputSchema: InputSchema,
  execute: (input) => ({
    algorithm: "md5" as const,
    hex: createHash("md5").update(input.text, "utf8").digest("hex"),
  }),
  unitCost: 0,
};
