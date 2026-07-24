/**
 * Life / office calculators — mortgage (等额本息/本金), kinship (轻量).
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

export const mortgageTool = tool({
  id: "life/mortgage",
  slug: "mortgage",
  category: "life",
  title: { zh: "房贷计算", en: "Mortgage Calculator" },
  description: {
    zh: "等额本息 / 等额本金月供与总利息",
    en: "Equal installment / principal mortgage schedule summary",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.life.mortgage",
  engine: {
    name: "mortgage-formulas",
    upstream: "standard amortization formulas (PMT)",
    version: "1.0.0",
  },
  seoKeywords: { zh: "房贷计算器,等额本息计算", en: "mortgage calculator amortization" },
  sotaStatus: "production",
  inputSchema: z.object({
    principal: z.number().positive(),
    annualRatePercent: z.number().min(0).max(100),
    years: z.number().positive().max(50),
    method: z.enum(["equal_installment", "equal_principal"]).default("equal_installment"),
  }),
  execute: (input: {
    principal: number;
    annualRatePercent: number;
    years: number;
    method?: "equal_installment" | "equal_principal";
  }) => {
    const method = input.method ?? "equal_installment";
    const n = Math.round(input.years * 12);
    const monthlyRate = input.annualRatePercent / 100 / 12;
    const P = input.principal;

    if (method === "equal_installment") {
      if (monthlyRate === 0) {
        const monthly = P / n;
        return {
          method,
          months: n,
          monthlyPayment: round2(monthly),
          totalPayment: round2(P),
          totalInterest: 0,
        };
      }
      const factor = (monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1);
      const monthly = P * factor;
      const totalPayment = monthly * n;
      return {
        method,
        months: n,
        monthlyPayment: round2(monthly),
        totalPayment: round2(totalPayment),
        totalInterest: round2(totalPayment - P),
      };
    }

    // equal principal
    const monthlyPrincipal = P / n;
    let totalInterest = 0;
    let firstMonth = 0;
    let lastMonth = 0;
    for (let i = 0; i < n; i++) {
      const remain = P - monthlyPrincipal * i;
      const interest = remain * monthlyRate;
      const payment = monthlyPrincipal + interest;
      totalInterest += interest;
      if (i === 0) firstMonth = payment;
      if (i === n - 1) lastMonth = payment;
    }
    return {
      method,
      months: n,
      firstMonthPayment: round2(firstMonth),
      lastMonthPayment: round2(lastMonth),
      monthlyPrincipal: round2(monthlyPrincipal),
      totalPayment: round2(P + totalInterest),
      totalInterest: round2(totalInterest),
    };
  },
});

/** Minimal kinship map for common CN queries (not full 亲戚称呼 engine). */
const KINSHIP: Record<string, string> = {
  爸爸的爸爸: "爷爷",
  爸爸的妈妈: "奶奶",
  妈妈的爸爸: "外公",
  妈妈的妈妈: "外婆",
  爸爸的兄弟: "伯父/叔叔",
  爸爸的姐妹: "姑妈",
  妈妈的兄弟: "舅舅",
  妈妈的姐妹: "姨妈",
  兄弟的儿子: "侄子",
  兄弟的女儿: "侄女",
  姐妹的儿子: "外甥",
  姐妹的女儿: "外甥女",
  配偶的爸爸: "公公/岳父",
  配偶的妈妈: "婆婆/岳母",
};

export const kinshipTool = tool({
  id: "life/kinship",
  slug: "kinship",
  category: "life",
  title: { zh: "亲戚称呼", en: "Chinese Kinship Title" },
  description: {
    zh: "常见中文亲戚称呼查询（实验：轻量词典，非完整引擎）",
    en: "Common Chinese kinship titles (lab: dictionary only, not full engine)",
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.life.kinship",
  engine: {
    name: "kinship-dict",
    upstream: "curated common-relation dictionary",
    version: "0.1.0",
  },
  seoKeywords: { zh: "亲戚称呼,三舅的儿子叫什么", en: "chinese kinship calculator" },
  sotaStatus: "lab",
  inputSchema: z.object({
    relation: z.string().min(1).max(80),
  }),
  execute: (input: { relation: string }) => {
    const key = input.relation.replace(/\s+/g, "");
    const hit = KINSHIP[key];
    if (hit) {
      return { result: hit, matched: true, engine: "kinship-dict" };
    }
    // soft fuzzy: direct contains
    for (const [k, v] of Object.entries(KINSHIP)) {
      if (key.includes(k) || k.includes(key)) {
        return { result: v, matched: true, hint: k, engine: "kinship-dict" };
      }
    }
    return {
      result: null,
      matched: false,
      suggestions: Object.keys(KINSHIP).slice(0, 8),
      note: "未命中常见词条。可扩展专用亲戚称呼引擎。",
      engine: "kinship-dict",
    };
  },
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const lifeExtraTools: readonly AnyForgeToolDefinition[] = [mortgageTool, kinshipTool];
