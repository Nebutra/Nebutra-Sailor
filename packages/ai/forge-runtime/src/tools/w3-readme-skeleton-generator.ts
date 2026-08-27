/**
 * W3 template root — README skeleton generator.
 *
 * Brief: docs/plans/tools/readme-skeleton-generator.md (archetype §8:
 * configure-then-generate; the options *are* the product).
 *
 * Specs implemented (not a library wrapper):
 *  - GitHub Flavored Markdown (GFM) §4.5 fenced code blocks with an info
 *    string, §6.9 links, and the 2023 alert/callout extension
 *    (`> [!NOTE]`), per docs.github.com "Basic writing and formatting syntax".
 *  - GitHub heading-to-anchor slugification, including the `-1`/`-2`
 *    duplicate suffix, so a generated table of contents actually resolves.
 *  - shields.io badge URL grammar: static `/badge/<label>-<message>-<color>`
 *    with `-` → `--`, `_` → `__`, space → `_` escaping, dynamic endpoints
 *    (`/npm/v/<pkg>`, `/github/actions/workflow/status/...`) and the
 *    `logo=<simple-icons slug>` parameter.
 *  - SPDX license identifiers referenced by id only — the README points at
 *    the LICENSE file, it never embeds license text (brief §7 rule 3).
 *
 * Deterministic and `pure`: no clock, no randomness, no network, no fs.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/**
 * Section ids in *render order*. The order is fixed on purpose (brief §9.4):
 * no drag-to-reorder, so the same input always yields byte-identical markdown
 * and an agent can diff two runs meaningfully.
 *
 * GitHub-*profile* section types (About Me / Skills / Links) are deliberately
 * absent — different JTBD (brief §7 rule 7, §9.4).
 */
export const README_SECTIONS = [
  "title",
  "badges",
  "callout",
  "toc",
  "installation",
  "usage",
  "features",
  "api-reference",
  "screenshots",
  "roadmap",
  "contributing",
  "support",
  "acknowledgements",
  "license",
  "authors",
  "tech-stack",
] as const;

export type ReadmeSection = (typeof README_SECTIONS)[number];

/** The 80% skeleton a brand-new repo needs (brief §9.2 "defaults on arrival"). */
export const README_DEFAULT_SECTIONS: readonly ReadmeSection[] = [
  "title",
  "installation",
  "usage",
  "license",
];

const CALLOUT_KINDS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;

/* ── GitHub anchor slugification ─────────────────────────────────────────
 * Lowercase, strip punctuation (keeping unicode letters, digits, `-`, `_`),
 * spaces → hyphens. Duplicates get `-1`, `-2`, … in document order. A naive
 * lowercase-and-hyphenate silently produces dead links (brief §7 rule 2).
 */
export function githubAnchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function anchorAssigner(): (heading: string) => string {
  const seen = new Map<string, number>();
  return (heading: string) => {
    const base = githubAnchor(heading);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

/** Anchors for a run of headings in document order, duplicates suffixed. */
export function assignAnchors(headings: readonly string[]): string[] {
  const assign = anchorAssigner();
  return headings.map(assign);
}

/* ── shields.io grammar ─────────────────────────────────────────────────── */

/** Static-badge path escaping: `-` → `--`, `_` → `__`, space → `_`. */
export function shieldsEscape(segment: string): string {
  return encodeURIComponent(segment.replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_"));
}

/** simple-icons slugs are lowercase alphanumerics plus `.` and `-`. */
const SIMPLE_ICON_SLUG = /^[a-z0-9][a-z0-9.-]*$/;
/** `owner/repo`, the only shape the GitHub Actions badge endpoint accepts. */
const GITHUB_REPO = /^[\w.-]+\/[\w.-]+$/;
/** npm package name, optionally scoped. */
const NPM_PACKAGE = /^(@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
/** A fence info string is a single token — no spaces, no backticks. */
const FENCE_LANG = /^[A-Za-z0-9+#._-]{0,20}$/;

function fence(language: string, body: string): string {
  // GFM: a code fence without an info string renders unhighlighted, which
  // looks unfinished on the rendered GitHub page (brief §7 rule 5).
  const lang = FENCE_LANG.test(language) && language ? language : "text";
  return `\`\`\`${lang}\n${body}\n\`\`\``;
}

function slugifyProject(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "your-project";
}

function quoteBlock(body: string): string {
  return body
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function nonEmptyLines(values: readonly string[]): string[] {
  return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

/* ── input ──────────────────────────────────────────────────────────────── */

const inputSchema = z.object({
  projectName: z.string().max(200).default(""),
  description: z.string().max(2_000).default(""),
  sections: z
    .array(z.enum(README_SECTIONS))
    .max(README_SECTIONS.length)
    .default([...README_DEFAULT_SECTIONS]),
  installCommand: z.string().max(2_000).default(""),
  installLanguage: z.string().max(20).default("bash"),
  usageExample: z.string().max(20_000).default(""),
  usageLanguage: z.string().max(20).default("bash"),
  features: z.array(z.string().max(300)).max(50).default([]),
  /** SPDX identifier only — never full license text (brief §7 rule 3). */
  license: z.string().max(60).default(""),
  licenseFile: z.string().max(120).default("LICENSE"),
  authors: z.array(z.string().max(120)).max(50).default([]),
  contact: z.string().max(300).default(""),
  badges: z
    .object({
      npmVersion: z.boolean().default(false),
      buildStatus: z.boolean().default(false),
      license: z.boolean().default(false),
    })
    .default({ npmVersion: false, buildStatus: false, license: false }),
  npmPackage: z.string().max(214).default(""),
  /** `owner/repo` — required by the build-status badge endpoint. */
  repo: z.string().max(140).default(""),
  workflowFile: z.string().max(120).default("ci.yml"),
  /** simple-icons slugs, rendered as `logo=` badges. */
  techStack: z.array(z.string().max(60)).max(30).default([]),
  calloutKind: z.enum(CALLOUT_KINDS).default("NOTE"),
  calloutBody: z.string().max(2_000).default(""),
});

export type ReadmeSkeletonInput = z.infer<typeof inputSchema>;

export interface ReadmeSectionOmission {
  readonly section: ReadmeSection;
  readonly reason: string;
}

export interface ReadmeSkeletonOutput {
  readonly markdown: string;
  readonly filename: string;
  readonly sectionsIncluded: readonly ReadmeSection[];
  readonly sectionsOmitted: readonly ReadmeSectionOmission[];
  readonly headings: readonly { text: string; anchor: string }[];
  readonly warnings: readonly string[];
  readonly chars: number;
}

interface Block {
  section: ReadmeSection;
  level: 1 | 2 | 0;
  heading?: string;
  body: string;
  anchor?: string;
}

const HEADINGS: Record<Exclude<ReadmeSection, "title" | "badges" | "callout">, string> = {
  toc: "Table of Contents",
  installation: "Installation",
  usage: "Usage",
  features: "Features",
  "api-reference": "API Reference",
  screenshots: "Screenshots",
  roadmap: "Roadmap",
  contributing: "Contributing",
  support: "Support",
  acknowledgements: "Acknowledgements",
  license: "License",
  authors: "Authors",
  "tech-stack": "Tech Stack",
};

function buildBadges(input: ReadmeSkeletonInput, warnings: string[]): { lines: string[] } {
  const lines: string[] = [];
  if (input.badges.license) {
    const spdx = input.license.trim();
    if (spdx) {
      const label = shieldsEscape("License");
      const message = shieldsEscape(spdx);
      lines.push(
        `[![License: ${spdx}](https://img.shields.io/badge/${label}-${message}-blue.svg)](${input.licenseFile})`,
      );
    } else {
      warnings.push("license badge skipped: no SPDX license id given");
    }
  }
  if (input.badges.npmVersion) {
    const pkg = input.npmPackage.trim();
    if (NPM_PACKAGE.test(pkg)) {
      lines.push(
        `[![npm version](https://img.shields.io/npm/v/${pkg})](https://www.npmjs.com/package/${pkg})`,
      );
    } else {
      warnings.push("npm version badge skipped: npmPackage is empty or not a valid package name");
    }
  }
  if (input.badges.buildStatus) {
    const repo = input.repo.trim();
    const workflow = input.workflowFile.trim() || "ci.yml";
    if (GITHUB_REPO.test(repo)) {
      lines.push(
        `[![Build](https://img.shields.io/github/actions/workflow/status/${repo}/${workflow})](https://github.com/${repo}/actions)`,
      );
    } else {
      warnings.push('build status badge skipped: repo must look like "owner/repo"');
    }
  }
  return { lines };
}

function buildTechStack(input: ReadmeSkeletonInput, warnings: string[]): string[] {
  const badges: string[] = [];
  for (const raw of input.techStack) {
    const slug = raw.trim().toLowerCase();
    if (!SIMPLE_ICON_SLUG.test(slug)) {
      if (slug) warnings.push(`tech stack entry skipped: "${raw}" is not a simple-icons slug`);
      continue;
    }
    badges.push(
      `![${slug}](https://img.shields.io/badge/${shieldsEscape(slug)}-informational?logo=${slug})`,
    );
  }
  return badges;
}

function buildBlocks(
  input: ReadmeSkeletonInput,
  requested: readonly ReadmeSection[],
  omitted: ReadmeSectionOmission[],
  warnings: string[],
): Block[] {
  const blocks: Block[] = [];
  const want = new Set(requested);
  const projectName = input.projectName.trim() || "Project Title";
  const projectSlug = slugifyProject(input.projectName);

  const push = (b: Block) => blocks.push(b);
  const drop = (section: ReadmeSection, reason: string) => omitted.push({ section, reason });

  for (const section of README_SECTIONS) {
    if (!want.has(section)) continue;
    switch (section) {
      case "title": {
        const description =
          input.description.trim() || "One sentence on what this project does and who it is for.";
        push({
          section,
          level: 1,
          heading: projectName,
          body: description,
        });
        break;
      }
      case "badges": {
        const { lines } = buildBadges(input, warnings);
        if (lines.length === 0) {
          // An empty badge row would leave a blank line, not a header —
          // still noise. Drop it rather than emit nothing meaningful.
          drop(section, "no badge had the data it needs");
          break;
        }
        push({ section, level: 0, body: lines.join(" ") });
        break;
      }
      case "callout": {
        const body = input.calloutBody.trim();
        if (!body) {
          drop(section, "callout body is empty");
          break;
        }
        push({
          section,
          level: 0,
          body: quoteBlock(`[!${input.calloutKind}]\n${body}`),
        });
        break;
      }
      case "toc": {
        // Body filled in a second pass, once real anchors exist.
        push({ section, level: 2, heading: HEADINGS.toc, body: "" });
        break;
      }
      case "installation": {
        const command = input.installCommand.trim() || `npm install ${projectSlug}`;
        push({
          section,
          level: 2,
          heading: HEADINGS.installation,
          body: fence(input.installLanguage, command),
        });
        break;
      }
      case "usage": {
        const example = input.usageExample.trim() || `${projectSlug} --help`;
        push({
          section,
          level: 2,
          heading: HEADINGS.usage,
          body: fence(input.usageLanguage, example),
        });
        break;
      }
      case "features": {
        const items = nonEmptyLines(input.features);
        const body =
          items.length > 0
            ? items.map((f) => `- ${f}`).join("\n")
            : ["- What it does that the alternatives do not", "- Second thing worth knowing"].join(
                "\n",
              );
        push({ section, level: 2, heading: HEADINGS.features, body });
        break;
      }
      case "api-reference": {
        push({
          section,
          level: 2,
          heading: HEADINGS["api-reference"],
          body: [
            "| Function | Description |",
            "| --- | --- |",
            "| `doThing(options)` | What it returns, and when it throws |",
          ].join("\n"),
        });
        break;
      }
      case "screenshots": {
        push({
          section,
          level: 2,
          heading: HEADINGS.screenshots,
          body: "![App screenshot](docs/screenshot.png)",
        });
        break;
      }
      case "roadmap": {
        push({
          section,
          level: 2,
          heading: HEADINGS.roadmap,
          body: ["- [ ] Next milestone", "- [ ] The one after that"].join("\n"),
        });
        break;
      }
      case "contributing": {
        push({
          section,
          level: 2,
          heading: HEADINGS.contributing,
          body: "Pull requests are welcome. For a large change, open an issue first so the direction can be agreed before the work happens. See [CONTRIBUTING.md](CONTRIBUTING.md).",
        });
        break;
      }
      case "support": {
        const contact = input.contact.trim();
        const lines = ["Open an issue for bugs and feature requests."];
        if (contact) lines.push(`Other questions: ${contact}`);
        push({ section, level: 2, heading: HEADINGS.support, body: lines.join("\n\n") });
        break;
      }
      case "acknowledgements": {
        push({
          section,
          level: 2,
          heading: HEADINGS.acknowledgements,
          body: ["- Projects, people or prior art this builds on"].join("\n"),
        });
        break;
      }
      case "license": {
        const spdx = input.license.trim();
        if (!spdx) {
          // Never guess a license for someone (brief §7 rule 3).
          drop(section, "no SPDX license id given");
          break;
        }
        push({
          section,
          level: 2,
          heading: HEADINGS.license,
          // Pointer, never the license text itself.
          body: `Distributed under the ${spdx} license. See [${input.licenseFile}](${input.licenseFile}) for the full text.`,
        });
        break;
      }
      case "authors": {
        const items = nonEmptyLines(input.authors);
        if (items.length === 0) {
          drop(section, "no authors given");
          break;
        }
        push({
          section,
          level: 2,
          heading: HEADINGS.authors,
          body: items
            .map((a) =>
              a.startsWith("@") && /^@[\w-]+$/.test(a)
                ? `- [${a}](https://github.com/${a.slice(1)})`
                : `- ${a}`,
            )
            .join("\n"),
        });
        break;
      }
      case "tech-stack": {
        const badges = buildTechStack(input, warnings);
        if (badges.length === 0) {
          drop(section, "no valid simple-icons slug given");
          break;
        }
        push({ section, level: 2, heading: HEADINGS["tech-stack"], body: badges.join(" ") });
        break;
      }
      default: {
        // exhaustive
        break;
      }
    }
  }
  return blocks;
}

export function buildReadme(input: ReadmeSkeletonInput): ReadmeSkeletonOutput {
  const warnings: string[] = [];
  const omitted: ReadmeSectionOmission[] = [];
  // Dedupe requested sections without disturbing the fixed render order.
  const requested = README_SECTIONS.filter((s) => input.sections.includes(s));

  const blocks = buildBlocks(input, requested, omitted, warnings);

  // Anchors are assigned in document order so the `-1`/`-2` duplicate suffix
  // matches what GitHub itself would produce.
  const assign = anchorAssigner();
  for (const b of blocks) {
    if (b.heading) b.anchor = assign(b.heading);
  }

  const tocTargets = blocks.filter((b) => b.level === 2 && b.section !== "toc" && b.heading);
  const tocIndex = blocks.findIndex((b) => b.section === "toc");
  if (tocIndex >= 0) {
    if (tocTargets.length < 2) {
      blocks.splice(tocIndex, 1);
      omitted.push({
        section: "toc",
        reason: "fewer than two linkable sections — a one-line contents list is noise",
      });
    } else {
      const toc = blocks[tocIndex];
      if (toc) toc.body = tocTargets.map((b) => `- [${b.heading}](#${b.anchor})`).join("\n");
    }
  }

  const markdown = `${blocks
    .map((b) => {
      if (b.level === 0) return b.body;
      const hashes = b.level === 1 ? "#" : "##";
      return `${hashes} ${b.heading}\n\n${b.body}`;
    })
    .join("\n\n")}\n`;

  return {
    markdown: blocks.length === 0 ? "" : markdown,
    filename: "README.md",
    sectionsIncluded: blocks.map((b) => b.section),
    sectionsOmitted: omitted,
    headings: blocks
      .filter((b): b is Block & { heading: string; anchor: string } =>
        Boolean(b.heading && b.anchor),
      )
      .map((b) => ({ text: b.heading, anchor: b.anchor })),
    warnings,
    chars: blocks.length === 0 ? 0 : markdown.length,
  };
}

export const readmeSkeletonGeneratorTool = tool({
  id: "dev/readme-skeleton-generator",
  slug: "readme-skeleton-generator",
  category: "dev",
  title: { zh: "README 骨架生成器", en: "README Skeleton Generator" },
  description: {
    zh: "按勾选的章节生成项目 README.md 骨架：GitHub 锚点目录、shields.io 徽章、带语言标记的代码块；未填写的章节不会留下空标题",
    en: "Assemble a project README.md from the sections you tick: GitHub-accurate TOC anchors, shields.io badges, language-tagged code fences, and never an empty header for a section you left off",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.readme_skeleton_generator",
  roots: ["template", "generator"],
  engine: {
    name: "GitHub Flavored Markdown + shields.io badge grammar",
    upstream: "GFM spec 0.29-gfm + GitHub alerts extension + shields.io URL grammar + SPDX ids",
    version: "gfm-0.29",
  },
  seoKeywords: {
    zh: "readme生成器,readme模板,github readme怎么写,readme.md 生成",
    en: "readme generator, create a readme, readme.md template, github readme generator",
  },
  inputSchema,
  execute: (input: ReadmeSkeletonInput) => buildReadme(input),
});

export const w3ReadmeSkeletonGeneratorTools: readonly AnyForgeToolDefinition[] = [
  readmeSkeletonGeneratorTool,
];
