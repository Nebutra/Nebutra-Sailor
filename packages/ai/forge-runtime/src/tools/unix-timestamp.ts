import { z } from "zod";
import type { ForgeToolDefinition } from "../types";

const InputSchema = z.object({
  mode: z.enum(["now", "to_date", "to_unix"]).default("now"),
  value: z.union([z.string(), z.number()]).optional(),
  unit: z.enum(["seconds", "milliseconds"]).default("seconds"),
});

export type UnixTimestampInput = z.infer<typeof InputSchema>;

export interface UnixTimestampOutput {
  readonly unixSeconds: number;
  readonly unixMilliseconds: number;
  readonly iso: string;
  readonly mode: "now" | "to_date" | "to_unix";
}

function runUnixTimestamp(input: UnixTimestampInput): UnixTimestampOutput {
  const mode = input.mode ?? "now";
  const unit = input.unit ?? "seconds";

  if (mode === "now") {
    const ms = Date.now();
    return {
      mode,
      unixMilliseconds: ms,
      unixSeconds: Math.floor(ms / 1000),
      iso: new Date(ms).toISOString(),
    };
  }

  if (mode === "to_date") {
    if (input.value === undefined || input.value === "") {
      throw new Error("value is required for to_date mode");
    }
    const raw = typeof input.value === "number" ? input.value : Number(input.value);
    if (!Number.isFinite(raw)) {
      throw new Error("value must be a finite unix timestamp");
    }
    const ms = unit === "seconds" ? raw * 1000 : raw;
    return {
      mode,
      unixMilliseconds: ms,
      unixSeconds: Math.floor(ms / 1000),
      iso: new Date(ms).toISOString(),
    };
  }

  if (input.value === undefined || input.value === "") {
    throw new Error("value is required for to_unix mode");
  }
  const date = new Date(String(input.value));
  if (Number.isNaN(date.getTime())) {
    throw new Error("value must be a parseable date string");
  }
  const ms = date.getTime();
  return {
    mode: "to_unix",
    unixMilliseconds: ms,
    unixSeconds: Math.floor(ms / 1000),
    iso: date.toISOString(),
  };
}

export const unixTimestampTool: ForgeToolDefinition<UnixTimestampInput, UnixTimestampOutput> = {
  id: "time/unix-timestamp",
  slug: "unix-timestamp",
  category: "time",
  title: { zh: "Unix 时间戳", en: "Unix Timestamp" },
  description: {
    zh: "当前时间戳与日期互转",
    en: "Convert between unix timestamps and ISO dates",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.time.unix_timestamp",
  engine: {
    name: "std-date",
    upstream: "ECMAScript Date",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "时间戳转换,unix时间戳在线",
    en: "unix timestamp converter online",
  },
  inputSchema: InputSchema,
  execute: runUnixTimestamp,
  unitCost: 0,
};
