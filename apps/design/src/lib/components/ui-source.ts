/**
 * Static scan of `@nebutra/ui` source.
 *
 * Everything on the component pages that can be *derived* is derived here, at
 * build time, from the library's own files:
 *
 *   - the export list of each barrel (`primitives`, `components`, `patterns`,
 *     `layout`) — so a newly exported component shows up on the index as an
 *     uncovered gap instead of being silently missing.
 *   - the `cva` variant maps — so "every variant" on a component page means
 *     every variant the source declares today, not every variant somebody
 *     remembered to type into this app.
 *
 * This module touches the filesystem. It is imported only by server components
 * that are statically rendered, so the scan runs once per build.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// ─── locating the package source ──────────────────────────────────────────────

const PROBE = join("packages", "design", "ui", "src", "primitives", "index.ts");

function findUiSrc(): string {
  let dir = process.cwd();

  for (let up = 0; up < 6; up += 1) {
    if (existsSync(join(dir, PROBE))) {
      return join(dir, "packages", "design", "ui", "src");
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `[apps/design] Could not locate packages/design/ui/src walking up from ${process.cwd()}. ` +
      "The component surface derives its export list from the library source; it will not " +
      "fall back to a hand-written list.",
  );
}

export const UI_SRC = findUiSrc();

/** Repo-relative path, for display and for linking to source. */
export function repoPath(absOrRel: string): string {
  const abs = resolve(UI_SRC, absOrRel);
  const marker = `${join("packages", "design", "ui", "src")}`;
  const at = abs.indexOf(marker);
  return at === -1 ? abs : abs.slice(at);
}

function read(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

const EXTS = [".ts", ".tsx"];

function resolveLocal(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), spec);

  for (const ext of EXTS) {
    if (existsSync(base + ext)) return base + ext;
  }
  for (const ext of EXTS) {
    const idx = join(base, `index${ext}`);
    if (existsSync(idx)) return idx;
  }
  return null;
}

// ─── brace / paren matching ───────────────────────────────────────────────────

/**
 * Returns the slice between `open` at `openIdx` and its matching `close`,
 * skipping string literals and comments. Exclusive of the delimiters.
 */
function balanced(src: string, openIdx: number, open: string, close: string): string {
  let depth = 0;
  let i = openIdx;
  let quote: string | null = null;

  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];

    if (quote) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i);
      i = end === -1 ? src.length : end + 2;
      continue;
    }

    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
    i += 1;
  }

  return "";
}

/** Top-level `key:` names of an object-literal body, in source order. */
function topLevelKeys(body: string): { key: string; valueStart: number }[] {
  const keys: { key: string; valueStart: number }[] = [];
  let depth = 0;
  let quote: string | null = null;
  let i = 0;

  while (i < body.length) {
    const ch = body[i];
    const next = body[i + 1];

    if (quote) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      const nl = body.indexOf("\n", i);
      i = nl === -1 ? body.length : nl;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = body.indexOf("*/", i);
      i = end === -1 ? body.length : end + 2;
      continue;
    }

    if (depth === 0 && (ch === '"' || ch === "'")) {
      // quoted key, e.g. "gray-subtle":
      const close = (() => {
        let j = i + 1;
        while (j < body.length) {
          if (body[j] === "\\") {
            j += 2;
            continue;
          }
          if (body[j] === ch) return j;
          j += 1;
        }
        return -1;
      })();
      if (close !== -1) {
        const after = body.slice(close + 1).match(/^\s*:/);
        if (after) {
          keys.push({ key: body.slice(i + 1, close), valueStart: close + 1 + after[0].length });
          i = close + 1 + after[0].length;
          continue;
        }
      }
      quote = ch;
      i += 1;
      continue;
    }

    if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    else if (ch === "}" || ch === "]" || ch === ")") depth -= 1;
    else if (depth === 0 && /[A-Za-z_$]/.test(ch ?? "")) {
      const m = body.slice(i).match(/^([A-Za-z_$][\w$]*)\s*:/);
      if (m) {
        keys.push({ key: m[1] as string, valueStart: i + m[0].length });
        i += m[0].length;
        continue;
      }
      // identifier that is not a key — skip it whole so we don't re-match inside
      const id = body.slice(i).match(/^[A-Za-z_$][\w$]*/);
      i += id ? id[0].length : 1;
      continue;
    }

    i += 1;
  }

  return keys;
}

// ─── cva extraction ───────────────────────────────────────────────────────────

export interface CvaSpec {
  /** e.g. `badgeVariants` */
  name: string;
  /** repo-relative file the cva call was found in */
  file: string;
  /** `{ variant: ["default", "secondary", …], size: [...] }`, source order */
  variants: Record<string, string[]>;
  /** `{ variant: "default", size: "md" }` */
  defaults: Record<string, string>;
}

function extractCvaFromSource(src: string, name: string, file: string): CvaSpec | null {
  const decl = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*(?::[^=]+)?=\\s*cva\\s*\\(`);
  const m = decl.exec(src);
  if (!m) return null;

  const openParen = src.indexOf("(", m.index + m[0].length - 1);
  const call = balanced(src, openParen, "(", ")");

  const variants: Record<string, string[]> = {};
  const defaults: Record<string, string> = {};

  const vMatch = /\bvariants\s*:\s*\{/.exec(call);
  if (vMatch) {
    const open = call.indexOf("{", vMatch.index + vMatch[0].length - 1);
    const body = balanced(call, open, "{", "}");
    for (const group of topLevelKeys(body)) {
      const gOpen = body.indexOf("{", group.valueStart);
      if (gOpen === -1) continue;
      const gBody = balanced(body, gOpen, "{", "}");
      variants[group.key] = topLevelKeys(gBody).map((k) => k.key);
    }
  }

  const dMatch = /\bdefaultVariants\s*:\s*\{/.exec(call);
  if (dMatch) {
    const open = call.indexOf("{", dMatch.index + dMatch[0].length - 1);
    const body = balanced(call, open, "{", "}");
    for (const entry of topLevelKeys(body)) {
      const raw = body.slice(entry.valueStart).match(/^\s*["']?([\w-]+)["']?/);
      if (raw) defaults[entry.key] = raw[1] as string;
    }
  }

  return { name, file: repoPath(file), variants, defaults };
}

/**
 * Find a `cva` variant map by export name, starting at `entry` (repo-relative
 * to `packages/design/ui/src`) and following that file's relative imports one
 * level — `buttonVariants` lives in `button-variants.ts`, not `button.tsx`.
 */
export function findCva(entry: string, name: string): CvaSpec | null {
  const abs = resolve(UI_SRC, entry);
  const src = read(abs);
  if (!src) return null;

  const direct = extractCvaFromSource(src, name, abs);
  if (direct) return direct;

  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const target = resolveLocal(abs, m[1] as string);
    if (!target) continue;
    const targetSrc = read(target);
    if (!targetSrc) continue;
    const found = extractCvaFromSource(targetSrc, name, target);
    if (found) return found;
  }

  return null;
}

// ─── other derivable axes ─────────────────────────────────────────────────────

/**
 * `export type InputSize = "sm" | "md" | "lg"` → `["sm", "md", "lg"]`.
 * Not every size axis is a cva variant — the form controls take theirs from
 * `tokens/components/*`, so those pages derive from the union instead.
 */
export function findUnion(entry: string, typeName: string): string[] | null {
  const src = read(resolve(UI_SRC, entry));
  if (!src) return null;

  const m = new RegExp(`(?:export\\s+)?type\\s+${typeName}\\s*=([^;]+);`).exec(src);
  if (!m) return null;

  const members = [...(m[1] as string).matchAll(/["']([^"']+)["']/g)].map((x) => x[1] as string);
  return members.length > 0 ? members : null;
}

/** `export const toggleSizes = ["small", "normal", "large"] as const` → members. */
export function findConstArray(entry: string, name: string): string[] | null {
  const src = read(resolve(UI_SRC, entry));
  if (!src) return null;

  const m = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*(?::[^=]+)?=\\s*\\[`).exec(src);
  if (!m) return null;

  const open = src.indexOf("[", m.index + m[0].length - 1);
  const body = balanced(src, open, "[", "]");
  const members = [...body.matchAll(/["']([^"']+)["']/g)].map((x) => x[1] as string);
  return members.length > 0 ? members : null;
}

/** Top-level keys of `export const spinnerTones = { … }`. */
export function findObjectKeys(entry: string, name: string): string[] | null {
  const src = read(resolve(UI_SRC, entry));
  if (!src) return null;

  const m = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*(?::[^=]+)?=\\s*\\{`).exec(src);
  if (!m) return null;

  const open = src.indexOf("{", m.index + m[0].length - 1);
  const body = balanced(src, open, "{", "}");
  const keys = topLevelKeys(body).map((k) => k.key);
  return keys.length > 0 ? keys : null;
}

// ─── barrel export extraction ─────────────────────────────────────────────────

export type ExportKind = "value" | "type" | "unknown";

export interface UiExport {
  name: string;
  kind: ExportKind;
  /** repo-relative file the declaration was found in */
  file: string;
}

function declaredKind(src: string, name: string): ExportKind {
  if (new RegExp(`export\\s+(?:interface|type)\\s+${name}\\b`).test(src)) return "type";
  if (
    new RegExp(
      `(?:export\\s+)?(?:declare\\s+)?(?:const|let|var|function|class)\\s+${name}\\b`,
    ).test(src)
  ) {
    return "value";
  }
  return "unknown";
}

function collect(file: string, seen: Set<string>, out: Map<string, UiExport>): void {
  if (seen.has(file)) return;
  seen.add(file);

  const src = read(file);
  if (!src) return;

  const add = (name: string, kind: ExportKind, from: string) => {
    const existing = out.get(name);

    if (!existing) {
      out.set(name, { name, kind, file: repoPath(from) });
      return;
    }

    // A name can reach the barrel as both a type and a value — `Separator` is
    // exported as a component from `separator.tsx` and as an interface from
    // `expandable-tabs.tsx`. Whichever traversal order finds them, the value
    // wins, because that is the thing a page can render.
    if (existing.kind !== "value" && kind === "value") {
      out.set(name, { name, kind, file: repoPath(from) });
    }
  };

  // export * from "./x"
  for (const m of src.matchAll(/export\s+\*\s+from\s+["'](\.[^"']+)["']/g)) {
    const target = resolveLocal(file, m[1] as string);
    if (target) collect(target, seen, out);
  }

  // export { … } from "./x"   |   export type { … } from "./x"
  for (const m of src.matchAll(/export\s+(type\s+)?\{([\s\S]*?)\}\s*from\s+["']([^"']+)["']/g)) {
    const typeOnlyClause = Boolean(m[1]);
    const target = m[3]?.startsWith(".") ? resolveLocal(file, m[3]) : null;
    const targetSrc = target ? read(target) : null;

    for (const rawEntry of (m[2] as string).split(",")) {
      const entry = rawEntry.replace(/\/\/[^\n]*/g, "").trim();
      if (!entry) continue;
      const typeOnlyEntry = /^type\s+/.test(entry);
      const cleaned = entry.replace(/^type\s+/, "");
      const parts = cleaned.split(/\s+as\s+/);
      const local = parts[0]?.trim() ?? "";
      const exposed = (parts[1] ?? parts[0])?.trim() ?? "";
      if (!exposed) continue;

      const kind: ExportKind =
        typeOnlyClause || typeOnlyEntry
          ? "type"
          : targetSrc
            ? declaredKind(targetSrc, local)
            : "unknown";

      add(exposed, kind, target ?? file);
    }
  }

  // local declarations: export const/function/class X
  for (const m of src.matchAll(
    /export\s+(?:async\s+)?(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    add(m[1] as string, "value", file);
  }
  for (const m of src.matchAll(/export\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)/g)) {
    add(m[1] as string, "type", file);
  }

  // Local export list with no `from` clause — `export { Alert, AlertIcon };`
  // Most primitives expose themselves this way, so skipping it under-reports the
  // public surface by hundreds of names.
  for (const m of src.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s*;/g)) {
    const typeOnlyClause = Boolean(m[1]);
    for (const rawEntry of (m[2] as string).split(",")) {
      const entry = rawEntry.replace(/\/\/[^\n]*/g, "").trim();
      if (!entry) continue;
      const typeOnlyEntry = /^type\s+/.test(entry);
      const cleaned = entry.replace(/^type\s+/, "");
      const parts = cleaned.split(/\s+as\s+/);
      const local = parts[0]?.trim() ?? "";
      const exposed = (parts[1] ?? parts[0])?.trim() ?? "";
      if (!exposed) continue;

      add(exposed, typeOnlyClause || typeOnlyEntry ? "type" : declaredKind(src, local), file);
    }
  }
}

/** Every non-type export of a barrel, derived from source. */
export function barrelExports(barrel: string): UiExport[] {
  const abs = resolve(UI_SRC, barrel);
  const out = new Map<string, UiExport>();
  collect(abs, new Set(), out);
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The component-shaped exports of a barrel: PascalCase, not a type. This is
 * the population the coverage numbers on the index page are measured against.
 */
export function componentExports(barrel: string): UiExport[] {
  return barrelExports(barrel).filter(
    (e) => e.kind !== "type" && /^[A-Z][A-Za-z0-9]*$/.test(e.name),
  );
}

/** Does a colocated Storybook story exist for this file? */
export function storyFor(entry: string): string | null {
  const abs = resolve(UI_SRC, entry);
  const story = abs.replace(/\.tsx?$/, ".stories.tsx");
  if (existsSync(story)) return repoPath(story);

  // some components share a story with a sibling in the same directory
  return null;
}

/** Sanity helper used by the index page's "scan health" line. */
export function scanStats(
  barrels: string[],
): { barrel: string; total: number; components: number }[] {
  return barrels.map((barrel) => ({
    barrel,
    total: barrelExports(barrel).length,
    components: componentExports(barrel).length,
  }));
}

export function listDir(rel: string): string[] {
  try {
    return readdirSync(resolve(UI_SRC, rel));
  } catch {
    return [];
  }
}
