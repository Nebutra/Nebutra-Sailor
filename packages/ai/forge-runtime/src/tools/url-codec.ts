import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
  mode: z.enum(["encode", "decode"]).default("encode"),
});

export type UrlCodecInput = z.infer<typeof InputSchema>;

export interface UrlCodecOutput {
  readonly result: string;
  readonly mode: "encode" | "decode";
}

function runUrlCodec(input: UrlCodecInput): UrlCodecOutput {
  const mode = input.mode ?? "encode";
  if (mode === "encode") {
    return { mode, result: encodeURIComponent(input.text) };
  }
  return { mode, result: decodeURIComponent(input.text) };
}

export const urlCodecTool: ForgeToolDefinition<UrlCodecInput, UrlCodecOutput> = {
  id: "codec/url",
  slug: "url-encode",
  category: "codec",
  title: { zh: "URL 编码解码", en: "URL Encode/Decode" },
  description: {
    zh: "application/x-www-form-urlencoded 风格编解码",
    en: "Percent-encode and decode URL components",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.url",
  engine: {
    name: "std-uri",
    upstream: "encodeURIComponent / decodeURIComponent",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "url编码,url解码在线",
    en: "url encode decode online",
  },
  inputSchema: InputSchema,
  execute: runUrlCodec,
  unitCost: 0,
};
