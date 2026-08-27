/**
 * robots.txt generator — Robots Exclusion Protocol (RFC 9309).
 *
 * Pure, deterministic, no network / fs / clock / randomness. The whole value is
 * a spec-correct serialization of a structured decision, so every non-obvious
 * rule of the protocol is encoded here rather than left to the user:
 *
 *  - Groups are exclusive, not additive (RFC 9309 §2.2.1): a crawler obeys the
 *    single most specific matching group. Emitting `User-agent: GPTBot` +
 *    `Disallow:` therefore silently drops every restriction the user wrote in
 *    the `*` group. Explicitly-allowed agents get the shared rules repeated
 *    into their own group so the restriction actually survives.
 *  - `Disallow:` with an empty value means "allow everything", never
 *    "disallow everything" (RFC 9309 §2.2.2).
 *  - `Crawl-delay` is not part of RFC 9309. Google documents it as unsupported,
 *    so it is never emitted into a Google-family group.
 *  - `Sitemap` is a sitemaps.org extension, file-scoped, not group-scoped —
 *    it is emitted as standalone lines, outside every group.
 *  - Path matching is case-sensitive; user paths are never lower-cased. Only a
 *    missing leading `/` is normalized. A missing trailing `/` is reported,
 *    not silently "fixed", because `/admin` and `/admin/` are different rules.
 *  - Newlines / control characters in a name or path would inject directives,
 *    so they are rejected outright.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── agent roster ──────────────────────────────────────────────────────── */

/** Canonical casing for the agents the UI offers. Matching is case-insensitive
 *  per RFC 9309 §2.2.1, so canonicalizing the printed token is safe. */
export const ROBOTS_KNOWN_AGENTS: Readonly<Record<string, string>> = {
  // classic search crawlers
  googlebot: "Googlebot",
  "googlebot-image": "Googlebot-Image",
  bingbot: "Bingbot",
  baiduspider: "Baiduspider",
  yandexbot: "YandexBot",
  duckduckbot: "DuckDuckBot",
  // AI crawlers (training / answer engines)
  gptbot: "GPTBot",
  claudebot: "ClaudeBot",
  "google-extended": "Google-Extended",
  perplexitybot: "PerplexityBot",
  ccbot: "CCBot",
  "applebot-extended": "Applebot-Extended",
  bytespider: "Bytespider",
  amazonbot: "Amazonbot",
};

export const ROBOTS_AI_AGENTS: readonly string[] = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "CCBot",
  "Applebot-Extended",
  "Bytespider",
  "Amazonbot",
];

export const ROBOTS_SEARCH_AGENTS: readonly string[] = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "Baiduspider",
  "YandexBot",
  "DuckDuckBot",
];

/** Google ignores `Crawl-delay`; never emit it into a Google-family group. */
function isGoogleFamily(agent: string): boolean {
  const a = agent.toLowerCase();
  return a === "googlebot" || a.startsWith("googlebot-") || a.startsWith("google-");
}

/* ── output types ──────────────────────────────────────────────────────── */

export type RobotsWarningSeverity = "info" | "warning";

export interface RobotsWarning {
  readonly code: string;
  readonly severity: RobotsWarningSeverity;
  readonly message: string;
  readonly subject?: string;
}

export interface RobotsGroup {
  readonly userAgents: readonly string[];
  readonly directives: readonly string[];
}

export interface RobotsTxtOutput {
  readonly content: string;
  readonly filename: "robots.txt";
  readonly lineCount: number;
  readonly byteLength: number;
  readonly groups: readonly RobotsGroup[];
  readonly sitemaps: readonly string[];
  readonly warnings: readonly RobotsWarning[];
}

/* ── validation helpers ────────────────────────────────────────────────── */

/** Code-point scan rather than a regex: a control character inside a regex
 *  literal is itself a lint hazard, and this is the same check. */
function hasControlChar(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function assertNoControl(value: string, what: string): void {
  if (hasControlChar(value)) {
    throw new Error(`${what} must not contain newlines or control characters`);
  }
}

function normalizeAgent(raw: string): string {
  const name = raw.trim();
  if (!name) throw new Error("user-agent name must not be empty");
  assertNoControl(name, "user-agent name");
  if (/[\s:#]/.test(name)) {
    throw new Error(`invalid user-agent name "${name}": no whitespace, ":" or "#" allowed`);
  }
  if (name === "*") return "*";
  return ROBOTS_KNOWN_AGENTS[name.toLowerCase()] ?? name;
}

/** Only the leading slash is added. Case and trailing slash are the user's. */
function normalizePath(raw: string): string {
  const path = raw.trim();
  if (!path) throw new Error("rule path must not be empty");
  assertNoControl(path, "rule path");
  if (/[\s#]/.test(path)) {
    throw new Error(
      `invalid path "${path}": whitespace and "#" must be percent-encoded (%20, %23)`,
    );
  }
  if (path.startsWith("/")) return path;
  // RFC 9309 §2.2.2: `path-pattern = "/" *UTF8-char-noctl` — the value must
  // start with "/", including a wildcard rule. `*.pdf` is a common shorthand
  // and lenient parsers accept it, but the conformant spelling is `/*.pdf`,
  // which matches exactly the same URLs because "*" also matches "/".
  return `/${path}`;
}

function normalizeSitemap(raw: string): string {
  const value = raw.trim();
  if (!value) throw new Error("sitemap URL must not be empty");
  assertNoControl(value, "sitemap URL");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`invalid sitemap URL "${value}": must be an absolute http(s) URL`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`invalid sitemap URL "${value}": must use http or https`);
  }
  return url.toString();
}

/** `String()` is locale-free and round-trips `1` as `1`, `0.5` as `0.5`. */
function formatDelay(seconds: number): string {
  return String(seconds);
}

/** Looks like a directory the user forgot to close with `/`. */
function looksLikeUnclosedDirectory(path: string): boolean {
  if (path.endsWith("/") || path.endsWith("$") || path.includes("*")) return false;
  const last = path.slice(path.lastIndexOf("/") + 1);
  return last.length > 0 && !last.includes(".");
}

/* ── engine ────────────────────────────────────────────────────────────── */

const ruleSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(1000)
    .describe("Path relative to the domain root. A leading '/' is added if missing; case is kept."),
  type: z
    .enum(["allow", "disallow"])
    .default("disallow")
    .describe("'disallow' blocks the path, 'allow' carves an exception out of a broader block."),
});

const botSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "User-agent token, e.g. 'Googlebot', 'GPTBot', 'ClaudeBot'. Matching is case-insensitive.",
    ),
  access: z
    .enum(["default", "allow", "disallow"])
    .default("default")
    .describe(
      "'default' emits no group for this bot (it inherits the '*' group). 'allow'/'disallow' emit a dedicated group, which replaces the '*' group for that bot entirely.",
    ),
});

export const robotsTxtGeneratorInputSchema = z.object({
  defaultAccess: z
    .enum(["allow", "disallow"])
    .default("allow")
    .describe(
      "Access for the '*' group. 'allow' emits an empty 'Disallow:' (allow everything); 'disallow' emits 'Disallow: /'.",
    ),
  sitemaps: z
    .array(z.string().min(1).max(2000))
    .max(50)
    .default([])
    .describe("Absolute http(s) sitemap URLs. Emitted as standalone lines outside every group."),
  crawlDelay: z
    .number()
    .min(0.1)
    .max(3600)
    .optional()
    .describe(
      "Seconds between requests. Non-standard (not in RFC 9309); Google ignores it, so it is never emitted into a Google-family group.",
    ),
  bots: z
    .array(botSchema)
    .max(100)
    .default([])
    .describe("Per-agent overrides. A bot left at 'default' inherits the '*' group."),
  rules: z
    .array(ruleSchema)
    .max(200)
    .default([])
    .describe("Shared path rules. Applied to the '*' group and repeated into allowed-bot groups."),
});

export type RobotsTxtGeneratorInput = z.infer<typeof robotsTxtGeneratorInputSchema>;

interface GroupDraft {
  agents: string[];
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

function draftKey(draft: GroupDraft): string {
  return JSON.stringify([draft.allow, draft.disallow, draft.crawlDelay ?? null]);
}

function renderGroup(draft: GroupDraft): RobotsGroup {
  const directives: string[] = [];
  for (const path of draft.allow) directives.push(`Allow: ${path}`);
  for (const path of draft.disallow) directives.push(path ? `Disallow: ${path}` : "Disallow:");
  if (draft.crawlDelay !== undefined) {
    directives.push(`Crawl-delay: ${formatDelay(draft.crawlDelay)}`);
  }
  return { userAgents: [...draft.agents], directives };
}

export function generateRobotsTxt(input: RobotsTxtGeneratorInput): RobotsTxtOutput {
  const warnings: RobotsWarning[] = [];
  const warn = (
    code: string,
    severity: RobotsWarningSeverity,
    message: string,
    subject?: string,
  ) => {
    warnings.push(
      subject === undefined ? { code, severity, message } : { code, severity, message, subject },
    );
  };

  // 1. paths ---------------------------------------------------------------
  const allowPaths: string[] = [];
  const disallowPaths: string[] = [];
  const seenRules = new Set<string>();
  for (const rule of input.rules) {
    const path = normalizePath(rule.path);
    const key = `${rule.type}:${path}`;
    if (seenRules.has(key)) {
      warn("duplicate_rule", "info", `Duplicate rule dropped: ${rule.type} ${path}`, path);
      continue;
    }
    seenRules.add(key);
    if (looksLikeUnclosedDirectory(path)) {
      warn(
        "missing_trailing_slash",
        "warning",
        `"${path}" has no trailing slash. It also matches "${path}.html" and "${path}-2/"; use "${path}/" to restrict it to the directory.`,
        path,
      );
    }
    if (path.includes("*") || path.endsWith("$")) {
      warn(
        "pattern_extension",
        "info",
        `"${path}" uses '*' or '$'. Standardized in RFC 9309 and honored by the major crawlers, but older crawlers treat it as a literal character.`,
        path,
      );
    }
    if (rule.type === "allow") allowPaths.push(path);
    else disallowPaths.push(path);
  }

  if (allowPaths.length > 0) {
    warn(
      "allow_support",
      "info",
      "'Allow' is standardized in RFC 9309 (2022) but began as a Google extension; crawlers predating it may ignore the exception and obey only the Disallow.",
    );
  }

  // 2. default group -------------------------------------------------------
  const denyAll = input.defaultAccess === "disallow";
  if (denyAll && disallowPaths.length > 0) {
    warn(
      "redundant_disallow_under_deny_all",
      "info",
      "Default access is 'disallow', so 'Disallow: /' already covers every listed disallow path.",
    );
  }
  const starDraft: GroupDraft = {
    agents: ["*"],
    allow: allowPaths,
    disallow: denyAll ? ["/"] : disallowPaths.length > 0 ? disallowPaths : [""],
  };
  if (input.crawlDelay !== undefined) starDraft.crawlDelay = input.crawlDelay;

  if (denyAll) {
    warn(
      "deny_all",
      "warning",
      "'Disallow: /' blocks crawling, not indexing: a URL linked from elsewhere can still appear in results without a snippet. Use a 'noindex' response header or meta tag to keep a page out of the index.",
    );
  } else {
    warn(
      "empty_disallow_allows_all",
      "info",
      "An empty 'Disallow:' means 'allow everything'. 'Disallow: /' is what blocks the site — the two are one character apart.",
    );
  }

  // 3. per-bot groups ------------------------------------------------------
  const allowedDrafts: GroupDraft[] = [];
  const disallowedDrafts: GroupDraft[] = [];
  const byKey = new Map<string, GroupDraft>();
  const seenAgents = new Map<string, "default" | "allow" | "disallow">();

  for (const bot of input.bots) {
    const agent = normalizeAgent(bot.name);
    if (agent === "*") {
      throw new Error("use defaultAccess for the '*' group instead of listing '*' as a bot");
    }
    const previous = seenAgents.get(agent.toLowerCase());
    if (previous !== undefined) {
      if (previous !== bot.access) {
        throw new Error(
          `conflicting access for user-agent "${agent}": ${previous} and ${bot.access}`,
        );
      }
      warn("duplicate_agent", "info", `Duplicate user-agent dropped: ${agent}`, agent);
      continue;
    }
    seenAgents.set(agent.toLowerCase(), bot.access);
    if (bot.access === "default") continue;

    const draft: GroupDraft =
      bot.access === "disallow"
        ? { agents: [agent], allow: [], disallow: ["/"] }
        : {
            agents: [agent],
            allow: allowPaths,
            // A dedicated group replaces the '*' group for this agent, so the
            // shared restrictions have to be repeated or they stop applying.
            disallow: disallowPaths.length > 0 ? disallowPaths : [""],
          };
    if (bot.access === "allow" && input.crawlDelay !== undefined && !isGoogleFamily(agent)) {
      draft.crawlDelay = input.crawlDelay;
    }
    if (bot.access === "allow" && input.crawlDelay !== undefined && isGoogleFamily(agent)) {
      warn(
        "crawl_delay_google_skipped",
        "info",
        `Crawl-delay omitted from the ${agent} group: Google documents 'Crawl-delay' as unsupported. Use Search Console crawl-rate settings instead.`,
        agent,
      );
    }

    const key = draftKey(draft);
    const existing = byKey.get(key);
    if (existing) {
      existing.agents.push(agent);
      continue;
    }
    byKey.set(key, draft);
    if (bot.access === "allow") allowedDrafts.push(draft);
    else disallowedDrafts.push(draft);
  }

  const namedDrafts = [...allowedDrafts, ...disallowedDrafts];
  if (namedDrafts.length > 0) {
    warn(
      "group_precedence",
      "warning",
      "A crawler obeys only the most specific group that matches it (RFC 9309 §2.2.1); a named group replaces the '*' group rather than adding to it. Shared rules were repeated into every allowed-bot group so they keep applying.",
    );
  }
  if (input.crawlDelay !== undefined) {
    warn(
      "crawl_delay_support",
      "info",
      "'Crawl-delay' is not part of RFC 9309. Google ignores it; some other crawlers honor it. It is advisory, not enforcement.",
    );
  }

  // 4. sitemaps ------------------------------------------------------------
  const sitemaps: string[] = [];
  for (const raw of input.sitemaps) {
    const url = normalizeSitemap(raw);
    if (sitemaps.includes(url)) {
      warn("duplicate_sitemap", "info", `Duplicate sitemap dropped: ${url}`, url);
      continue;
    }
    sitemaps.push(url);
  }

  // 5. render --------------------------------------------------------------
  const groups = [starDraft, ...namedDrafts].map(renderGroup);
  const blocks = groups.map((group) =>
    [...group.userAgents.map((a) => `User-agent: ${a}`), ...group.directives].join("\n"),
  );
  if (sitemaps.length > 0) blocks.push(sitemaps.map((url) => `Sitemap: ${url}`).join("\n"));
  const content = `${blocks.join("\n\n")}\n`;

  return {
    content,
    filename: "robots.txt",
    lineCount: content.split("\n").length - 1,
    byteLength: new TextEncoder().encode(content).length,
    groups,
    sitemaps,
    warnings,
  };
}

export const robotsTxtGeneratorTool = tool({
  id: "dev/robots-txt-generator",
  slug: "robots-txt-generator",
  category: "dev",
  title: { zh: "robots.txt 生成器", en: "robots.txt Generator" },
  description: {
    zh: "按 RFC 9309 生成 robots.txt：默认放行/拒绝、搜索引擎与 AI 抓取器分组、crawl-delay、sitemap、目录限制，并提示分组互斥、空 Disallow、尾斜杠等易错点",
    en: "Generate an RFC 9309 robots.txt: default access, search-engine and AI-crawler groups, crawl-delay, sitemaps and path rules — with the group-precedence, empty-Disallow and trailing-slash traps flagged",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.robots_txt_generator",
  roots: ["template", "generator"],
  engine: {
    name: "Robots Exclusion Protocol",
    upstream: "RFC 9309 (+ sitemaps.org Sitemap directive)",
    version: "RFC 9309 (2022-09)",
  },
  seoKeywords: {
    zh: "robots.txt生成器,robots.txt怎么写,屏蔽GPTBot,屏蔽ClaudeBot,禁止AI爬虫",
    en: "robots.txt generator, robots txt creator, block GPTBot, block ClaudeBot, ai crawler robots.txt",
  },
  inputSchema: robotsTxtGeneratorInputSchema,
  execute: (input: RobotsTxtGeneratorInput) => generateRobotsTxt(input),
});

export const w3RobotsTxtGeneratorTools: readonly AnyForgeToolDefinition[] = [
  robotsTxtGeneratorTool,
];
