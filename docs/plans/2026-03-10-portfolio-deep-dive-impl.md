# Portfolio Deep Dive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add project detail pages with architecture diagrams, metric panels, and deep storytelling to tsekaluk.dev — plus 6 new high-value projects from Appen and experimental work.

**Architecture:** Extend `projects.ts` with `highlights`, `architecture`, `story`, `images` fields. Create `/work/[slug]` dynamic route with static generation. Cards link to detail pages. No MDX — pure TSX + data-driven.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, `AnimateIn` from `@nebutra/ui/components`, `mermaid` for architecture diagrams (compile-time or client-side), lucide-react icons.

---

### Task 1: Extend Project Interface

**Files:**
- Modify: `apps/tsekaluk-dev/src/lib/projects.ts`

**Step 1: Add new fields to interface**

Add after `status` field:

```typescript
export interface Project {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  icon: string;
  metric?: string;
  url?: string;
  github?: string;
  status: "live" | "building" | "shipped";
  // Deep dive fields
  highlights?: { value: string; label: string }[];
  architecture?: string;
  story?: string;
  images?: string[];
}
```

**Step 2: Build to verify no type errors**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`
Expected: Build passes (new fields are all optional, no breakage)

**Step 3: Commit**

```bash
git add apps/tsekaluk-dev/src/lib/projects.ts
git commit -m "feat(content): extend project interface with deep dive fields"
```

---

### Task 2: Add Deep Content to Existing Projects

**Files:**
- Modify: `apps/tsekaluk-dev/src/lib/projects.ts`

**Context:** Add `highlights`, `architecture`, and `story` to the most compelling existing projects. Start with 4-5 that have the richest source material. Every story must use the "最值钱的思路" — lead with what makes this project worth money.

**Step 1: Add deep content to any2md**

```typescript
{
  slug: "any2md",
  // ... existing fields stay ...
  highlights: [
    { value: "93%", label: "Context Retention" },
    { value: "68", label: "Pages / Min" },
    { value: "20K+", label: "Pages Imported" },
    { value: "70%", label: "Cleanup Reduced" },
  ],
  architecture: `graph LR
    PDF[PDF / DOCX] --> PyMuPDF[PyMuPDF Text Engine]
    PDF --> QwenVL[Qwen-VL Vision Engine]
    PyMuPDF --> Merge[Context Merger]
    QwenVL --> Merge
    Merge --> DeepSeek[DeepSeek LLM]
    DeepSeek --> MD[Structured Markdown]
    DeepSeek -.-> Prompt[Layered Prompt + Few-Shot + CoT]`,
  story: "Most document converters treat pages as flat text — they silently drop formulas, break tables, and lose cross-references. We measured 40% context loss on competitors. any2md uses a dual-engine approach: PyMuPDF extracts text structure while Qwen-VL reads the visual layout. DeepSeek LLM then reconstructs the missing context through layered prompting with few-shot examples and chain-of-thought. The result: 93% context retention at 68 pages/min. One team imported 20,000+ pages into their knowledge base in a single week, cutting manual cleanup by 70%.",
}
```

**Step 2: Add deep content to OCR-Auto, TikTok Pipeline, and 2-3 others**

Use source files from:
- `~/Documents/Appen/2025-10-31/` for OCR-Auto
- `~/Documents/Appen/2025-09-25/` for TikTok Pipeline
- `~/Documents/Appen/2025-09-17/` for MLBB

Read these directories to extract exact metrics and architecture for each.

**Step 3: Build to verify**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`

**Step 4: Commit**

```bash
git add apps/tsekaluk-dev/src/lib/projects.ts
git commit -m "feat(content): add deep dive data to existing projects"
```

---

### Task 3: Add New Projects from Appen + Experimental

**Files:**
- Modify: `apps/tsekaluk-dev/src/lib/projects.ts`
- Modify: `apps/tsekaluk-dev/src/components/sections/work-grid.tsx` (new icons)

**Context:** Add 6 new high-value projects. Read source directories for accurate data. DO NOT fabricate — only use numbers from actual files.

**Step 1: Read source files for each project**

Source directories:
- OCR-Auto: `~/Documents/Appen/2025-10-31/`
- TikTok Visual Search: `~/Documents/Appen/2025-09-25/`
- MLBB Video Analysis: `~/Documents/Appen/2025-09-17/`
- Synapse-Quant: `~/Documents/实验性项目/Synapse-Quant/`
- HM3D Evaluation: `~/Documents/Appen/2025-11-6/`
- 斗星茶叶 ERP: `~/Documents/实验性项目/douxing-tea/`

**Step 2: Add projects to projects array**

Each project needs: slug, name, tagline (story hook), description (2-3 sentences with numbers), tags, icon, metric, status, highlights (3-4 metrics), architecture (Mermaid), story (1-2 paragraphs).

Icons to add to work-grid.tsx:
- `ScanLine` for OCR-Auto (document scanning)
- `Search` for TikTok Visual Search
- `Video` for MLBB Video Analysis
- `LineChart` for Synapse-Quant
- `Box` for HM3D 3D Evaluation
- `Leaf` for 斗星茶叶 (already imported)

**Step 3: Import new icons in work-grid.tsx**

Add to import statement and ICON_MAP:
```typescript
import { ..., ScanLine, Search, Video, LineChart, Box } from "lucide-react";

// In ICON_MAP:
"scan-line": <ScanLine className="h-5 w-5" />,
"search": <Search className="h-5 w-5" />,
"video": <Video className="h-5 w-5" />,
"line-chart": <LineChart className="h-5 w-5" />,
"box": <Box className="h-5 w-5" />,
```

**Step 4: Update about page stats**

Update project count in `src/app/about/page.tsx` from 13 to 19 (or actual count).

**Step 5: Build and verify**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`

**Step 6: Commit**

```bash
git add apps/tsekaluk-dev/src/lib/projects.ts apps/tsekaluk-dev/src/components/sections/work-grid.tsx apps/tsekaluk-dev/src/app/about/page.tsx
git commit -m "feat(content): add 6 new high-value projects from appen and experiments"
```

---

### Task 4: Create Project Detail Page

**Files:**
- Create: `apps/tsekaluk-dev/src/app/work/[slug]/page.tsx`

**Context:** This is the core deliverable — the detail page with 3 sections. Use `generateStaticParams` for static generation. Layout:
1. Top: name + tagline + highlights grid
2. Middle: architecture diagram + story text
3. Bottom: tags + images + links

**Step 1: Create the page file**

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimateIn } from "@nebutra/ui/components";
import { cn } from "@nebutra/ui/utils";
import { ArrowLeft, Github, ExternalLink } from "lucide-react";
import { projects } from "@/lib/projects";
import { MermaidDiagram } from "@/components/mermaid-diagram";

// Icon map imported from work-grid or shared
// (or inline a simpler version)

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const project = projects.find((p) => p.slug === params.slug);
  if (!project) return {};
  return {
    title: `${project.name} — Tseka Luk`,
    description: project.tagline,
  };
}

export default function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = projects.find((p) => p.slug === params.slug);
  if (!project) notFound();

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 md:py-32">
      {/* Back link */}
      <AnimateIn preset="fade">
        <Link
          href="/work"
          className="mb-12 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All Projects
        </Link>
      </AnimateIn>

      {/* Section 1: Header + Highlights */}
      <AnimateIn preset="fadeUp" delay={0.1}>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 font-serif italic text-xl text-gray-500">
          {project.tagline}
        </p>
      </AnimateIn>

      {/* Metric badge */}
      {project.metric && (
        <AnimateIn preset="fadeUp" delay={0.15}>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent-dark)]" />
            <span className="text-sm font-semibold text-[var(--color-accent-dark)]">
              {project.metric}
            </span>
          </div>
        </AnimateIn>
      )}

      {/* Highlights grid */}
      {project.highlights && project.highlights.length > 0 && (
        <AnimateIn preset="fadeUp" delay={0.2}>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {project.highlights.map((h) => (
              <div
                key={h.label}
                className="rounded-2xl border border-gray-100 bg-white p-5 text-center"
              >
                <p className="text-3xl font-bold tracking-tight text-gray-900">
                  {h.value}
                </p>
                <p className="mt-1 text-xs text-gray-500">{h.label}</p>
              </div>
            ))}
          </div>
        </AnimateIn>
      )}

      {/* Section 2: Architecture + Story */}
      <div className="mt-16 space-y-8">
        {/* Architecture diagram */}
        {project.architecture && (
          <AnimateIn preset="fadeUp" inView>
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
              <MermaidDiagram chart={project.architecture} />
            </div>
          </AnimateIn>
        )}

        {/* Story */}
        {project.story && (
          <AnimateIn preset="fadeUp" inView>
            <div className="prose prose-gray max-w-none text-base leading-relaxed text-gray-600">
              {project.story.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </AnimateIn>
        )}
      </div>

      {/* Section 3: Tags + Images + Links */}
      <div className="mt-16 space-y-8 border-t border-gray-100 pt-8">
        {/* Tags */}
        <AnimateIn preset="fadeUp" inView>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gray-100 bg-gray-50/70 px-4 py-1.5 text-sm font-medium text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
        </AnimateIn>

        {/* Images */}
        {project.images && project.images.length > 0 && (
          <AnimateIn preset="fadeUp" inView>
            <div className="grid gap-4 sm:grid-cols-2">
              {project.images.map((src) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-2xl border border-gray-100"
                >
                  <Image
                    src={src}
                    alt={project.name}
                    width={600}
                    height={400}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </AnimateIn>
        )}

        {/* Links */}
        {(project.github || project.url) && (
          <AnimateIn preset="fadeUp" inView>
            <div className="flex items-center gap-4">
              {project.github && (
                <Link
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Github className="h-4 w-4" />
                  Source Code
                </Link>
              )}
              {project.url && (
                <Link
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Live Demo
                </Link>
              )}
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}
```

**Step 2: Build and verify**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`
Expected: All project slugs generate as static routes

**Step 3: Commit**

```bash
git add apps/tsekaluk-dev/src/app/work/\[slug\]/page.tsx
git commit -m "feat: add project detail page /work/[slug]"
```

---

### Task 5: Create Mermaid Diagram Component

**Files:**
- Create: `apps/tsekaluk-dev/src/components/mermaid-diagram.tsx`

**Context:** Client component that renders Mermaid syntax to SVG. Use dynamic import of `mermaid` to keep bundle small.

**Step 1: Install mermaid**

Run: `pnpm --filter @nebutra/tsekaluk-dev add mermaid`

**Step 2: Create component**

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        fontFamily: "var(--font-inter)",
      });
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.render(id, chart).then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      });
    });
    return () => { cancelled = true; };
  }, [chart]);

  if (!svg) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="mermaid-container [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
```

**Step 3: Build and verify**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`

**Step 4: Commit**

```bash
git add apps/tsekaluk-dev/src/components/mermaid-diagram.tsx apps/tsekaluk-dev/package.json
git commit -m "feat: add mermaid diagram component for architecture visualization"
```

---

### Task 6: Make Cards Clickable

**Files:**
- Modify: `apps/tsekaluk-dev/src/components/sections/work-grid.tsx`

**Context:** Wrap each ProjectCard in a Link to `/work/[slug]`. Add visual hover hint.

**Step 1: Update ProjectCard**

Import Link at top (already imported). Wrap the `<article>` in `<Link>`:

```typescript
function ProjectCard({ project }: { project: Project }) {
  const status = STATUS_STYLES[project.status];

  return (
    <Link href={`/work/${project.slug}`} className="block">
      <article
        className={cn(
          "group flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-8",
          "transition-all duration-300",
          "hover:border-[var(--color-accent-dark)] hover:shadow-[0_4px_24px_var(--color-accent-shadow)]",
        )}
      >
        {/* ... rest of card stays the same ... */}
      </article>
    </Link>
  );
}
```

Remove the existing GitHub/URL links section from the card (those move to detail page only), or keep as secondary links — implementer decides based on visual result.

**Step 2: Build and verify**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`

**Step 3: Commit**

```bash
git add apps/tsekaluk-dev/src/components/sections/work-grid.tsx
git commit -m "feat: make project cards clickable, link to detail pages"
```

---

### Task 7: Mine Deep Content for All Projects

**Files:**
- Modify: `apps/tsekaluk-dev/src/lib/projects.ts`

**Context:** This is the CONTENT task — the most important one. For each project, read source files and write `highlights`, `architecture`, and `story`. Use the "最值钱的思路" for every story.

**Source directories to read (per project):**

| Project | Source Directory |
|---------|----------------|
| any2md | `~/Documents/简历/个人履历/详细资料/开源项目作品（部分）/any2md*.md` |
| low-altitude-economy | `~/Documents/简历/个人履历/详细资料/项目五要素.md` (低空经济 section) |
| nebutra-sailor | Current repo `README.md` + `CLAUDE.md` |
| mcm-icm | `~/Documents/简历/个人履历/详细资料/项目五要素.md` (MCM section) |
| biomass-modeling | Same file (数维杯 section) |
| pet-industry | Same file (APMCM section) |
| cursor-export | `~/Documents/简历/个人履历/详细资料/开源项目作品（部分）/Cursor*.md` |
| brand-strategy | `~/Documents/简历/个人履历/详细资料/项目五要素.md` (品牌 section) |
| mineru-skill | `~/Documents/GitHub/MinerU-Skill/README.md` |
| warehouse-drone | `~/Documents/简历/个人履历/详细资料/项目五要素.md` (无人机 section) |
| cdtmp | `~/Documents/简历/个人履历/详细资料/开源项目作品（部分）/CDTMP*.md` |
| hydrogem-web | `~/Documents/简历/个人履历/详细资料/项目五要素.md` (HydroGem section) |
| next-unicorn | `~/Documents/GitHub/Next-Unicorn-Skill/README.md` |
| ocr-auto | `~/Documents/Appen/2025-10-31/` (all .md files) |
| tiktok-pipeline | `~/Documents/Appen/2025-09-25/` (README.md + SOP) |
| mlbb-analysis | `~/Documents/Appen/2025-09-17/` (all .md files) |
| synapse-quant | `~/Documents/实验性项目/Synapse-Quant/README.md` |
| hm3d-eval | `~/Documents/Appen/2025-11-6/` (all .md files) |
| douxing-tea | `~/Documents/实验性项目/douxing-tea/THESIS_COMPLETION_SUMMARY.md` |

**Rules:**
- Every `story` must lead with what makes this valuable ("最值钱的思路")
- Every `highlights` must have 3-4 concrete numbers from source files
- Every `architecture` must be valid Mermaid syntax
- Do NOT fabricate numbers — use exact values from source files
- If a project doesn't have enough source material for deep content, skip the optional fields (card-only is fine)

**Step 1: Read all source files listed above**

**Step 2: Write highlights, architecture, story for each project**

**Step 3: Build and verify**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`

**Step 4: Commit**

```bash
git add apps/tsekaluk-dev/src/lib/projects.ts
git commit -m "feat(content): add deep dive content for all projects"
```

---

### Task 8: Copy Certificate Images

**Files:**
- Copy from: `~/Documents/简历/个人履历/详细资料/个人荣誉/`
- Copy to: `apps/tsekaluk-dev/public/images/awards/`

**Step 1: Create target directory**

```bash
mkdir -p apps/tsekaluk-dev/public/images/awards
```

**Step 2: List available images and select relevant ones**

```bash
ls ~/Documents/简历/个人履历/详细资料/个人荣誉/
```

Select images matching portfolio projects (math modeling prizes, electronic design, brand strategy, etc.)

**Step 3: Copy and optimize**

For each selected image, compress to <200KB using sharp or sips:
```bash
sips -Z 800 <source> --out apps/tsekaluk-dev/public/images/awards/<name>.jpg
```

**Step 4: Add image paths to relevant projects**

In `projects.ts`, add `images: ["/images/awards/xxx.jpg"]` to matching projects.

**Step 5: Build and verify**

Run: `pnpm turbo build --filter=@nebutra/tsekaluk-dev`

**Step 6: Commit**

```bash
git add apps/tsekaluk-dev/public/images/awards/ apps/tsekaluk-dev/src/lib/projects.ts
git commit -m "feat: add award certificate images to project detail pages"
```

---

### Task 9: Update Portfolio-Miner Skill

**Files:**
- Modify: `~/.claude/skills/portfolio-miner/skill.md`

**Step 1: Update skill to reflect new deep-dive workflow**

The skill should now document:
- The full Project interface (including highlights, architecture, story, images)
- The deep mining process (read all source files → extract metrics → generate Mermaid → write story)
- Source directory mapping (which Documents/ subdirs map to which projects)
- The detail page structure (3 sections)
- Quality gates for deep content (every story leads with value, every highlight has real numbers)

**Step 2: Commit**

```bash
git add ~/.claude/skills/portfolio-miner/skill.md
git commit -m "chore: update portfolio-miner skill with deep dive workflow"
```

---

### Task 10: Final Build + Visual Verification

**Step 1: Full build**

```bash
pnpm turbo build --filter=@nebutra/tsekaluk-dev
```

Expected: All static routes generated, including `/work/[slug]` for every project.

**Step 2: Dev server check**

```bash
pnpm --filter @nebutra/tsekaluk-dev dev
```

Open browser:
- `/work` — cards should be clickable
- `/work/any2md` — detail page with highlights + architecture diagram + story
- `/work/ocr-auto` — new Appen project detail page
- Check mobile responsiveness

**Step 3: Commit any fixes**

```bash
git commit -m "fix: polish detail page layout and responsive behavior"
```
