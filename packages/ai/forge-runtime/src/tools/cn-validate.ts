/**
 * CN validators — 身份证校验（国标 GB 11643 算法）+ 手机号格式/运营商粗分.
 * Phone geo uses prefix table subset (expandable); not a full phone.dat dump.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CODES = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

function validateIdCard(id: string): {
  valid: boolean;
  reason?: string;
  regionCode?: string;
  birth?: string;
  gender?: "M" | "F";
} {
  const s = id.trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(s)) {
    return { valid: false, reason: "格式应为 18 位（末位可为 X）" };
  }
  const birth = `${s.slice(6, 10)}-${s.slice(10, 12)}-${s.slice(12, 14)}`;
  const birthDate = new Date(birth);
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== birth) {
    // allow local calendar edge without ISO UTC shift issues
    const y = Number(s.slice(6, 10));
    const m = Number(s.slice(10, 12));
    const d = Number(s.slice(12, 14));
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      return { valid: false, reason: "出生日期无效" };
    }
  }
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += Number(s[i]) * (WEIGHTS[i] as number);
  }
  const expected = CHECK_CODES[sum % 11];
  if (s[17] !== expected) {
    return { valid: false, reason: `校验位错误，期望 ${expected}` };
  }
  const seq = Number(s.slice(14, 17));
  return {
    valid: true,
    regionCode: s.slice(0, 6),
    birth,
    gender: seq % 2 === 0 ? "F" : "M",
  };
}

/** Major CN mobile prefix → carrier (coarse, high-coverage prefixes only). */
const CARRIER_PREFIX: Record<string, string> = {
  "134": "中国移动",
  "135": "中国移动",
  "136": "中国移动",
  "137": "中国移动",
  "138": "中国移动",
  "139": "中国移动",
  "147": "中国移动",
  "150": "中国移动",
  "151": "中国移动",
  "152": "中国移动",
  "157": "中国移动",
  "158": "中国移动",
  "159": "中国移动",
  "178": "中国移动",
  "182": "中国移动",
  "183": "中国移动",
  "184": "中国移动",
  "187": "中国移动",
  "188": "中国移动",
  "198": "中国移动",
  "130": "中国联通",
  "131": "中国联通",
  "132": "中国联通",
  "145": "中国联通",
  "155": "中国联通",
  "156": "中国联通",
  "166": "中国联通",
  "175": "中国联通",
  "176": "中国联通",
  "185": "中国联通",
  "186": "中国联通",
  "133": "中国电信",
  "149": "中国电信",
  "153": "中国电信",
  "173": "中国电信",
  "177": "中国电信",
  "180": "中国电信",
  "181": "中国电信",
  "189": "中国电信",
  "191": "中国电信",
  "199": "中国电信",
  "190": "中国广电",
  "192": "中国广电",
};

export const idCardTool = tool({
  id: "cn/id-card",
  slug: "id-card",
  category: "cn",
  title: { zh: "身份证校验", en: "China ID Card Validate" },
  description: {
    zh: "GB 11643 校验位与出生日期/性别解析（不查库）",
    en: "Validate CN resident ID check digit (GB 11643)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.cn.id_card",
  engine: {
    name: "gb11643",
    upstream: "GB 11643-1999 check digit algorithm",
    version: "1.0.0",
  },
  seoKeywords: { zh: "身份证校验,身份证号码验证", en: "china id card validator" },
  inputSchema: z.object({
    id: z.string().min(15).max(18),
  }),
  execute: (input: { id: string }) => {
    const result = validateIdCard(input.id);
    return { ...result, engine: "gb11643" };
  },
});

export const phoneLookupTool = tool({
  id: "cn/phone-lookup",
  slug: "phone-lookup",
  category: "cn",
  title: { zh: "手机号归属粗查", en: "CN Mobile Prefix Lookup" },
  description: {
    zh: "号段校验 + 运营商粗分（实验：非完整归属地库）",
    en: "Validate CN mobile format and coarse carrier (lab: not a full geo DB)",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.cn.phone_lookup",
  engine: {
    name: "cn-mobile-prefix",
    upstream: "public CN mobile prefix tables (subset)",
    version: "0.1.0",
  },
  seoKeywords: { zh: "手机号归属地,手机号运营商查询", en: "china mobile number lookup" },
  inputSchema: z.object({
    phone: z.string().min(7).max(20),
  }),
  execute: (input: { phone: string }) => {
    const digits = input.phone.replace(/\D/g, "");
    const normalized = digits.startsWith("86") && digits.length === 13 ? digits.slice(2) : digits;
    if (!/^1\d{10}$/.test(normalized)) {
      return {
        valid: false,
        reason: "需 11 位中国大陆手机号",
        engine: "cn-mobile-prefix",
      };
    }
    const prefix3 = normalized.slice(0, 3);
    const carrier = CARRIER_PREFIX[prefix3] ?? "未知/虚拟/新号段";
    return {
      valid: true,
      phone: normalized,
      prefix: prefix3,
      carrier,
      note: "仅运营商粗分，完整省市归属地需 phone.dat 类离线库。",
      engine: "cn-mobile-prefix",
    };
  },
});

export const cnValidateTools: readonly AnyForgeToolDefinition[] = [idCardTool, phoneLookupTool];
