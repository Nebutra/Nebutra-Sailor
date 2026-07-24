/**
 * Chinese text tools — OpenCC (简繁) + pinyin-pro (拼音).
 */
import { Converter } from "opencc-js";
import { pinyin } from "pinyin-pro";
import { z } from "zod";
import type { AnyForgeToolDefinition, ForgeToolDefinition } from "../types";

const ZhCnTwInput = z.object({
  text: z.string(),
  mode: z.enum(["s2t", "t2s", "s2tw", "tw2s", "s2hk", "hk2s"]).default("s2t"),
});

type ZhCnTwInput = z.infer<typeof ZhCnTwInput>;

const converters: Record<ZhCnTwInput["mode"], ReturnType<typeof Converter>> = {
  s2t: Converter({ from: "cn", to: "t" }),
  t2s: Converter({ from: "t", to: "cn" }),
  s2tw: Converter({ from: "cn", to: "tw" }),
  tw2s: Converter({ from: "tw", to: "cn" }),
  s2hk: Converter({ from: "cn", to: "hk" }),
  hk2s: Converter({ from: "hk", to: "cn" }),
};

export const zhCnTwTool: ForgeToolDefinition<
  ZhCnTwInput,
  { result: string; mode: string; engine: string }
> = {
  id: "text/zh-cn-tw",
  slug: "zh-cn-tw",
  category: "text",
  title: { zh: "简繁转换", en: "Simplified ↔ Traditional Chinese" },
  description: {
    zh: "OpenCC 简体/繁体/台湾/香港字形转换",
    en: "OpenCC simplified/traditional/Taiwan/Hong Kong conversion",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.text.zh_cn_tw",
  engine: { name: "opencc-js", upstream: "https://github.com/nk2028/opencc-js", version: "1.x" },
  seoKeywords: { zh: "简繁转换,繁体字转换在线", en: "simplified traditional chinese converter" },
  sotaStatus: "production",
  inputSchema: ZhCnTwInput,
  execute: (input) => {
    const mode = input.mode ?? "s2t";
    const convert = converters[mode];
    return { result: convert(input.text), mode, engine: "opencc-js" };
  },
  unitCost: 0,
};

const PinyinInput = z.object({
  text: z.string(),
  toneType: z.enum(["symbol", "num", "none"]).default("symbol"),
  type: z.enum(["string", "array"]).default("string"),
  nonZh: z.enum(["spaced", "consecutive", "removed"]).default("spaced"),
});

export const pinyinTool: ForgeToolDefinition<
  z.infer<typeof PinyinInput>,
  { result: string | string[]; engine: string }
> = {
  id: "text/pinyin",
  slug: "pinyin",
  category: "text",
  title: { zh: "汉字转拼音", en: "Chinese to Pinyin" },
  description: {
    zh: "pinyin-pro 转拼音（声调/无调/数字调）",
    en: "Convert Chinese characters to pinyin via pinyin-pro",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.text.pinyin",
  engine: { name: "pinyin-pro", upstream: "https://github.com/zh-lx/pinyin-pro", version: "3.x" },
  seoKeywords: { zh: "汉字转拼音,拼音转换在线", en: "chinese to pinyin converter online" },
  sotaStatus: "production",
  inputSchema: PinyinInput,
  execute: (input) => {
    const toneType = input.toneType ?? "symbol";
    const type = input.type ?? "string";
    const nonZh = input.nonZh ?? "spaced";
    if (type === "array") {
      const result = pinyin(input.text, { toneType, type: "array", nonZh });
      return { result, engine: "pinyin-pro" };
    }
    const result = pinyin(input.text, { toneType, type: "string", nonZh });
    return { result, engine: "pinyin-pro" };
  },
  unitCost: 0,
};

export const textCnTools: readonly AnyForgeToolDefinition[] = [zhCnTwTool, pinyinTool];
