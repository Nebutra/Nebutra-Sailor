/**
 * Codec extras — unicode, query-string, image-base64 metadata.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

export const unicodeTool = tool({
  id: "codec/unicode",
  slug: "unicode",
  category: "codec",
  title: { zh: "Unicode 转换", en: "Unicode Convert" },
  description: { zh: "文本 ⇄ Unicode 转义 / 码点", en: "Text ↔ Unicode escapes / code points" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.unicode",
  engine: { name: "std-unicode", upstream: "ECMAScript String code points", version: "1.0.0" },
  seoKeywords: { zh: "unicode转换,unicode编码在线", en: "unicode converter online" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    mode: z.enum(["to_escape", "from_escape", "code_points"]).default("to_escape"),
  }),
  execute: (input: { text: string; mode?: "to_escape" | "from_escape" | "code_points" }) => {
    const mode = input.mode ?? "to_escape";
    if (mode === "to_escape") {
      let result = "";
      for (const ch of input.text) {
        const cp = ch.codePointAt(0) ?? 0;
        result +=
          cp > 0xffff ? `\\u{${cp.toString(16)}}` : `\\u${cp.toString(16).padStart(4, "0")}`;
      }
      return { result, mode, engine: "std-unicode" };
    }
    if (mode === "from_escape") {
      const result = input.text
        .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
      return { result, mode, engine: "std-unicode" };
    }
    const points = [...input.text].map((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return { char: ch, hex: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`, dec: cp };
    });
    return { points, mode, engine: "std-unicode" };
  },
});

export const queryStringTool = tool({
  id: "codec/query-string",
  slug: "query-string",
  category: "codec",
  title: { zh: "QueryString 解析", en: "Query String Parse" },
  description: { zh: "URL 查询串解析 / 序列化", en: "Parse and serialize URL query strings" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.codec.query_string",
  engine: { name: "URLSearchParams", upstream: "WHATWG URL API", version: "runtime" },
  seoKeywords: { zh: "querystring解析,url参数解析", en: "query string parser online" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string(),
    mode: z.enum(["parse", "stringify"]).default("parse"),
  }),
  execute: (input: { text: string; mode?: "parse" | "stringify" }) => {
    const mode = input.mode ?? "parse";
    if (mode === "parse") {
      const raw = input.text.includes("?")
        ? (input.text.split("?").pop() ?? input.text)
        : input.text;
      const params = new URLSearchParams(raw);
      const obj: Record<string, string | string[]> = {};
      for (const key of new Set(params.keys())) {
        const all = params.getAll(key);
        obj[key] = all.length <= 1 ? (all[0] ?? "") : all;
      }
      return { result: obj, json: JSON.stringify(obj, null, 2), mode, engine: "URLSearchParams" };
    }
    const data: unknown = JSON.parse(input.text);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("stringify mode expects a JSON object");
    }
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        for (const item of v) params.append(k, String(item));
      } else if (v != null) {
        params.set(k, String(v));
      }
    }
    return { result: params.toString(), mode, engine: "URLSearchParams" };
  },
});

export const imageBase64Tool = tool({
  id: "codec/image-base64",
  slug: "image-base64",
  category: "codec",
  title: { zh: "图片 Base64", en: "Image ↔ Base64" },
  description: {
    zh: "图片 Base64 编码信息（服务端解析 data URL）",
    en: "Inspect/encode image Base64 payloads",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.codec.image_base64",
  engine: { name: "Buffer", upstream: "Node Buffer", version: "runtime" },
  seoKeywords: { zh: "图片转base64,base64转图片", en: "image to base64 online" },
  sotaStatus: "production",
  inputSchema: z.object({
    imageBase64: z.string().min(1),
    mode: z.enum(["inspect", "to_data_url"]).default("inspect"),
    mime: z.string().default("image/png"),
  }),
  execute: (input: { imageBase64: string; mode?: "inspect" | "to_data_url"; mime?: string }) => {
    const mode = input.mode ?? "inspect";
    const hasPrefix = input.imageBase64.includes(",");
    const mimeFromData = hasPrefix
      ? (input.imageBase64.match(/^data:([^;]+);base64,/)?.[1] ?? input.mime ?? "image/png")
      : (input.mime ?? "image/png");
    const cleaned = hasPrefix
      ? (input.imageBase64.split(",").pop() ?? input.imageBase64)
      : input.imageBase64;
    const buf = Buffer.from(cleaned, "base64");
    if (mode === "to_data_url") {
      return {
        dataUrl: `data:${mimeFromData};base64,${cleaned}`,
        bytes: buf.length,
        mime: mimeFromData,
        mode,
        engine: "Buffer",
      };
    }
    return {
      bytes: buf.length,
      mime: mimeFromData,
      base64Length: cleaned.length,
      headHex: buf.subarray(0, 8).toString("hex"),
      mode,
      engine: "Buffer",
    };
  },
});

export const codecExtraTools: readonly AnyForgeToolDefinition[] = [
  unicodeTool,
  queryStringTool,
  imageBase64Tool,
];
