import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  text: z.string(),
  mode: z.enum(["encode", "decode"]).default("encode"),
});

export type HtmlEntitiesInput = z.infer<typeof InputSchema>;

export interface HtmlEntitiesOutput {
  readonly result: string;
  readonly mode: "encode" | "decode";
}

const ENCODE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function encodeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ENCODE_MAP[ch] ?? ch);
}

function decodeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function run(input: HtmlEntitiesInput): HtmlEntitiesOutput {
  const mode = input.mode ?? "encode";
  return {
    mode,
    result: mode === "encode" ? encodeHtml(input.text) : decodeHtml(input.text),
  };
}

export const htmlEntitiesTool: ForgeToolDefinition<HtmlEntitiesInput, HtmlEntitiesOutput> = {
  id: "codec/html-entities",
  slug: "html-entities",
  category: "codec",
  title: { zh: "HTML 实体转义", en: "HTML Entities" },
  description: {
    zh: "HTML 特殊字符转义与反转义",
    en: "Escape and unescape HTML entities",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.html_entities",
  engine: {
    name: "text-utils",
    upstream: "nebutra pure TS entity map",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "html转义,html实体编码",
    en: "html entity encode decode",
  },
  inputSchema: InputSchema,
  execute: run,
  unitCost: 0,
};
