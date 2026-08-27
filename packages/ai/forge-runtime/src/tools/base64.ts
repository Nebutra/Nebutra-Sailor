import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
  mode: z.enum(["encode", "decode"]).default("encode"),
});

export type Base64Input = z.infer<typeof InputSchema>;

export interface Base64Output {
  readonly result: string;
  readonly mode: "encode" | "decode";
}

function runBase64(input: Base64Input): Base64Output {
  const mode = input.mode ?? "encode";
  if (mode === "encode") {
    return {
      mode,
      result: Buffer.from(input.text, "utf8").toString("base64"),
    };
  }
  try {
    return {
      mode,
      result: Buffer.from(input.text, "base64").toString("utf8"),
    };
  } catch {
    throw new Error("Invalid Base64 input");
  }
}

export const base64Tool: ForgeToolDefinition<Base64Input, Base64Output> = {
  id: "codec/base64",
  slug: "base64",
  category: "codec",
  title: { zh: "Base64 编码解码", en: "Base64 Encode/Decode" },
  description: {
    zh: "UTF-8 文本与 Base64 互转",
    en: "Convert UTF-8 text to/from Base64",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.base64",
  engine: {
    name: "std-buffer",
    upstream: "Node/Web standard base64",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "base64编码,base64解码在线",
    en: "base64 encode decode online",
  },
  inputSchema: InputSchema,
  execute: runBase64,
  unitCost: 0,
};
