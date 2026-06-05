# TsekaLuk.dev Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `apps/tseka-dev` — a personal brand platform for Tseka Luk, styled as an AI-SaaS product showroom with automated daily content via OpenClaw Cron.

**Architecture:** New Next.js 16 app in Nebutra-Sailor monorepo (`apps/tseka-dev`), scaffolded from `apps/landing-page`. Shares `@nebutra/ui`, `@nebutra/tokens`, `@nebutra/analytics`, `@nebutra/marketing`. Custom lime accent (`#a3e635`) overrides brand tokens locally. Content via MDX (no CMS). `/now` page auto-fed by daily OpenClaw Cron job.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Framer Motion 12, `@next/mdx`, Inter + Playfair Display, pnpm workspaces, Vercel

---

## Task 1: Bootstrap `apps/tseka-dev`

**Files:**

- Create: `apps/tseka-dev/package.json`
- Create: `apps/tseka-dev/next.config.ts`
- Create: `apps/tseka-dev/tsconfig.json`
- Create: `apps/tseka-dev/postcss.config.mjs`
- Create: `apps/tseka-dev/src/app/globals.css`
- Create: `apps/tseka-dev/src/app/layout.tsx`
- Create: `apps/tseka-dev/src/app/page.tsx`

**Step 1: Create package.json**

```json
{
  "name": "@nebutra/tseka-dev",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3002",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint"
  },
  "dependencies": {
    "@nebutra/analytics": "workspace:*",
    "@nebutra/brand": "workspace:*",
    "@nebutra/marketing": "workspace:*",
    "@nebutra/tokens": "workspace:*",
    "@nebutra/ui": "workspace:*",
    "@next/mdx": "^16.1.6",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.35.0",
    "lucide-react": "^0.577.0",
    "next": "^16.1.6",
    "next-themes": "^0.4.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tailwind-merge": "^3.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.19.15",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@tailwindcss/postcss": "^4.2.1",
    "eslint": "^9.39.3",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Create next.config.ts**

```ts
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const config: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    mdxRs: true,
  },
};

export default withMDX(config);
```

**Step 3: Create tsconfig.json** (copy from `apps/landing-page/tsconfig.json`, change `name` to `tseka-dev`)

**Step 4: Create postcss.config.mjs**

```mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

**Step 5: Create placeholder page**

```tsx
// src/app/page.tsx
export default function Home() {
  return <main>TsekaLuk.dev — coming soon</main>;
}
```

**Step 6: Install dependencies**

```bash
cd ~/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm install
```

**Step 7: Verify dev server starts**

```bash
pnpm --filter @nebutra/tseka-dev dev
```

Expected: Server running at `http://localhost:3002`

**Step 8: Commit**

```bash
git add apps/tseka-dev/
git commit -m "feat(tseka-dev): bootstrap app scaffold"
```

---

## Task 2: Design Tokens — Lime Brand Override

**Files:**

- Create: `apps/tseka-dev/src/app/globals.css`
- Create: `apps/tseka-dev/src/app/layout.tsx`

**Step 1: Create globals.css with lime accent override**

```css
/* apps/tseka-dev/src/app/globals.css */
@import "@nebutra/tokens/styles.css";
@import "tailwindcss";

:root {
  /* Override brand accent with lime for personal brand */
  --color-accent: #a3e635;
  --color-accent-dark: #84cc16;
  --color-accent-muted: #d9f99d;

  /* Page background */
  --page-bg: #fafafa;

  /* Fonts */
  --font-sans: var(--font-inter);
  --font-serif: var(--font-playfair);
}

body {
  background-color: var(--page-bg);
  font-family: var(--font-sans);
  @apply antialiased text-gray-900 overflow-x-hidden;
}

/* Playfair Display utilities */
.font-serif {
  font-family: var(--font-serif);
}
```

**Step 2: Create root layout with fonts**

```tsx
// apps/tseka-dev/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Tseka Luk — AI-Native Builder",
  description:
    "CEO of Nebutra Intelligence. Building AI-native products for global markets.",
  metadataBase: new URL("https://tsekaluk.dev"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
```

**Step 3: Verify fonts load**

```bash
pnpm --filter @nebutra/tseka-dev dev
```

Open `http://localhost:3002` — check network tab for font files loading.

**Step 4: Commit**

```bash
git add apps/tseka-dev/src/app/
git commit -m "feat(tseka-dev): add lime design tokens and font system"
```

---

## Task 3: Site Shell — Header + Footer

**Files:**

- Create: `apps/tseka-dev/src/components/header.tsx`
- Create: `apps/tseka-dev/src/components/footer.tsx`
- Modify: `apps/tseka-dev/src/app/layout.tsx`

**Step 1: Create Header**

```tsx
// apps/tseka-dev/src/components/header.tsx
"use client";
import Link from "next/link";
import { useState } from "react";

const nav = [
  { href: "/work", label: "Work" },
  { href: "/thinking", label: "Thinking" },
  { href: "/now", label: "Now" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-40">
      <Link
        href="/"
        className="font-serif italic text-2xl tracking-tight text-gray-900"
      >
        Tseka
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-8">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-base text-gray-600 hover:text-gray-900 transition-colors"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/about#contact"
          className="px-5 py-2 bg-gray-900 text-white rounded-full text-sm hover:bg-black transition-colors"
        >
          Let's talk
        </Link>
      </nav>

      {/* Mobile menu button */}
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 rounded-full border border-gray-200/50 bg-white/50"
      >
        <span className="block w-5 h-px bg-gray-900 mb-1" />
        <span className="block w-5 h-px bg-gray-900 mb-1" />
        <span className="block w-3 h-px bg-gray-900" />
      </button>

      {/* Mobile nav */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 p-6 flex flex-col gap-4 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="text-xl text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
```

**Step 2: Create Footer**

```tsx
// apps/tseka-dev/src/components/footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
      <p className="text-sm text-gray-400">
        © {new Date().getFullYear()} Tseka Luk. Built with{" "}
        <a
          href="https://github.com/Nebutra/Nebutra-Sailor"
          className="underline hover:text-gray-600 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Nebutra Sailor
        </a>
        .
      </p>
      <div className="flex gap-6 text-sm text-gray-400">
        <Link
          href="https://x.com/tseka_luk"
          className="hover:text-gray-900 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          X
        </Link>
        <Link
          href="https://github.com/TsekaLuk"
          className="hover:text-gray-900 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </Link>
      </div>
    </footer>
  );
}
```

**Step 3: Add to root layout**

```tsx
// In layout.tsx body:
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

// <body>
//   <Header />
//   <main id="main-content">{children}</main>
//   <Footer />
// </body>
```

**Step 4: Verify layout renders**

Open `http://localhost:3002` — header and footer should appear.

**Step 5: Commit**

```bash
git add apps/tseka-dev/src/
git commit -m "feat(tseka-dev): add header and footer shell"
```

---

## Task 4: Hero Section

**Files:**

- Create: `apps/tseka-dev/src/components/sections/hero.tsx`
- Modify: `apps/tseka-dev/src/app/page.tsx`

**Step 1: Create Hero component**

```tsx
// apps/tseka-dev/src/components/sections/hero.tsx
"use client";
import { motion } from "@/shared/motion";

const pills = [
  { label: "CEO @ Nebutra Intelligence", icon: "🌌" },
  { label: "Next.js · AI-Native · 出海", icon: "⚡" },
  { label: "Wuxi, China", icon: "📍" },
  { label: "Building in public", icon: "🛠" },
];

export function Hero() {
  return (
    <section className="relative pt-12 pb-24 flex flex-col items-center overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-x-0 top-0 h-[700px] bg-gradient-to-b from-[#a3e635]/60 via-[#a3e635]/15 to-[#fafafa] -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-[radial-gradient(ellipse_at_center,#a3e635_0%,transparent_70%)] blur-3xl -z-10 opacity-40 pointer-events-none" />

      {/* Status badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2 mb-10 z-20"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a3e635] opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#84cc16]" />
        </span>
        <span className="text-sm text-gray-700 font-normal tracking-tight">
          Available for select collaborations
        </span>
      </motion.div>

      {/* Headlines */}
      <div className="z-20 flex flex-col text-center px-4 items-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-[6vw] leading-none font-normal text-gray-900 tracking-tighter"
        >
          Hi, I'm Tseka
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-6xl md:text-[8vw] leading-none font-normal italic font-serif text-gray-900 tracking-tighter -mt-2 md:-mt-4"
        >
          AI-Native Builder
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-6 text-xl text-gray-600 max-w-xl leading-relaxed"
        >
          Making AI productivity accessible to everyone. Building the future of
          intelligent, lightweight entrepreneurship.
        </motion.p>
      </div>

      {/* Floating pills */}
      <div className="relative w-full max-w-3xl mt-16 hidden md:block h-32">
        {pills.map((pill, i) => {
          const positions = [
            "top-0 left-8",
            "top-0 right-8",
            "bottom-0 left-24",
            "bottom-0 right-24",
          ];
          return (
            <motion.div
              key={pill.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
              className={`absolute ${positions[i]} flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-100/80 text-sm text-gray-700`}
            >
              <span>{pill.icon}</span>
              {pill.label}
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-16 md:mt-8 flex gap-4 flex-wrap justify-center z-20"
      >
        <a
          href="/work"
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full text-base font-normal hover:bg-black transition-colors"
        >
          See my work →
        </a>
        <a
          href="/now"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-900 px-8 py-4 rounded-full text-base font-normal hover:border-gray-300 transition-colors"
        >
          What I'm doing now
        </a>
      </motion.div>
    </section>
  );
}
```

**Step 2: Wire into page.tsx**

```tsx
// apps/tseka-dev/src/app/page.tsx
import { Hero } from "@/components/sections/hero";
export default function Home() {
  return <Hero />;
}
```

**Step 3: Verify hero renders correctly**

Open `http://localhost:3002` — lime gradient hero, animated headlines, floating pills.

**Step 4: Commit**

```bash
git add apps/tseka-dev/src/
git commit -m "feat(tseka-dev): add hero section with lime gradient and animations"
```

---

## Task 5: /work Page

**Files:**

- Create: `apps/tseka-dev/src/app/work/page.tsx`
- Create: `apps/tseka-dev/src/components/sections/work-grid.tsx`
- Create: `apps/tseka-dev/src/lib/projects.ts`

**Step 1: Define projects data**

```ts
// apps/tseka-dev/src/lib/projects.ts
export interface Project {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  url?: string;
  github?: string;
  status: "live" | "building" | "shipped";
}

export const projects: Project[] = [
  {
    slug: "nebutra-sailor",
    name: "Nebutra Sailor",
    tagline: "Enterprise AI-native SaaS platform",
    description:
      "Open-source monorepo architecture for building multi-tenant AI platforms. Next.js 16, Prisma, multi-agent workflows.",
    tags: ["Next.js", "AI", "SaaS", "Open Source"],
    github: "https://github.com/Nebutra/Nebutra-Sailor",
    status: "building",
  },
  {
    slug: "mineru-skill",
    name: "MinerU-Skill",
    tagline: "PDF → Markdown AI conversion tool",
    description:
      "Claude Code skill for converting PDFs and documents to clean Markdown using MinerU. Production-grade, globally adopted.",
    tags: ["Claude", "Developer Tool", "Open Source"],
    github: "https://github.com/TsekaLuk/MinerU-Skill",
    status: "live",
  },
  {
    slug: "breakdown",
    name: "Breakdown",
    tagline: "AI product marketing OS",
    description:
      "Next.js 15 marketing site showcasing AI product narrative design. Dark theme, Framer Motion, 清华紫 brand system.",
    tags: ["Next.js", "Marketing", "Design"],
    status: "shipped",
  },
  {
    slug: "polaris-web",
    name: "Polaris Web",
    tagline: "斗星茶业 brand experience",
    description:
      "Premium tea brand website. Solved localStorage SSR hydration, built custom scroll animations.",
    tags: ["Next.js", "Brand", "Chinese Market"],
    status: "live",
  },
];
```

**Step 2: Create WorkGrid component**

```tsx
// apps/tseka-dev/src/components/sections/work-grid.tsx
"use client";
import { motion } from "@/shared/motion";
import type { Project } from "@/lib/projects";

const statusLabel: Record<Project["status"], string> = {
  live: "Live",
  building: "In progress",
  shipped: "Shipped",
};

export function WorkGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {projects.map((project, i) => (
        <motion.article
          key={project.slug}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className="group bg-white border border-gray-100 rounded-3xl p-8 hover:border-[#a3e635] hover:shadow-[0_8px_30px_rgba(163,230,53,0.1)] transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-gray-400 font-normal">
              {statusLabel[project.status]}
            </span>
            <div className="flex gap-2">
              {project.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 bg-gray-50 rounded-full text-gray-500 border border-gray-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <h3 className="text-2xl font-normal tracking-tight text-gray-900 mb-2">
            {project.name}
          </h3>
          <p className="text-base text-gray-500 font-serif italic mb-4">
            {project.tagline}
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {project.description}
          </p>
          {(project.url || project.github) && (
            <div className="mt-6 flex gap-4">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-900 underline hover:text-[#84cc16] transition-colors"
                >
                  Visit →
                </a>
              )}
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  GitHub
                </a>
              )}
            </div>
          )}
        </motion.article>
      ))}
    </div>
  );
}
```

**Step 3: Create /work page**

```tsx
// apps/tseka-dev/src/app/work/page.tsx
import { WorkGrid } from "@/components/sections/work-grid";
import { projects } from "@/lib/projects";

export default function WorkPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-24">
      <div className="mb-16">
        <p className="font-serif italic text-xl text-gray-400 mb-3">
          / What I've built
        </p>
        <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-gray-900">
          Products & Projects
        </h1>
      </div>
      <WorkGrid projects={projects} />
    </main>
  );
}
```

**Step 4: Commit**

```bash
git add apps/tseka-dev/src/
git commit -m "feat(tseka-dev): add /work page with project grid"
```

---

## Task 6: /now Page (MDX-driven)

**Files:**

- Create: `apps/tseka-dev/src/app/now/page.tsx`
- Create: `apps/tseka-dev/content/now/current.mdx`
- Create: `apps/tseka-dev/src/components/sections/now-entry.tsx`

**Step 1: Create now page**

```tsx
// apps/tseka-dev/src/app/now/page.tsx
import { NowEntry } from "@/components/sections/now-entry";

export default function NowPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-24">
      <div className="mb-16">
        <p className="font-serif italic text-xl text-gray-400 mb-3">
          / Updated daily
        </p>
        <h1 className="text-5xl font-normal tracking-tight text-gray-900">
          Now
        </h1>
        <p className="mt-4 text-gray-500">
          A living record of what I'm building, thinking, and shipping.
          Auto-updated by my AI agent every morning.
        </p>
      </div>
      <NowEntry />
    </main>
  );
}
```

**Step 2: Create NowEntry component that reads latest MDX**

```tsx
// apps/tseka-dev/src/components/sections/now-entry.tsx
import fs from "node:fs";
import path from "node:path";

interface NowData {
  date: string;
  building: string[];
  thinking: string[];
  shipped: string[];
  reading: string[];
}

function readLatestNow(): NowData | null {
  try {
    const dir = path.join(process.cwd(), "content/now");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();
    if (!files[0]) return null;
    const raw = fs.readFileSync(path.join(dir, files[0]), "utf-8");
    return JSON.parse(raw) as NowData;
  } catch {
    return null;
  }
}

export function NowEntry() {
  const data = readLatestNow();

  if (!data) {
    return (
      <p className="text-gray-400 italic">
        No updates yet. Check back tomorrow.
      </p>
    );
  }

  const sections: {
    key: keyof Omit<NowData, "date">;
    label: string;
    emoji: string;
  }[] = [
    { key: "building", label: "Building", emoji: "🔨" },
    { key: "thinking", label: "Thinking", emoji: "💡" },
    { key: "shipped", label: "Shipped", emoji: "🚀" },
    { key: "reading", label: "Reading", emoji: "📖" },
  ];

  return (
    <div className="space-y-10">
      <p className="text-sm text-gray-400 font-mono">
        Last updated: {data.date}
      </p>
      {sections.map((section) => {
        const items = data[section.key];
        if (!items?.length) return null;
        return (
          <div key={section.key}>
            <h2 className="flex items-center gap-2 text-lg font-normal tracking-tight text-gray-900 mb-4 border-b border-gray-100 pb-3">
              <span>{section.emoji}</span> {section.label}
            </h2>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li
                  key={i}
                  className="text-gray-600 text-base leading-relaxed pl-4 border-l-2 border-[#a3e635]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Create initial now content (JSON format)**

```bash
mkdir -p apps/tseka-dev/content/now
```

```json
// apps/tseka-dev/content/now/2026-03-09.json
{
  "date": "2026-03-09",
  "building": [
    "TsekaLuk.dev — personal brand platform on Nebutra-Sailor",
    "Nebutra Sailor v2 — agent-native SaaS architecture"
  ],
  "thinking": [
    "Personal brand as a product: ship daily, compound weekly",
    "Why 出海 means designing for trust before features"
  ],
  "shipped": [
    "OpenClaw 2026.3.8 upgrade — overnight autonomous agent pipeline live",
    "Fixed 3 failing cron jobs, added 4 new overnight Claude Code tasks"
  ],
  "reading": ["Vibe Business: from vibe coding to vibe entrepreneurship"]
}
```

**Step 4: Commit**

```bash
git add apps/tseka-dev/
git commit -m "feat(tseka-dev): add /now page with JSON-driven daily updates"
```

---

## Task 7: /thinking Page

**Files:**

- Create: `apps/tseka-dev/src/app/thinking/page.tsx`
- Create: `apps/tseka-dev/content/thinking/2026-03-09-personal-brand-as-product.mdx`
- Create: `apps/tseka-dev/src/lib/articles.ts`

**Step 1: Article metadata helper**

```ts
// apps/tseka-dev/src/lib/articles.ts
import fs from "node:fs";
import path from "node:path";

export interface ArticleMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
}

export function getArticles(): ArticleMeta[] {
  const dir = path.join(process.cwd(), "content/thinking");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      // Read frontmatter block between --- delimiters
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      const fm = match ? match[1] : "";
      const get = (key: string) =>
        fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
      const tagsMatch = fm.match(/^tags:\s*\[(.+)\]$/m);
      const tags = tagsMatch
        ? tagsMatch[1].split(",").map((t) => t.trim().replace(/['"]/g, ""))
        : [];
      return {
        slug: file.replace(".mdx", ""),
        title: get("title"),
        date: get("date"),
        excerpt: get("excerpt"),
        tags,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
```

**Step 2: /thinking index page**

```tsx
// apps/tseka-dev/src/app/thinking/page.tsx
import Link from "next/link";
import { getArticles } from "@/lib/articles";

export default function ThinkingPage() {
  const articles = getArticles();
  return (
    <main className="max-w-3xl mx-auto px-6 py-24">
      <div className="mb-16">
        <p className="font-serif italic text-xl text-gray-400 mb-3">
          / Long-form
        </p>
        <h1 className="text-5xl font-normal tracking-tight text-gray-900">
          Thinking
        </h1>
      </div>
      <div className="space-y-8">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/thinking/${article.slug}`}
            className="block group"
          >
            <article className="border-b border-gray-100 pb-8 hover:border-[#a3e635] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <time className="text-sm text-gray-400 font-mono">
                  {article.date}
                </time>
                <div className="flex gap-2">
                  {article.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs text-gray-400 px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <h2 className="text-2xl font-normal tracking-tight text-gray-900 group-hover:text-gray-600 transition-colors mb-2">
                {article.title}
              </h2>
              <p className="text-gray-500 text-base leading-relaxed">
                {article.excerpt}
              </p>
            </article>
          </Link>
        ))}
        {articles.length === 0 && (
          <p className="text-gray-400 italic">First article coming soon.</p>
        )}
      </div>
    </main>
  );
}
```

**Step 3: Create first article seed**

```mdx
---
title: Personal Brand as a Product
date: 2026-03-09
excerpt: Most people treat their personal brand like a static resume. I treat mine like a SaaS product — shipped daily, measured weekly, iterated continuously.
tags: ["growth", "personal brand", "AI"]
---

# Personal Brand as a Product

Most people treat their personal brand like a static resume. I treat mine like a SaaS product.

The insight is simple: a product that doesn't ship isn't a product — it's a prototype. The same is true for a personal brand that only updates when you remember to.

## The Compounding Math

One thoughtful public update per day. 365 days a year.

That's 365 data points that tell the world who you are, what you think, and what you build. Each one individually forgettable. Collectively, they become an unmistakable signal.

This site runs on that principle. Every morning, my AI agent scans my work from the previous day — commits, decisions, experiments — and distills the high-signal moments into public updates.

I review. I approve. The world sees a version of my thinking that I'm proud of.

## Why This Matters for Negotiating Power

Negotiating power comes from being _known for something specific_ before the conversation starts.

When you walk into a room and the other person already knows your work, your perspective, your trajectory — the conversation starts from a different place. You're not pitching. You're continuing.

## The Sailor Connection

This site is built with [Nebutra Sailor](https://github.com/Nebutra/Nebutra-Sailor) — the open-source enterprise SaaS platform I'm building.

Using your own tools in public is the best kind of dogfooding. Every limitation I hit on this site becomes a feature request for Sailor. Every elegant solution becomes a pattern in the component library.

Build in public. Ship daily. Let it compound.
```

**Step 4: Commit**

```bash
git add apps/tseka-dev/
git commit -m "feat(tseka-dev): add /thinking page and first article"
```

---

## Task 8: /about Page

**Files:**

- Create: `apps/tseka-dev/src/app/about/page.tsx`

**Step 1: Create about page**

```tsx
// apps/tseka-dev/src/app/about/page.tsx
"use client";
import { motion } from "@/shared/motion";

const timeline = [
  { year: "2020", role: "Self-taught", org: "Web + Marketing Fundamentals" },
  { year: "2023", role: "AI-Native Engineer", org: "Vibe Coding movement" },
  { year: "2024", role: "Founder", org: "Wuxi Nebutra Intelligence Technology" },
  { year: "2025", role: "CEO", org: "Nebutra Intelligence" },
  { year: "Now", role: "Building", org: "AI-native unicorn products" },
];

export default function AboutPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-24">
      <div className="mb-16">
        <p className="font-serif italic text-xl text-gray-400 mb-3">
          / Who I am
        </p>
        <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-gray-900">
          Building intelligent systems,{" "}
          <span className="font-serif italic text-gray-400">
            not just products.
          </span>
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-16 items-start">
        <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
          <p>
            I'm Tseka — CEO of Nebutra Intelligence, based in Wuxi, China. I
            build AI-native products designed for global markets from day one.
          </p>
          <p>
            My philosophy:{" "}
            <strong className="text-gray-900">Vibe Business</strong>. AI handles
            the scaffolding. Humans handle the taste. The last 10% — security,
            scalability, product-market fit — is where I live.
          </p>
          <p>
            I'm an INTP who ships. I care deeply about the craft of building
            things people actually use, and I believe the best products emerge
            from understanding change before it becomes obvious.
          </p>
        </div>

        <div className="space-y-0">
          <h2 className="text-lg font-normal text-gray-400 mb-6 uppercase tracking-widest text-sm">
            Timeline
          </h2>
          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-between py-4 border-t border-gray-100 last:border-b"
            >
              <div className="flex gap-6 items-center">
                <span className="text-sm font-mono text-gray-400 w-10">
                  {item.year}
                </span>
                <span className="text-base text-gray-900">{item.role}</span>
              </div>
              <span className="text-sm text-gray-400">{item.org}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact anchor */}
      <div
        id="contact"
        className="mt-24 pt-12 border-t border-gray-100 text-center"
      >
        <h2 className="text-4xl font-normal tracking-tight text-gray-900 mb-4">
          Let's build something
        </h2>
        <p className="text-gray-500 mb-8">
          Open to collaborations, consulting, and interesting problems.
        </p>
        <a
          href="mailto:tseka@nebutra.com"
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-full text-base hover:bg-black transition-colors"
        >
          Get in touch →
        </a>
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add apps/tseka-dev/src/app/about/
git commit -m "feat(tseka-dev): add /about page with timeline"
```

---

## Task 9: OpenClaw Cron — Portfolio Content Mining

**Goal:** Daily 05:00 CST scan → generate `/now` JSON + `/thinking` seed → Telegram review → git push → Vercel deploy.

**Step 1: Create workspace output directory**

```bash
mkdir -p ~/.openclaw/workspace/tseka-dev-content
```

**Step 2: Add OpenClaw Cron job**

```bash
openclaw cron add \
  --name "Portfolio内容挖矿" \
  --cron "0 5 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --timeout-seconds 600 \
  --channel telegram \
  --to 5408856674 \
  --announce \
  --message "Portfolio内容挖矿任务：

1. 读取 ~/.openclaw/workspace/memory/$(date +%Y-%m-%d).md 和昨天的 memory 文件
2. 用 git log --since='24 hours ago' --all --oneline 扫描所有仓库的最新提交
3. 运行：
   claude --dangerously-skip-permissions -p '你是 Tseka 的个人品牌策略师。基于以下今日工作记录，提炼出高含金量内容：

   A) /now 更新（JSON格式）：
   {
     \"date\": \"YYYY-MM-DD\",
     \"building\": [\"3句话，描述今天在做什么\"],
     \"thinking\": [\"2-3个今天产生的有价值洞察\"],
     \"shipped\": [\"今天完成了什么具体的事\"],
     \"reading\": [\"今天接触到的有价值内容\"]
   }

   B) /thinking 文章种子（如果今天有值得深入的主题）：
   标题：一句话
   摘要：100字以内
   核心论点：3点

   要求：英文，第一人称，真实有个性，不要营销腔。只提炼真正有价值的内容，宁缺勿滥。' --output-format text

4. 将 JSON 结果保存到 ~/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/tseka-dev/content/now/$(date +%Y-%m-%d).json
5. 如果有文章种子，保存到 ~/.openclaw/workspace/tseka-dev-content/$(date +%Y-%m-%d)-article-seed.md
6. 发 Telegram 消息告知今日内容摘要，提示审阅后运行 git push 发布"
```

**Step 3: Verify cron was added**

```bash
openclaw cron list
```

Expected: "Portfolio内容挖矿" appears with `0 5 * * *` schedule, status `idle`.

**Step 4: Commit**

```bash
git add apps/tseka-dev/content/
git commit -m "feat(tseka-dev): add portfolio content mining cron pipeline"
```

---

## Task 10: Vercel Deployment

**Step 1: Create GitHub public repo**

```bash
gh repo create TsekaLuk/TsekaLuk.dev --public --description "Personal brand platform — built with Nebutra Sailor"
```

**Step 2: Add Vercel project config**

Create `apps/tseka-dev/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm --filter @nebutra/tseka-dev build",
  "outputDirectory": "apps/tseka-dev/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

**Step 3: Deploy via Vercel CLI**

```bash
cd ~/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/tseka-dev
vercel --prod
```

When prompted: link to new project, name it `tseka-dev`, domain `tsekaluk.dev`.

**Step 4: Set up auto-deploy**

In Vercel dashboard → Project Settings → Git → connect `TsekaLuk/TsekaLuk.dev` repo, set root directory to `apps/tseka-dev`.

**Step 5: Final commit**

```bash
git add apps/tseka-dev/vercel.json
git commit -m "feat(tseka-dev): add vercel deployment config"
git push origin main
```

---

## Task 11: Wire Hero → /now Preview on Homepage

**Files:**

- Modify: `apps/tseka-dev/src/app/page.tsx`
- Create: `apps/tseka-dev/src/components/sections/now-preview.tsx`

**Step 1: Create NowPreview**

```tsx
// apps/tseka-dev/src/components/sections/now-preview.tsx
import Link from "next/link";
import { NowEntry } from "./now-entry";

export function NowPreview() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-16 border-t border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-normal tracking-tight text-gray-900">
          What I'm doing <span className="font-serif italic">now</span>
        </h2>
        <Link
          href="/now"
          className="text-sm text-gray-400 hover:text-gray-900 transition-colors"
        >
          Full log →
        </Link>
      </div>
      <NowEntry preview />
    </section>
  );
}
```

**Step 2: Add `preview` prop to NowEntry** — show only `building` and `shipped` sections when `preview={true}`.

**Step 3: Update homepage**

```tsx
// apps/tseka-dev/src/app/page.tsx
import { Hero } from "@/components/sections/hero";
import { NowPreview } from "@/components/sections/now-preview";
export default function Home() {
  return (
    <>
      <Hero />
      <NowPreview />
    </>
  );
}
```

**Step 4: Final commit**

```bash
git add apps/tseka-dev/src/
git commit -m "feat(tseka-dev): wire now-preview into homepage"
git push origin main
```

---

## Done ✓

TsekaLuk.dev is live. The Cron pipeline runs every morning at 05:00 CST, mines your daily work output, and feeds `/now` automatically. Each update compounds the personal brand signal.

---

**Plan complete and saved to `docs/plans/2026-03-09-tseka-dev-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, you review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new Claude Code session in the Nebutra-Sailor worktree, use `superpowers:executing-plans` for batch execution with checkpoints

**Which approach?**
