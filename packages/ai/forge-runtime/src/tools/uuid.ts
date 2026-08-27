import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  count: z.number().int().min(1).max(100).default(1),
});

export type UuidInput = z.infer<typeof InputSchema>;

export interface UuidOutput {
  readonly uuids: readonly string[];
  readonly version: 4;
}

export const uuidTool: ForgeToolDefinition<UuidInput, UuidOutput> = {
  id: "dev/uuid",
  slug: "uuid",
  category: "dev",
  title: { zh: "UUID 生成器", en: "UUID Generator" },
  description: {
    zh: "生成 UUID v4 标识符",
    en: "Generate UUID v4 identifiers",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.uuid",
  roots: ["generator"],
  engine: {
    name: "std-uuid",
    upstream: "crypto.randomUUID",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "uuid生成器,在线uuid,guid生成",
    en: "uuid generator, guid generator online",
  },
  inputSchema: InputSchema,
  execute: (input) => {
    const count = input.count ?? 1;
    return {
      version: 4 as const,
      uuids: Array.from({ length: count }, () => randomUUID()),
    };
  },
  unitCost: 0,
};
