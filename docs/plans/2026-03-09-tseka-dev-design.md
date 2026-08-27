# TsekaLuk.dev — Design Document

**Date:** 2026-03-09
**Status:** Approved
**Owner:** Tseka Luk

---

## 1. Vision

TsekaLuk.dev is a personal brand platform that treats Tseka as a digital product. It is not a blog — it is a thought leadership showroom designed to compound personal influence, increase negotiating power, and showcase Nebutra-Sailor as a capable enterprise platform.

**North Star:** Every day the site updates itself. Every week the brand compounds.

---

## 2. Architecture

### Placement in Monorepo

New app within the existing Nebutra-Sailor monorepo:

```
apps/tseka-dev/          ← New — deploys to TsekaLuk.dev
```

Deployed independently to Vercel, sharing Sailor packages.

### Shared Packages Used

| Package                  | Usage                                          |
| ------------------------ | ---------------------------------------------- |
| `packages/ui`            | Primitive components (Button, Card, Badge)     |
| `packages/design-system` | Tokens, spacing, typography baseline           |
| `packages/brand`         | Logos, brand assets                            |
| `packages/analytics`     | Umami/Plausible unified integration            |
| `packages/marketing`     | SEO metadata, structured data                  |
| `packages/db`            | Prisma — extend with `Post`, `NowEntry` tables |

### Tech Stack

- **Framework:** Next.js 16 + React 19 (App Router)
- **Styling:** Tailwind CSS v4 + CSS variables
- **Animation:** Framer Motion (scroll-driven, entrance)
- **Content:** MDX via `@next/mdx` (no Contentlayer)
- **Fonts:** Inter (sans) + Playfair Display (serif)
- **Deployment:** Vercel, auto-deploy on push to `main`

---

## 3. Design System

### Color Palette

```css
--color-accent: #a3e635; /* lime-400 — personal brand accent */
--color-accent-dark: #84cc16; /* lime-500 — hover states */
--color-bg: #fafafa; /* off-white base */
--color-fg: #111111; /* near-black text */
--color-muted: #6b7280; /* gray-500 — secondary text */
```

### Typography

```
Headlines (h1, h2):   Playfair Display — italic, font-normal, tight tracking
Body / UI:            Inter — font-normal, weight 300-500
Accent labels:        Inter — uppercase, wide tracking, text-sm
```

### Visual Language

- Radial lime gradients on hero background
- Glassmorphism cards: `bg-white/40 backdrop-blur-md border border-white/60`
- Full pill buttons: `rounded-full`
- Floating badge elements with `animate-ping` status dots
- Scroll-driven entrance animations via Framer Motion

---

## 4. Site Structure

### Pages

```
/              Hero → Work preview → Now → CTA
/work          Product showcase grid
/work/[slug]   Individual product case study
/thinking      Thought leadership article index
/thinking/[slug]  Article (MDX)
/now           Real-time life + work updates (auto-fed)
/about         Story + timeline + photo
```

### Hero Section (/)

Mirrors reference aesthetic:

- Playfair Display italic headline: _"Building the future of AI-native business"_
- Floating status badge: `● Available for select collaborations`
- Radial lime gradient background
- Centered portrait with mask gradient fade
- Four floating context pills (role, stack, philosophy, location)

### /work

Products displayed as SaaS showcase cards — each treated as a shipped product:

| Product        | Description                        |
| -------------- | ---------------------------------- |
| Nebutra Sailor | Enterprise AI-native SaaS platform |
| MinerU-Skill   | PDF → Markdown AI conversion tool  |
| Breakdown      | AI product marketing site          |
| polaris-web    | 斗星茶业 brand website             |

### /now

**The core differentiator.** Auto-updated by Cron pipeline daily.

Structured as:

- What I'm building (this week's focus)
- What I'm thinking (insight extracted from Obsidian notes)
- What I shipped (GitHub commit digest)
- What I'm reading (from AI RSS brief)

### /thinking

Thought leadership articles. Seeds generated nightly by Cron, written/approved by Tseka before publish. MDX files committed to `apps/tseka-dev/content/thinking/`.

---

## 5. Cron Content Pipeline

### Flow

```
05:00 CST daily
  │
  ├─ Scan: GitHub commits (past 24h across all repos)
  ├─ Scan: ~/.openclaw/workspace/memory/YYYY-MM-DD.md
  ├─ Scan: Obsidian daily notes + AI RSS brief output
  │
  └─ Claude Code: Extract high-value insights
        │
        ├─ Generate: /now page update (JSON → MDX)
        └─ Generate: /thinking article seed (draft MDX)
              │
              └─ Telegram → Tseka reviews
                    │
                    ├─ Approve → git commit → Vercel deploy (auto)
                    └─ Skip → draft saved for later
```

### Content Rules

- `/now` updates: factual, 3-5 bullet points, no fluff
- `/thinking` seeds: opinionated, 600-1000 words, first-person
- Never auto-publish without Tseka approval
- All generated content stored in `apps/tseka-dev/content/` as MDX

### New Cron Job

```
Name:     Portfolio内容挖矿
Schedule: 0 5 * * * (05:00 CST)
Timeout:  600s
Deliver:  Telegram → 5408856674
```

---

## 6. Nebutra-Sailor Integration (Showcase)

TsekaLuk.dev demonstrates Sailor capabilities by being built with them:

- Uses `packages/analytics` → proves Sailor's analytics abstraction works
- Uses `packages/marketing` → proves Sailor's SEO utilities work
- `/work/sailor` case study → detailed Sailor architecture writeup
- Footer: _"Built with Nebutra Sailor"_ → credibility signal + backlink

---

## 7. GitHub Repo

New public repo: `TsekaLuk/TsekaLuk.dev`

The `apps/tseka-dev` code lives in **both**:

1. Inside Nebutra-Sailor monorepo (primary dev environment)
2. Mirrored to standalone `TsekaLuk.dev` public repo (via git subtree or symlink)

Public repo signals: open-source personal brand, demonstrates Next.js 16 craft.

---

## 8. Success Metrics (30 / 90 days)

| Metric                          | 30d target  | 90d target  |
| ------------------------------- | ----------- | ----------- |
| /now updates                    | 20+ entries | 60+ entries |
| /thinking articles published    | 3           | 10          |
| GitHub stars on TsekaLuk.dev    | 50          | 200         |
| Inbound collaboration inquiries | 1           | 5           |

---

## 9. Out of Scope (v1)

- Comment system
- Newsletter signup
- Multi-language (EN only for now, 出海优先)
- Auth / private content
- E-commerce

---

_Design approved by Tseka Luk — 2026-03-09_
