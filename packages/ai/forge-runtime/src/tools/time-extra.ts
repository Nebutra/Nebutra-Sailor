/**
 * Time tools — cron-parser, dayjs timezone, lunar-javascript.
 */
import { CronExpressionParser } from "cron-parser";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
// lunar-javascript has no published types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — untyped package
import { Lunar, Solar } from "lunar-javascript";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

export const cronExplainTool = tool({
  id: "time/cron-explain",
  slug: "cron-explain",
  category: "time",
  title: { zh: "Cron 解析", en: "Cron Explainer" },
  description: {
    zh: "cron-parser 解析表达式与下次触发时间",
    en: "Parse cron and list next run times",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.time.cron_explain",
  engine: {
    name: "cron-parser",
    upstream: "https://github.com/harrisiirak/cron-parser",
    version: "5.x",
  },
  seoKeywords: { zh: "cron表达式,cron在线解析", en: "cron expression parser online" },
  sotaStatus: "production",
  inputSchema: z.object({
    expression: z.string().min(1).max(200),
    count: z.number().int().min(1).max(20).default(5),
    tz: z.string().default("UTC"),
  }),
  execute: (input: { expression: string; count?: number; tz?: string }) => {
    const count = input.count ?? 5;
    const tz = input.tz ?? "UTC";
    try {
      const interval = CronExpressionParser.parse(input.expression, { tz });
      const next: string[] = [];
      for (let i = 0; i < count; i++) {
        const d = interval.next().toDate();
        next.push(d.toISOString());
      }
      return {
        expression: input.expression,
        tz,
        next,
        engine: "cron-parser",
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  },
});

export const timezoneTool = tool({
  id: "time/timezone",
  slug: "timezone",
  category: "time",
  title: { zh: "时区转换", en: "Timezone Converter" },
  description: { zh: "dayjs 时区互转", en: "Convert times across timezones with dayjs" },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.time.timezone",
  engine: { name: "dayjs", upstream: "https://github.com/iamkun/dayjs", version: "1.x" },
  seoKeywords: { zh: "时区转换,世界时间转换", en: "timezone converter online" },
  sotaStatus: "production",
  inputSchema: z.object({
    datetime: z.string().min(1).max(80),
    fromTz: z.string().default("UTC"),
    toTz: z.string().default("Asia/Shanghai"),
    format: z.string().default("YYYY-MM-DD HH:mm:ss Z"),
  }),
  execute: (input: { datetime: string; fromTz?: string; toTz?: string; format?: string }) => {
    const fromTz = input.fromTz ?? "UTC";
    const toTz = input.toTz ?? "Asia/Shanghai";
    const format = input.format ?? "YYYY-MM-DD HH:mm:ss Z";
    const parsed = dayjs.tz(input.datetime, fromTz);
    if (!parsed.isValid()) {
      // try ISO / unix seconds / ms
      const asNum = Number(input.datetime);
      const fallback =
        Number.isFinite(asNum) && input.datetime.trim() !== ""
          ? dayjs.unix(asNum > 1e12 ? asNum / 1000 : asNum).tz(fromTz)
          : dayjs(input.datetime).tz(fromTz);
      if (!fallback.isValid()) throw new Error("Invalid datetime");
      const converted = fallback.tz(toTz);
      return {
        result: converted.format(format),
        iso: converted.toISOString(),
        unix: converted.unix(),
        fromTz,
        toTz,
        engine: "dayjs",
      };
    }
    const converted = parsed.tz(toTz);
    return {
      result: converted.format(format),
      iso: converted.toISOString(),
      unix: converted.unix(),
      fromTz,
      toTz,
      engine: "dayjs",
    };
  },
});

export const lunarTool = tool({
  id: "time/lunar",
  slug: "lunar",
  category: "time",
  title: { zh: "公历农历转换", en: "Solar ↔ Lunar Calendar" },
  description: { zh: "lunar-javascript 公历农历互转", en: "Convert solar and lunar dates" },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.time.lunar",
  engine: {
    name: "lunar-javascript",
    upstream: "https://github.com/6tail/lunar-javascript",
    version: "1.x",
  },
  seoKeywords: { zh: "农历转换,公历转农历", en: "lunar calendar converter online" },
  sotaStatus: "production",
  inputSchema: z.object({
    mode: z.enum(["solar_to_lunar", "lunar_to_solar"]).default("solar_to_lunar"),
    year: z.number().int().min(1900).max(2100),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    isLeap: z.boolean().default(false),
  }),
  execute: (input: {
    mode?: "solar_to_lunar" | "lunar_to_solar";
    year: number;
    month: number;
    day: number;
    isLeap?: boolean;
  }) => {
    const mode = input.mode ?? "solar_to_lunar";
    if (mode === "solar_to_lunar") {
      const solar = Solar.fromYmd(input.year, input.month, input.day);
      const lunar = solar.getLunar();
      return {
        mode,
        solar: solar.toYmd(),
        lunar: lunar.toString(),
        lunarYmd: `${lunar.getYear()}-${lunar.getMonth()}-${lunar.getDay()}`,
        ganZhi: lunar.getYearInGanZhi(),
        festival: lunar.getFestivals?.() ?? [],
        engine: "lunar-javascript",
      };
    }
    // lunar-javascript uses negative month for leap months
    const month = input.isLeap ? -Math.abs(input.month) : input.month;
    const lunar = Lunar.fromYmd(input.year, month, input.day);
    const solar = lunar.getSolar();
    return {
      mode,
      lunar: lunar.toString(),
      solar: solar.toYmd(),
      week: solar.getWeekInChinese?.() ?? solar.getWeek(),
      engine: "lunar-javascript",
    };
  },
});

export const timeExtraTools: readonly AnyForgeToolDefinition[] = [
  cronExplainTool,
  timezoneTool,
  lunarTool,
];
