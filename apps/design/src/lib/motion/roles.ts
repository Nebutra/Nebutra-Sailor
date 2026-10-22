/**
 * The motion tokens as the Motion pages need them, read from the token model.
 *
 * Server-only (the model reads the DTCG files). Nothing here restates a value:
 * roles, springs, staggers and distances are read out of the source, so a token
 * that changes in `core.json` / `semantic.json` changes on the page at the next
 * build. The one thing derived here is `var()` resolution for display, because
 * a role is authored as `var(--motion-duration-reveal)` — a reference, so a
 * Brand Package that moves the rail moves the role — and a reader wants to see
 * the number it lands on.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { group, type SimpleToken, SOURCE_FILES, tokenSet } from "@/lib/tokens";
import { PRESET_NAMES, type PresetName, type SpringParams } from "./spring";

export const ROLE_IDS = ["enter", "exit", "swap", "shared", "press"] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export interface TokenFact {
  /** CSS custom property, with `--`. */
  cssVar: string;
  /** As authored, `var()` intact. */
  authored: string;
  /** After following every `var()` to a literal, for display. */
  value: string;
}

export interface RoleSpec {
  id: RoleId;
  description: string;
  duration: TokenFact;
  easing: TokenFact;
  distance: TokenFact;
  /** Only `press` carries a scale. */
  scale: TokenFact | null;
}

const light = () => tokenSet("light");

/**
 * Follow `var()` chains to a literal. The runtime motion rails
 * (`--motion-ease-*`) live in static/base.css rather than the token tree; the
 * tree's `--ease-*` carry the same defaults, so those fall back to them.
 */
function resolveVar(name: string, seen: Set<string> = new Set()): string {
  const byVar = light().byVar;
  const bare = name.replace(/^--/, "");
  const token = byVar.get(bare) ?? byVar.get(bare.replace(/^motion-ease-/, "ease-"));
  if (!token || seen.has(bare)) return `var(${name})`;
  return resolveText(token.resolved, new Set([...seen, bare]));
}

function resolveText(text: string, seen: Set<string>): string {
  return text.replace(/var\((--[\w-]+)\)/g, (_, ref: string) => resolveVar(ref, seen));
}

function fact(cssVar: string): TokenFact {
  const token = light().byVar.get(cssVar.replace(/^--/, ""));
  if (!token) throw new Error(`[apps/design] motion token ${cssVar} is not in the token source`);
  return {
    cssVar,
    authored: token.authored,
    value: resolveText(token.resolved, new Set([cssVar.replace(/^--/, "")])),
  };
}

export function motionRoles(): RoleSpec[] {
  const descriptions = groupDescriptions();
  return ROLE_IDS.map((id) => ({
    id,
    description: descriptions.get(id) ?? "",
    duration: fact(`--motion-${id}-duration`),
    easing: fact(`--motion-${id}-easing`),
    distance: fact(`--motion-${id}-distance`),
    scale: id === "press" ? fact("--motion-press-scale") : null,
  }));
}

/**
 * A role's sentence is the `$description` of its group in semantic.json. Group
 * descriptions are not leaves, so the token model does not carry them; they are
 * read from the file rather than restated here.
 */
function groupDescriptions(): Map<string, string> {
  let dir = process.cwd();
  for (let up = 0; up < 6 && !existsSync(join(dir, SOURCE_FILES.semantic)); up += 1) {
    dir = dirname(dir);
  }
  const semantic = JSON.parse(readFileSync(join(dir, SOURCE_FILES.semantic), "utf8")) as {
    motion?: Record<string, { $description?: string } | undefined>;
  };
  const out = new Map<string, string>();
  for (const id of ROLE_IDS) {
    const text = semantic.motion?.[id]?.$description;
    if (text) out.set(id, text);
  }
  return out;
}

export interface SpringPreset {
  name: PresetName;
  params: SpringParams;
  duration: TokenFact;
  easing: TokenFact;
  description: string;
}

export function springPresets(): SpringPreset[] {
  const tokens = group("light", "spring");
  const num = (name: PresetName, part: string): number => {
    const token = tokens.find((t) => t.name === `${name}.${part}`);
    const value = Number(token?.resolved);
    if (!Number.isFinite(value)) {
      throw new Error(`[apps/design] spring.${name}.${part} is missing or not a number`);
    }
    return value;
  };
  return PRESET_NAMES.map((name) => ({
    name,
    params: {
      stiffness: num(name, "stiffness"),
      damping: num(name, "damping"),
      mass: num(name, "mass"),
    },
    duration: fact(`--spring-${name}-duration`),
    easing: fact(`--spring-${name}-easing`),
    description:
      tokens.find((t) => t.name === `${name}.stiffness`)?.description ??
      "Spring preset from the token source.",
  }));
}

export interface ScaleStep {
  name: string;
  cssVar: string;
  value: string;
  /** Numeric part of the value, for sizing a demo. */
  amount: number;
  description: string | null;
}

function scale(groupName: "stagger" | "distance"): ScaleStep[] {
  return group("light", groupName).map((token) => ({
    name: token.name,
    cssVar: `--${token.cssVar}`,
    value: token.resolved,
    amount: Number.parseFloat(token.resolved),
    description: token.description,
  }));
}

export const staggerSteps = (): ScaleStep[] => scale("stagger");
export const distanceSteps = (): ScaleStep[] => scale("distance");

/** Plain token rows (no Tailwind utility) for the parameter tables. */
export function plainTokens(groupName: string): SimpleToken[] {
  return group("light", groupName).map((token) => ({
    token,
    use: {
      utility: null,
      fallback: token.cssVar === null ? "not emitted as a variable" : `var(--${token.cssVar})`,
      requires: "—",
    },
  }));
}
