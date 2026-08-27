// biome-ignore-all lint/suspicious/noTemplateCurlyInString: dotenv ${VAR} interpolation syntax quoted in a documentation string
/**
 * env-diff — key-level parity check between two dotenv files (Comparator root).
 *
 * What the brief demands beyond a naive clone (docs/plans/tools/env-diff.md §7):
 *  1. Identity is the *key*, not the line. Both sides are parsed into a
 *     key→value map before anything is compared, so reordering or regrouping
 *     variables produces zero differences. A line-based (Myers/LCS) diff would
 *     report "everything changed" on an alphabetised copy of the same file.
 *  2. The comparison base is the **union** of keys. A key present in only one
 *     file is a first-class `added`/`removed` status, never dropped — that
 *     missing `STRIPE_WEBHOOK_SECRET` is the whole reason the tool exists.
 *  3. `export ` prefixes and inline comments are stripped before key/value
 *     extraction: `export DATABASE_URL=…` has the key `DATABASE_URL`, and
 *     `PORT=3000 # dev only` has the value `3000`. A `#` that is *not* preceded
 *     by whitespace stays in the value (`URL=http://x#frag`).
 *  4. One layer of matching `'…'` / `"…"` / `` `…` `` quoting is stripped before
 *     values are compared, so `API_KEY=abc` and `API_KEY="abc"` are the same
 *     value. An unterminated quote is a `quoteMismatch` warning, never a silent
 *     normalisation. Double quotes (and backticks) may span lines and unescape
 *     `\n` `\r` `\t` `\"` `\\`; single quotes are literal. A stray opening quote
 *     makes the reference parser run the value on to the *next* quote in the
 *     file, swallowing whatever assignments sit in between — that too raises a
 *     `quoteMismatch` warning naming the keys it ate, because otherwise they
 *     just read as "removed" on the other side with no reason given.
 *  5. `${OTHER_VAR}` references are compared **literally, never resolved** —
 *     expansion semantics differ per consumer (dotenv does not expand,
 *     dotenv-expand does, Docker Compose expands at file-read time), so this
 *     tool has no consumer-agnostic way to resolve them. Entries carry an
 *     `interpolated` flag instead.
 *  6. Duplicate keys inside one file: **last occurrence wins** (the dotenv
 *     convention) and every duplicate is surfaced as a `duplicateKey` warning
 *     rather than silently discarded.
 *  7. Key comparison is case-sensitive by default (POSIX `environ` is), with an
 *     explicit opt-in for case-insensitive comparison. Folding case can merge
 *     two genuinely distinct keys, so a fold-induced collision also raises a
 *     `duplicateKey` warning.
 *  8. A commented-out *assignment* (`# API_KEY=xxx`) is a distinct signal from
 *     a key that was never mentioned: it reports as `commentedOutInA` /
 *     `commentedOutInB`, not as plain absence. Bare comment lines
 *     (`# Database config`) carry no key and are noise.
 *  9. Secret detection is a **key-name keyword heuristic**, not entropy
 *     analysis and not a security scanner: it flags `DB_PASSWORD`, misses a
 *     credential hidden behind an innocuous key name, and false-flags
 *     `SECRET_SANTA_NAME`. `SECRET_HEURISTIC_NOTE` ships that caveat with the
 *     answer instead of implying certainty.
 * 10. Redaction masks the *displayed* characters only. Comparison always runs
 *     on the raw values, so `secretChanged` still distinguishes "the same
 *     secret on both sides" from "this secret was rotated" even though neither
 *     value is ever rendered.
 *
 * Specs implemented: dotenv file grammar as defined by the reference parser
 * (motdotla/dotenv — `export` prefix, `#` comments, quoted/multi-line values,
 * last-occurrence-wins); IEEE Std 1003.1-2017 (POSIX) §8.1 "Environment
 * Variable Definition" for name characters and case sensitivity.
 *
 * Pure: no network, no fs, no clock, no randomness — the same two inputs always
 * produce byte-identical output.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── limits ────────────────────────────────────────────────────────────── */

const MAX_INPUT_CHARS = 1_000_000;
/** Beyond this many distinct keys the table stops being readable; entries truncate. */
export const MAX_ENTRIES = 5_000;
/** A pathological paste can generate a warning per line; cap the list, flag the cap. */
export const MAX_WARNINGS = 200;

/** Fixed-length mask: hides the value *and* its length. Equality survives via `secretChanged`. */
export const REDACTION_MASK = "••••••••";

export const SECRET_HEURISTIC_NOTE =
  "Secret flags come from a key-name keyword heuristic, not value entropy. It misses credentials behind innocuous key names (CONFIG_BLOB=…) and flags harmless keys containing a keyword (SECRET_SANTA_NAME). Not a security scanner.";

export const INTERPOLATION_NOTE =
  "${VAR} references are compared literally and never resolved: expansion differs by consumer (dotenv does not expand, dotenv-expand and Docker Compose do).";

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type EnvDiffStatus =
  | "unchanged"
  | "changed"
  | "added"
  | "removed"
  | "commentedOutInA"
  | "commentedOutInB";

export type EnvWarningType = "duplicateKey" | "quoteMismatch" | "unparsableLine";

export interface EnvDiffWarning {
  file: "A" | "B";
  type: EnvWarningType;
  key?: string;
  line?: number;
  message: string;
}

export interface EnvDiffEntry {
  key: string;
  /** null = no active assignment in A. `""` = assigned an empty value. */
  valueA: string | null;
  valueB: string | null;
  status: EnvDiffStatus;
  /** Key-name keyword heuristic — see SECRET_HEURISTIC_NOTE. */
  isSecret: boolean;
  /** Present only when `isSecret`. True when the raw values are not identical. */
  secretChanged?: boolean;
  /** True when either side's raw value contains a `${…}` reference. */
  interpolated: boolean;
  /** Which side(s) carry a commented-out assignment for this key, if any. */
  commentedIn?: "A" | "B" | "both";
}

export interface EnvDiffCounts {
  unchanged: number;
  changed: number;
  added: number;
  removed: number;
  commentedOut: number;
}

export interface EnvDiffResult {
  entries: EnvDiffEntry[];
  counts: EnvDiffCounts;
  warnings: EnvDiffWarning[];
  /** Distinct keys in the union of both files (before any entry truncation). */
  totalKeys: number;
  /** Entries whose status is not `unchanged`. */
  differences: number;
  /** True when at least one displayed value was masked. */
  redacted: boolean;
  entriesTruncated: boolean;
  warningsTruncated: boolean;
  options: {
    ignoreComments: boolean;
    caseInsensitiveKeys: boolean;
    redactSecrets: boolean;
  };
  secretDetection: { method: "key-name-keyword"; note: string };
  interpolationNote: string;
}

/* ── secret heuristic (know-how #9) ────────────────────────────────────── */

/**
 * Matched per underscore/dash/dot-separated token, so `SORT_KEY` and
 * `SECRET_SANTA_NAME` are flagged (accepted false positives) while `MONKEYS`
 * is not. Substring matching over the whole key would flag the latter too.
 */
const SECRET_TOKENS: ReadonlySet<string> = new Set([
  "APIKEY",
  "AUTH",
  "BEARER",
  "CERT",
  "CREDENTIAL",
  "CREDENTIALS",
  "CREDS",
  "DSN",
  "JWT",
  "KEY",
  "KEYS",
  "PASS",
  "PASSPHRASE",
  "PASSWD",
  "PASSWORD",
  "PEM",
  "PRIVATE",
  "SALT",
  "SECRET",
  "SECRETS",
  "SIGNATURE",
  "SIGNING",
  "TOKEN",
  "TOKENS",
]);

/** Key-name keyword heuristic. Never looks at the value. */
export function isSecretKey(key: string): boolean {
  return key
    .toUpperCase()
    .split(/[_\-.]+/)
    .some((token) => SECRET_TOKENS.has(token));
}

/* ── parser ────────────────────────────────────────────────────────────── */

/** POSIX §8.1 names, widened to the `.`/`-` some frameworks use in dotenv files. */
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const EXPORT_RE = /^export\s+/;
const INTERPOLATION_RE = /\$\{[^}]*\}/;
/**
 * A value that is *only* a reference (`"${PUSHER_APP_KEY}"`) discloses nothing
 * when rendered — it names another variable rather than carrying a credential —
 * so redaction skips it. Masking it would hide the one thing the user needs to
 * see: that this side defers to another key instead of holding a literal.
 */
const REFERENCE_ONLY_RE = /^\$\{[^}]+\}$/;

export interface EnvAssignment {
  key: string;
  value: string;
  /** 1-based line of the assignment. */
  line: number;
  occurrences: number[];
}

export interface EnvParseResult {
  active: Map<string, EnvAssignment>;
  commented: Map<string, EnvAssignment>;
  warnings: Omit<EnvDiffWarning, "file">[];
}

function unescapeDoubleQuoted(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== "\\" || i === raw.length - 1) {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    i += 1;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else if (next === "\\") out += "\\";
    else if (next === '"') out += '"';
    else out += `\\${next}`;
  }
  return out;
}

/** Index of the closing quote, honouring `\"` escapes for double quotes. -1 when absent. */
function findClosingQuote(text: string, from: number, quote: string): number {
  for (let i = from; i < text.length; i += 1) {
    if (text[i] === "\\" && quote === '"') {
      i += 1;
      continue;
    }
    if (text[i] === quote) return i;
  }
  return -1;
}

/**
 * Strip an inline comment from an unquoted value. Only a `#` at the start or
 * preceded by whitespace opens a comment — `URL=http://x#frag` keeps `#frag`
 * (know-how #3).
 */
function stripInlineComment(value: string): string {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== "#") continue;
    if (i === 0 || /\s/.test(value[i - 1] ?? "")) return value.slice(0, i);
  }
  return value;
}

interface ValueParse {
  value: string;
  /** Lines consumed *beyond* the first one (multi-line quoted values). */
  consumed: number;
  quoteMismatch: boolean;
  /**
   * Lines absorbed into a multi-line quoted value that read as assignments in
   * their own right. A stray opening quote makes the reference parser swallow
   * the rest of the file up to the next quote; those keys then vanish from the
   * comparison and show up as "removed" against the other side with no reason
   * given. Naming them is the difference between a warning and a silent
   * wrong answer.
   */
  swallowedAssignments: string[];
}

/** `KEY=` / `export KEY=` at the head of a line — an assignment by any parser. */
const LOOKS_LIKE_ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=/;

function parseValue(lines: readonly string[], index: number, rest: string): ValueParse {
  const trimmed = rest.replace(/^[ \t]+/, "");
  const quote = trimmed[0];
  if (quote !== '"' && quote !== "'" && quote !== "`") {
    return {
      value: stripInlineComment(trimmed).trimEnd(),
      consumed: 0,
      quoteMismatch: false,
      swallowedAssignments: [],
    };
  }

  const close = findClosingQuote(trimmed, 1, quote);
  if (close !== -1) {
    const inner = trimmed.slice(1, close);
    return {
      value: quote === '"' ? unescapeDoubleQuoted(inner) : inner,
      consumed: 0,
      quoteMismatch: false,
      swallowedAssignments: [],
    };
  }

  // Single quotes and backticks are literal; double quotes may span lines too.
  const buffer: string[] = [trimmed.slice(1)];
  const swallowed: string[] = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const end = findClosingQuote(line, 0, quote);
    const assignment = LOOKS_LIKE_ASSIGNMENT.exec(line);
    if (assignment) swallowed.push(`${assignment[1]} (line ${i + 1})`);
    if (end === -1) {
      buffer.push(line);
      continue;
    }
    buffer.push(line.slice(0, end));
    const joined = buffer.join("\n");
    return {
      value: quote === '"' ? unescapeDoubleQuoted(joined) : joined,
      consumed: i - index,
      quoteMismatch: false,
      swallowedAssignments: swallowed,
    };
  }

  // Ran off the end of the file: report it, keep the first line's remainder,
  // and let the following lines be parsed normally rather than swallowing them.
  return {
    value: trimmed.slice(1).trimEnd(),
    consumed: 0,
    quoteMismatch: true,
    swallowedAssignments: [],
  };
}

/**
 * Parse one dotenv file into active assignments plus commented-out assignments.
 * Last occurrence of a key wins (know-how #6); every earlier one is recorded on
 * `occurrences` so the caller can warn with real line numbers.
 */
export function parseEnvFile(text: string, ignoreComments = true): EnvParseResult {
  const active = new Map<string, EnvAssignment>();
  const commented = new Map<string, EnvAssignment>();
  const warnings: Omit<EnvDiffWarning, "file">[] = [];
  const lines = text.split(/\r\n|\n|\r/);

  const record = (
    target: Map<string, EnvAssignment>,
    key: string,
    value: string,
    line: number,
  ): void => {
    const previous = target.get(key);
    if (previous) {
      // Last wins — replace the value, keep the full occurrence history.
      target.set(key, {
        key,
        value,
        line,
        occurrences: [...previous.occurrences, line],
      });
      return;
    }
    target.set(key, { key, value, line, occurrences: [line] });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    const lineNo = i + 1;
    const trimmed = raw.trim();
    if (trimmed === "") continue;

    if (trimmed.startsWith("#")) {
      if (!ignoreComments) continue;
      // A bare comment carries no key; a commented-out *assignment* does.
      const bare = trimmed.replace(/^#+\s*/, "");
      const withoutExport = bare.replace(EXPORT_RE, "");
      const eq = withoutExport.indexOf("=");
      if (eq <= 0) continue;
      const key = withoutExport.slice(0, eq).trim();
      if (!KEY_RE.test(key)) continue;
      const parsed = parseValue([], 0, withoutExport.slice(eq + 1));
      record(commented, key, parsed.value, lineNo);
      continue;
    }

    const body = trimmed.replace(EXPORT_RE, "");
    const eq = body.indexOf("=");
    if (eq <= 0) {
      warnings.push({
        type: "unparsableLine",
        line: lineNo,
        message: `Line ${lineNo} is neither a KEY=value assignment, a comment, nor blank.`,
      });
      continue;
    }
    const key = body.slice(0, eq).trim();
    if (!KEY_RE.test(key)) {
      warnings.push({
        type: "unparsableLine",
        line: lineNo,
        message: `Line ${lineNo}: "${key}" is not a valid environment variable name.`,
      });
      continue;
    }

    // Re-derive the remainder from the raw line so a multi-line quoted value
    // continues across the *original* lines, not the trimmed body.
    const rawEq = raw.indexOf("=", raw.indexOf(key));
    const parsed = parseValue(lines, i, raw.slice(rawEq + 1));
    if (parsed.quoteMismatch) {
      warnings.push({
        type: "quoteMismatch",
        key,
        line: lineNo,
        message: `Line ${lineNo}: unterminated quote in ${key}; the value was read to end of line.`,
      });
    }
    if (parsed.swallowedAssignments.length > 0) {
      warnings.push({
        type: "quoteMismatch",
        key,
        line: lineNo,
        message: `Line ${lineNo}: the quoted value of ${key} runs to line ${lineNo + parsed.consumed} and absorbs ${parsed.swallowedAssignments.length} line(s) that look like assignments (${parsed.swallowedAssignments.join(", ")}). Those keys are not compared — check for a stray quote.`,
      });
    }
    record(active, key, parsed.value, lineNo);
    i += parsed.consumed;
  }

  for (const entry of active.values()) {
    if (entry.occurrences.length > 1) {
      warnings.push({
        type: "duplicateKey",
        key: entry.key,
        line: entry.line,
        message: `${entry.key} is assigned ${entry.occurrences.length} times (lines ${entry.occurrences.join(", ")}); the value on line ${entry.line} wins.`,
      });
    }
  }

  return { active, commented, warnings };
}

/* ── diff ──────────────────────────────────────────────────────────────── */

export interface EnvDiffInput {
  envA: string;
  envB: string;
  options?: {
    ignoreComments?: boolean;
    caseInsensitiveKeys?: boolean;
    redactSecrets?: boolean;
  };
}

interface FoldedFile {
  active: Map<string, EnvAssignment>;
  commented: Map<string, EnvAssignment>;
  warnings: Omit<EnvDiffWarning, "file">[];
}

/** Case folding can merge two genuinely distinct keys — that is a duplicate, and it is reported. */
function fold(file: EnvParseResult, caseInsensitive: boolean): FoldedFile {
  if (!caseInsensitive) return file;
  const warnings = [...file.warnings];
  const foldMap = (
    source: Map<string, EnvAssignment>,
    warn: boolean,
  ): Map<string, EnvAssignment> => {
    const out = new Map<string, EnvAssignment>();
    for (const entry of source.values()) {
      const id = entry.key.toUpperCase();
      const previous = out.get(id);
      if (previous && warn) {
        warnings.push({
          type: "duplicateKey",
          key: entry.key,
          line: entry.line,
          message: `${previous.key} and ${entry.key} collide under case-insensitive comparison; the value on line ${entry.line} wins.`,
        });
      }
      out.set(
        id,
        previous ? { ...entry, occurrences: [...previous.occurrences, entry.line] } : entry,
      );
    }
    return out;
  };
  return {
    active: foldMap(file.active, true),
    commented: foldMap(file.commented, false),
    warnings,
  };
}

function statusOf(
  a: EnvAssignment | undefined,
  b: EnvAssignment | undefined,
  ca: EnvAssignment | undefined,
  cb: EnvAssignment | undefined,
): EnvDiffStatus {
  if (a && b) return a.value === b.value ? "unchanged" : "changed";
  if (a && !b) return cb ? "commentedOutInB" : "removed";
  if (!a && b) return ca ? "commentedOutInA" : "added";
  // Neither side sets the variable: both files agree it is unset, even though
  // one or both document it in a comment. Parity holds.
  return "unchanged";
}

function commentedIn(
  ca: EnvAssignment | undefined,
  cb: EnvAssignment | undefined,
): "A" | "B" | "both" | undefined {
  if (ca && cb) return "both";
  if (ca) return "A";
  if (cb) return "B";
  return undefined;
}

/** The whole engine. Deterministic, pure, and the exact code the agent API runs. */
export function diffEnv(input: EnvDiffInput): EnvDiffResult {
  const ignoreComments = input.options?.ignoreComments ?? true;
  const caseInsensitiveKeys = input.options?.caseInsensitiveKeys ?? false;
  const redactSecrets = input.options?.redactSecrets ?? true;

  const parsedA = fold(parseEnvFile(input.envA, ignoreComments), caseInsensitiveKeys);
  const parsedB = fold(parseEnvFile(input.envB, ignoreComments), caseInsensitiveKeys);

  const ids = new Set<string>([
    ...parsedA.active.keys(),
    ...parsedB.active.keys(),
    ...parsedA.commented.keys(),
    ...parsedB.commented.keys(),
  ]);

  const counts: EnvDiffCounts = {
    unchanged: 0,
    changed: 0,
    added: 0,
    removed: 0,
    commentedOut: 0,
  };
  const entries: EnvDiffEntry[] = [];
  let redacted = false;

  const sorted = [...ids].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  for (const id of sorted) {
    const a = parsedA.active.get(id);
    const b = parsedB.active.get(id);
    const ca = parsedA.commented.get(id);
    const cb = parsedB.commented.get(id);
    const key = a?.key ?? b?.key ?? ca?.key ?? cb?.key ?? id;
    const status = statusOf(a, b, ca, cb);

    counts[
      status === "commentedOutInA" || status === "commentedOutInB" ? "commentedOut" : status
    ] += 1;

    const rawA = a ? a.value : null;
    const rawB = b ? b.value : null;
    const secret = isSecretKey(key);
    const mask = (value: string | null): string | null => {
      if (value === null || value === "" || !secret || !redactSecrets) return value;
      if (REFERENCE_ONLY_RE.test(value)) return value;
      redacted = true;
      return REDACTION_MASK;
    };

    const entry: EnvDiffEntry = {
      key,
      valueA: mask(rawA),
      valueB: mask(rawB),
      status,
      isSecret: secret,
      interpolated:
        (rawA !== null && INTERPOLATION_RE.test(rawA)) ||
        (rawB !== null && INTERPOLATION_RE.test(rawB)),
    };
    // Comparison always runs on the raw values, so this survives redaction.
    if (secret) entry.secretChanged = rawA !== rawB;
    const commented = commentedIn(ca, cb);
    if (commented) entry.commentedIn = commented;
    if (entries.length < MAX_ENTRIES) entries.push(entry);
  }

  const allWarnings: EnvDiffWarning[] = [
    ...parsedA.warnings.map((w) => ({ ...w, file: "A" as const })),
    ...parsedB.warnings.map((w) => ({ ...w, file: "B" as const })),
  ];

  return {
    entries,
    counts,
    warnings: allWarnings.slice(0, MAX_WARNINGS),
    totalKeys: ids.size,
    differences: ids.size - counts.unchanged,
    redacted,
    entriesTruncated: ids.size > MAX_ENTRIES,
    warningsTruncated: allWarnings.length > MAX_WARNINGS,
    options: { ignoreComments, caseInsensitiveKeys, redactSecrets },
    secretDetection: { method: "key-name-keyword", note: SECRET_HEURISTIC_NOTE },
    interpolationNote: INTERPOLATION_NOTE,
  };
}

/* ── tool descriptor ───────────────────────────────────────────────────── */

export const envDiffInputSchema = z.object({
  envA: z
    .string()
    .max(MAX_INPUT_CHARS)
    .describe("Raw .env content for environment A (pane A). Never resolved or executed."),
  envB: z.string().max(MAX_INPUT_CHARS).describe("Raw .env content for environment B (pane B)."),
  options: z
    .object({
      ignoreComments: z
        .boolean()
        .default(true)
        .describe(
          "true (default): bare comment and blank lines carry no key, and a commented-out assignment (# API_KEY=x) is reported as commentedOutInA/commentedOutInB. false: comment lines are opaque text and are never interpreted, so no commentedOut status is produced.",
        ),
      caseInsensitiveKeys: z
        .boolean()
        .default(false)
        .describe(
          "Compare key names case-insensitively. Off by default because POSIX environments are case-sensitive; folding can merge two distinct keys, which raises a duplicateKey warning.",
        ),
      redactSecrets: z
        .boolean()
        .default(true)
        .describe(
          "Mask displayed values whose key name matches the secret keyword heuristic. Comparison still runs on the raw values, so secretChanged stays accurate under redaction.",
        ),
    })
    .default({ ignoreComments: true, caseInsensitiveKeys: false, redactSecrets: true })
    .describe("Comparison options. All three have defaults; the object may be omitted."),
});

export const envDiffTool = tool({
  id: "dev/env-diff",
  slug: "env-diff",
  category: "dev",
  title: { zh: ".env 差异对比", en: "Env Diff" },
  description: {
    zh: "按键名（而非行）对比两个 .env 文件：新增/缺失/变更/被注释，密钥可脱敏且仍报告是否变化",
    en: "Compare two .env files by key, not by line: added / removed / changed / commented-out, with secret redaction that still reports whether the secret changed",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.env_diff",
  roots: ["comparator", "checker"],
  engine: {
    name: "nebutra-dotenv-parity",
    upstream: "dotenv file grammar (motdotla/dotenv parse rules) + IEEE Std 1003.1-2017 §8.1",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "env对比,env文件diff,环境变量对比,dotenv比较,配置漂移检查",
    en: "env diff, .env file comparison, compare env files, env variable diff, dotenv compare, env parity check",
  },
  inputSchema: envDiffInputSchema,
  execute: (input: EnvDiffInput) => diffEnv(input),
});

export const w3EnvDiffTools: readonly AnyForgeToolDefinition[] = [envDiffTool];
