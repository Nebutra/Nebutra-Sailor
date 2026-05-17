import { z } from "zod";

/**
 * Design-context ingestion: turn an existing website into a structured
 * generation seed for a codegen turn.
 *
 * The scrape implementation is provider-specific and injected via a port;
 * this module never performs network I/O itself.
 */

/** Structured generation seed extracted from an existing site. */
export interface DesignContext {
  tenantId: string;
  sourceUrl: string;
  content: string;
  brand: {
    colors: string[];
    fonts: string[];
  };
  screenshotRef?: string | undefined;
  title?: string | undefined;
  fetchedAt: string;
}

/** Loose shape returned by a scrape provider (providers vary widely). */
export interface RawScrapeResult {
  markdown?: string | undefined;
  html?: string | undefined;
  screenshot?: string | null | undefined;
  metadata?: { title?: string | undefined } | undefined;
  branding?:
    | {
        colors?: string[] | undefined;
        fonts?: string[] | undefined;
      }
    | undefined;
}

export type ScrapeFormat = "markdown" | "screenshot" | "branding";

/** Injected provider port — callers wire a concrete scrape implementation. */
export interface ScrapeProvider {
  scrape(url: string, opts: { formats: ScrapeFormat[] }): Promise<RawScrapeResult>;
}

/** Clock injection for deterministic tests. */
export type Clock = () => Date;

const tenantSchema = z.string().trim().min(1, "tenantId is required");
const urlSchema = z.string().trim().min(1, "sourceUrl is required");

const DEFAULT_FORMATS: readonly ScrapeFormat[] = ["markdown", "screenshot", "branding"];
const DEFAULT_MAX_CHARS = 4000;

/** Permissive colour matcher: hex (3/4/6/8) or rgb/rgba/hsl(...)-ish. */
const COLOR_RE = /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|rgba|hsl|hsla)\([^)]+\))$/i;

function stripTags(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return decoded.replace(/\s+/g, " ").trim();
}

function dedupe(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function normalizeColors(colors: readonly string[] | undefined): string[] {
  if (!colors) return [];
  const cleaned = colors
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter((c) => c.length > 0 && COLOR_RE.test(c));
  return dedupe(cleaned);
}

function normalizeFonts(fonts: readonly string[] | undefined): string[] {
  if (!fonts) return [];
  const cleaned = fonts
    .map((f) => (typeof f === "string" ? f.trim() : ""))
    .filter((f) => f.length > 0);
  return dedupe(cleaned);
}

function resolveContent(raw: RawScrapeResult): string {
  if (typeof raw.markdown === "string" && raw.markdown.length > 0) {
    return raw.markdown;
  }
  if (typeof raw.html === "string" && raw.html.length > 0) {
    return stripTags(raw.html);
  }
  return "";
}

/**
 * Pure transform from a loose provider result to a {@link DesignContext}.
 * Never throws on missing fields — degrades gracefully. Fails closed on
 * empty tenantId / url.
 */
export function normalizeScrapeResult(
  tenantId: string,
  url: string,
  raw: RawScrapeResult,
  opts?: { clock?: Clock | undefined },
): DesignContext {
  const safeTenant = tenantSchema.parse(tenantId);
  const safeUrl = urlSchema.parse(url);
  const clock = opts?.clock ?? (() => new Date());

  const screenshot =
    typeof raw.screenshot === "string" && raw.screenshot.length > 0 ? raw.screenshot : undefined;
  const title =
    typeof raw.metadata?.title === "string" && raw.metadata.title.length > 0
      ? raw.metadata.title
      : undefined;

  return {
    tenantId: safeTenant,
    sourceUrl: safeUrl,
    content: resolveContent(raw),
    brand: {
      colors: normalizeColors(raw.branding?.colors),
      fonts: normalizeFonts(raw.branding?.fonts),
    },
    screenshotRef: screenshot,
    title,
    fetchedAt: clock().toISOString(),
  };
}

/**
 * Validate inputs, call the injected provider, normalize the result.
 * tenantId is mandatory and validated before the provider is invoked
 * (fail-closed: no provider call for an invalid tenant).
 */
export async function ingestDesignContext(
  tenantId: string,
  url: string,
  provider: ScrapeProvider,
  opts?: {
    formats?: ScrapeFormat[] | undefined;
    clock?: Clock | undefined;
  },
): Promise<DesignContext> {
  const safeTenant = tenantSchema.parse(tenantId);
  const safeUrl = urlSchema.parse(url);
  const formats = opts?.formats ?? [...DEFAULT_FORMATS];
  const raw = await provider.scrape(safeUrl, { formats });
  return normalizeScrapeResult(safeTenant, safeUrl, raw, {
    clock: opts?.clock,
  });
}

/**
 * Render a compact, deterministic prompt-seed block suitable for
 * prepending to a codegen turn. Pure; output length is bounded.
 */
export function toGenerationSeed(
  ctx: DesignContext,
  opts?: { maxChars?: number | undefined },
): string {
  const maxChars =
    typeof opts?.maxChars === "number" && opts.maxChars > 0 ? opts.maxChars : DEFAULT_MAX_CHARS;

  const header: string[] = ["## Design Context", `Source: ${ctx.sourceUrl}`];
  if (ctx.title) header.push(`Title: ${ctx.title}`);
  if (ctx.brand.colors.length > 0) {
    header.push(`Palette: ${ctx.brand.colors.join(", ")}`);
  }
  if (ctx.brand.fonts.length > 0) {
    header.push(`Fonts: ${ctx.brand.fonts.join(", ")}`);
  }
  if (ctx.screenshotRef) header.push(`Screenshot: ${ctx.screenshotRef}`);

  const headerBlock = header.join("\n");
  const contentLabel = "\n\nContent:\n";
  const budget = maxChars - headerBlock.length - contentLabel.length;

  if (budget <= 0) {
    return headerBlock.slice(0, maxChars);
  }

  const truncated = ctx.content.slice(0, budget);
  return `${headerBlock}${contentLabel}${truncated}`;
}
