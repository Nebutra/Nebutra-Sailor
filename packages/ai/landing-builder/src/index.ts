import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { requireCapabilityTenant } from "@nebutra/capability-kit";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { EventLog } from "@nebutra/event-log";
import { assetId, type BrandContext } from "@nebutra/generation-context";

export type LandingMode = "one_pager" | "marketing_site" | "webapp_mvp" | "site_edit";

export interface OnePagerInput {
  readonly tenantId?: string;
  readonly brand: BrandContext;
  readonly productDesc: string;
  readonly ctaText: string;
  readonly mode?: LandingMode;
}

export interface SiteFile {
  readonly path: string;
  readonly mime: string;
  readonly bytes: number;
}

export interface SitePreview {
  readonly kind: "static-content-store";
  readonly entrypoint: string;
}

export interface DeployHandoff {
  readonly status: "handoff";
  readonly targets: readonly string[];
  readonly manifestPath: string;
  readonly suggestion: string;
}

export interface SitePackage {
  readonly tenantId: string;
  readonly play: "one_pager";
  readonly brandId: string;
  readonly mode: "one_pager";
  readonly files: readonly SiteFile[];
  readonly preview: SitePreview;
  readonly deploy: DeployHandoff;
  readonly eventId: string;
}

export interface TailwindTheme {
  readonly cssVariables: string;
  readonly primary: string;
  readonly background: string;
  readonly accent: string;
}

export interface LandingBuilderDoctorReport {
  readonly capability: "landing-builder";
  readonly ok: boolean;
  readonly checkedAt: string;
  readonly plays: readonly string[];
  readonly modes: readonly LandingMode[];
  readonly deployAdapters: readonly { readonly provider: string; readonly ok: boolean }[];
  readonly suggestion?: string;
}

export interface LandingBuilderOptions {
  readonly tenantId?: string;
  readonly root?: string;
  readonly debugRoot?: string;
  readonly contentStore?: ContentStore;
  readonly eventLog?: EventLog;
}

const PLAY_NAME = "one_pager" as const;

function colorByRole(brand: BrandContext, role: string, fallback: string): string {
  return brand.palette.find((color) => color.role === role)?.hex ?? fallback;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderTailwindTheme(brand: BrandContext): TailwindTheme {
  const primary = colorByRole(brand, "primary", "#111827");
  const background = colorByRole(brand, "background", "#FFFFFF");
  const accent = colorByRole(brand, "accent", primary);
  return {
    primary,
    background,
    accent,
    cssVariables: [
      ":root {",
      `  --brand-primary: ${primary};`,
      `  --brand-background: ${background};`,
      `  --brand-accent: ${accent};`,
      `  --brand-heading: ${brand.typography.heading};`,
      `  --brand-body: ${brand.typography.body};`,
      "}",
      "",
    ].join("\n"),
  };
}

export function renderOnePagerHtml(input: OnePagerInput): string {
  const { brand } = input;
  const theme = renderTailwindTheme(brand);
  const keywords = brand.visualStyle.keywords.join(" / ");
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(brand.name)}</title>`,
    '  <link rel="stylesheet" href="./theme.css" />',
    "</head>",
    `<body data-brand-id="${escapeHtml(brand.brandId)}">`,
    '  <main class="page">',
    '    <section class="hero">',
    `      <p class="eyebrow">${escapeHtml(keywords)}</p>`,
    `      <h1>${escapeHtml(brand.name)}</h1>`,
    `      <p class="lead">${escapeHtml(input.productDesc)}</p>`,
    `      <a class="cta" href="#waitlist">${escapeHtml(input.ctaText)}</a>`,
    "    </section>",
    '    <section class="proof">',
    "      <h2>Why it matters</h2>",
    `      <p>${escapeHtml(brand.toneKeywords.join(", "))} execution, grounded in one shared brand context.</p>`,
    "    </section>",
    '    <section id="waitlist" class="waitlist">',
    "      <h2>Join the waitlist</h2>",
    "      <form>",
    '        <input aria-label="Email" placeholder="you@example.com" />',
    '        <button type="button">Join</button>',
    "      </form>",
    "    </section>",
    "  </main>",
    "</body>",
    "</html>",
    `<!-- ${theme.primary} ${theme.accent} -->`,
    "",
  ].join("\n");
}

function renderThemeCss(brand: BrandContext): string {
  const theme = renderTailwindTheme(brand);
  return [
    theme.cssVariables,
    "* { box-sizing: border-box; }",
    "body { margin: 0; background: var(--brand-background); color: color-mix(in oklab, var(--brand-primary) 80%, black); font-family: var(--brand-body), system-ui, sans-serif; }",
    ".page { min-height: 100vh; }",
    ".hero { min-height: 82vh; display: grid; align-content: center; gap: 24px; padding: clamp(32px, 8vw, 96px); }",
    ".eyebrow { color: var(--brand-accent); font-family: var(--brand-heading), monospace; text-transform: uppercase; letter-spacing: 0; }",
    "h1 { max-width: 11ch; margin: 0; font-family: var(--brand-heading), system-ui; font-size: clamp(56px, 12vw, 132px); line-height: .92; letter-spacing: 0; }",
    ".lead { max-width: 760px; font-size: clamp(20px, 3vw, 34px); line-height: 1.2; }",
    ".cta, button { width: fit-content; border: 0; border-radius: 8px; background: var(--brand-primary); color: var(--brand-background); padding: 14px 20px; font: inherit; text-decoration: none; }",
    ".proof, .waitlist { padding: 48px clamp(32px, 8vw, 96px); border-top: 1px solid color-mix(in oklab, var(--brand-primary) 20%, transparent); }",
    "input { min-width: min(360px, 100%); border: 1px solid color-mix(in oklab, var(--brand-primary) 35%, transparent); border-radius: 8px; padding: 14px 16px; font: inherit; }",
    "form { display: flex; flex-wrap: wrap; gap: 12px; }",
    "",
  ].join("\n");
}

function deployManifest(input: OnePagerInput): string {
  return `${JSON.stringify(
    {
      mode: "one_pager",
      brandId: input.brand.brandId,
      entrypoint: "company/landing/index.html",
      targets: ["managed-hosting", "edge-pages", "static-hosting", "git-pages"],
      requiresExplicitDeployConsent: true,
    },
    null,
    2,
  )}\n`;
}

export class LandingBuilder {
  readonly #tenantId: string | undefined;
  readonly #debugRoot: string;
  readonly #contentStore: ContentStore;
  readonly #eventLog: EventLog;

  private constructor(
    options: LandingBuilderOptions & { contentStore: ContentStore; eventLog: EventLog },
  ) {
    this.#tenantId = options.tenantId;
    this.#debugRoot = options.debugRoot ?? process.cwd();
    this.#contentStore = options.contentStore;
    this.#eventLog = options.eventLog;
  }

  static async open(
    root = ".nebutra/landing-builder",
    options: Omit<LandingBuilderOptions, "root" | "contentStore" | "eventLog"> = {},
  ): Promise<LandingBuilder> {
    const tenantId = options.tenantId ?? "local";
    await mkdir(root, { recursive: true });
    const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
    const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
    return new LandingBuilder({ ...options, tenantId, root, contentStore, eventLog });
  }

  async runOnePager(input: OnePagerInput): Promise<SitePackage> {
    const tenantId = requireCapabilityTenant({
      explicit: input.tenantId ?? input.brand.tenantId,
      fallback: this.#tenantId,
      onMissing: () =>
        new CapabilityError("landing-builder", "Landing Builder requires tenant context", {
          suggestion:
            "Pass tenantId on the input, BrandContext, or construct LandingBuilder with tenantId.",
          statusCode: 400,
        }),
    });
    const html = renderOnePagerHtml(input);
    const css = renderThemeCss(input.brand);
    const manifest = deployManifest(input);
    const files = [
      { path: "company/landing/index.html", mime: "text/html", content: html },
      { path: "company/landing/theme.css", mime: "text/css", content: css },
      { path: "company/landing/deploy.json", mime: "application/json", content: manifest },
    ] as const;
    for (const file of files) await this.#contentStore.write(file.path, file.content);
    const eventId = await this.#eventLog.commit({
      traceId: assetId("landing_builder", input.brand.brandId),
      kind: "content_write",
      affected: files.map((file) => file.path),
      parent: null,
      snapshot: Object.fromEntries(files.map((file) => [file.path, file.content])),
    });
    const result: SitePackage = {
      tenantId,
      play: PLAY_NAME,
      brandId: input.brand.brandId,
      mode: "one_pager",
      files: files.map((file) => ({
        path: file.path,
        mime: file.mime,
        bytes: file.content.length,
      })),
      preview: { kind: "static-content-store", entrypoint: "company/landing/index.html" },
      deploy: {
        status: "handoff",
        targets: ["managed-hosting", "edge-pages", "static-hosting", "git-pages"],
        manifestPath: "company/landing/deploy.json",
        suggestion: "Connect a deploy integration and call the explicit deploy Play after review.",
      },
      eventId,
    };
    await this.#debug({ type: "run", tenantId, brandId: input.brand.brandId, eventId });
    return result;
  }

  async doctor(): Promise<LandingBuilderDoctorReport> {
    return {
      capability: "landing-builder",
      ok: true,
      checkedAt: new Date().toISOString(),
      plays: [PLAY_NAME],
      modes: ["one_pager", "marketing_site", "webapp_mvp", "site_edit"],
      deployAdapters: [
        { provider: "static-content-store", ok: true },
        { provider: "integration-vault", ok: false },
      ],
      suggestion:
        "Static generation is ready; real deploy requires integration-vault deploy adapters.",
    };
  }

  async close(): Promise<void> {
    await this.#contentStore.close();
  }

  async #debug(entry: Record<string, unknown>): Promise<void> {
    await mkdir(dirname(join(this.#debugRoot, ".nebutra", "debug", "landing-builder.jsonl")), {
      recursive: true,
    });
    await appendCapabilityDebug("landing-builder", entry, { root: this.#debugRoot });
  }
}

export async function readLandingBuilderDebug(
  root = process.cwd(),
  limit = 20,
): Promise<unknown[]> {
  return readCapabilityDebug("landing-builder", { root, limit });
}
