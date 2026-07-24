/**
 * Unit converters — one engine, many SEO landing pages.
 * Formulas from standard SI conversion tables (physics.nist / common engineering).
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

type UnitMap = Record<string, number>; // factor to base unit

interface UnitFamily {
  id: string;
  slug: string;
  category: "unit";
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  seoKeywords: { zh: string; en: string };
  units: UnitMap;
  defaultFrom: string;
  defaultTo: string;
}

const FAMILIES: readonly UnitFamily[] = [
  {
    id: "unit/length",
    slug: "length",
    category: "unit",
    title: { zh: "长度换算", en: "Length Converter" },
    description: { zh: "米/千米/厘米/英寸/英尺/码/英里", en: "m km cm inch ft yd mile" },
    seoKeywords: { zh: "长度换算,米转英尺,英寸转厘米", en: "length converter meters feet inches" },
    units: {
      m: 1,
      km: 1000,
      cm: 0.01,
      mm: 0.001,
      in: 0.0254,
      ft: 0.3048,
      yd: 0.9144,
      mi: 1609.344,
      nmi: 1852,
    },
    defaultFrom: "m",
    defaultTo: "ft",
  },
  {
    id: "unit/weight",
    slug: "weight",
    category: "unit",
    title: { zh: "重量换算", en: "Weight Converter" },
    description: { zh: "千克/克/磅/盎司/吨", en: "kg g lb oz ton" },
    seoKeywords: { zh: "重量换算,公斤转磅,kg to lb", en: "weight converter kg to lb" },
    units: {
      kg: 1,
      g: 0.001,
      mg: 0.000001,
      lb: 0.45359237,
      oz: 0.028349523125,
      t: 1000,
      st: 6.35029318,
    },
    defaultFrom: "kg",
    defaultTo: "lb",
  },
  {
    id: "unit/temperature",
    slug: "temperature",
    category: "unit",
    title: { zh: "温度换算", en: "Temperature Converter" },
    description: { zh: "摄氏/华氏/开尔文", en: "Celsius Fahrenheit Kelvin" },
    seoKeywords: { zh: "温度换算,摄氏度转华氏", en: "celsius to fahrenheit converter" },
    // special-cased in execute (not linear through zero the same way)
    units: { C: 1, F: 1, K: 1 },
    defaultFrom: "C",
    defaultTo: "F",
  },
  {
    id: "unit/area",
    slug: "area",
    category: "unit",
    title: { zh: "面积换算", en: "Area Converter" },
    description: { zh: "平方米/公顷/亩/平方英尺", en: "m² hectare mu ft²" },
    seoKeywords: { zh: "面积换算,亩换算平方米", en: "area converter square meters" },
    units: {
      m2: 1,
      km2: 1_000_000,
      ha: 10_000,
      mu: 666.666666667,
      ft2: 0.09290304,
      acre: 4046.8564224,
    },
    defaultFrom: "m2",
    defaultTo: "mu",
  },
  {
    id: "unit/speed",
    slug: "speed",
    category: "unit",
    title: { zh: "速度换算", en: "Speed Converter" },
    description: { zh: "m/s · km/h · mph · kn", en: "m/s km/h mph knots" },
    seoKeywords: { zh: "速度换算,kmh转mph", en: "speed converter kmh mph" },
    units: {
      "m/s": 1,
      "km/h": 1 / 3.6,
      mph: 0.44704,
      kn: 0.514444,
      "ft/s": 0.3048,
    },
    defaultFrom: "km/h",
    defaultTo: "mph",
  },
  {
    id: "unit/volume",
    slug: "volume",
    category: "unit",
    title: { zh: "体积换算", en: "Volume Converter" },
    description: { zh: "升/毫升/加仑/立方米", en: "L mL gallon m³" },
    seoKeywords: { zh: "体积换算,升转加仑", en: "volume converter liter gallon" },
    units: {
      L: 0.001,
      mL: 0.000001,
      m3: 1,
      gal_us: 0.003785411784,
      gal_uk: 0.00454609,
      cup_us: 0.0002365882365,
    },
    defaultFrom: "L",
    defaultTo: "gal_us",
  },
];

function convertTemperature(value: number, from: string, to: string): number {
  let c: number;
  switch (from) {
    case "C":
      c = value;
      break;
    case "F":
      c = ((value - 32) * 5) / 9;
      break;
    case "K":
      c = value - 273.15;
      break;
    default:
      throw new Error(`Unknown temperature unit: ${from}`);
  }
  switch (to) {
    case "C":
      return c;
    case "F":
      return (c * 9) / 5 + 32;
    case "K":
      return c + 273.15;
    default:
      throw new Error(`Unknown temperature unit: ${to}`);
  }
}

function makeUnitTool(family: UnitFamily): AnyForgeToolDefinition {
  const unitKeys = Object.keys(family.units) as [string, ...string[]];
  return {
    id: family.id,
    slug: family.slug,
    category: family.category,
    title: family.title,
    description: family.description,
    tier: "core" as const,
    sideEffect: "pure" as const,
    runtime: ["client", "server"] as const,
    meterId: `forge.${family.id.replace("/", ".")}`,
    engine: {
      name: "si-unit-tables",
      upstream: "NIST / SI conversion factors",
      version: "1.0.0",
    },
    seoKeywords: family.seoKeywords,
    sotaStatus: "production" as const,
    inputSchema: z.object({
      value: z.number(),
      from: z.enum(unitKeys).default(family.defaultFrom as (typeof unitKeys)[number]),
      to: z.enum(unitKeys).default(family.defaultTo as (typeof unitKeys)[number]),
    }),
    execute: (input: { value: number; from?: string; to?: string }) => {
      const from = input.from ?? family.defaultFrom;
      const to = input.to ?? family.defaultTo;
      if (!(from in family.units) || !(to in family.units)) {
        throw new Error(`Unsupported unit: ${from} → ${to}`);
      }
      let result: number;
      if (family.slug === "temperature") {
        result = convertTemperature(input.value, from, to);
      } else {
        const base = input.value * (family.units[from] as number);
        result = base / (family.units[to] as number);
      }
      return {
        result,
        from,
        to,
        units: unitKeys,
        engine: "si-unit-tables",
      };
    },
    unitCost: 0,
  } as AnyForgeToolDefinition;
}

export const unitConvertTools: readonly AnyForgeToolDefinition[] = FAMILIES.map(makeUnitTool);
