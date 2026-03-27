# Landing Page Optimization — Design Document

**Date:** 2026-03-27
**Goal:** Close the trust gap between engineering quality (9/10) and perceived product quality on the landing page (5/10), targeting Vercel/Linear-tier conversion.
**Approach:** A (conversion-first) + selective B (brand polish on critical surfaces).

---

## Problem Statement

The landing page has excellent engineering foundations (i18n 9.5/10, animation 9/10, performance 8.5/10) but fails to convert developers because:

1. **No real product visuals** — all demos are faux terminal text
2. **Fake social proof** — hardcoded stats, anonymous testimonials
3. **Wrong hero version** — inline hero uses monochrome gradient, not brand colors
4. **Duplicate content** — same 3 stats rendered in two separate components
5. **Vague competitor comparison** — "Other Kits" instead of named alternatives

---

## Changes

### P0-1: Swap to HeroSection.tsx (brand hero)

**Current:** `page.tsx` renders an inline single-column centered hero with `bg-gradient-to-br from-foreground to-foreground/60` (monochrome fade). The brand blue-cyan gradient is absent from the first screen.

**Target:** Replace the inline hero block in `page.tsx` with the existing `HeroSection.tsx` component, which has:
- 2-column split layout (text + Lottie visual)
- `clamp()` fluid typography
- Brand gradient on headline (`--brand-gradient`)
- `CommandInstallBox` with copy-to-clipboard
- `AnimateInGroup` stagger entrance

**Files:**
- `apps/landing-page/src/app/[lang]/(marketing)/page.tsx` — replace inline hero (lines ~50-180) with `<HeroSection />`
- `apps/landing-page/src/components/landing/HeroSection.tsx` — verify i18n keys align with current translation structure

**Risk:** The inline hero's terminal animation demo is lost. Mitigate by moving the terminal into `ProductDemoSection` or adding it as a secondary element inside `HeroSection`.

---

### P0-2: Add real product screenshots

**Current:** Zero screenshots of the actual dashboard (`apps/web`). All feature demonstrations use faux terminal text with simulated typing animations.

**Target:** Add a `ProductShowcase` section between the hero and the capability matrix. Content:
- Browser-frame mockup (`BrowserMockup` or `Safari` from `@nebutra/ui/primitives`) containing a screenshot of the web dashboard
- 2-3 tab-switchable views: Dashboard overview, Billing page, AI Chat interface
- Light and dark mode variants (switch on theme toggle)
- `AnimateIn preset="emerge" inView` for scroll-triggered entrance

**Implementation:**
1. Capture screenshots from `apps/web` at 1440x900 (use Playwright or manual)
2. Store as optimized WebP in `apps/landing-page/public/screenshots/`
3. Create `ProductShowcase.tsx` component using the existing `Safari` mockup primitive
4. Use `next/image` with `priority={false}` and `loading="lazy"`

**Files:**
- New: `apps/landing-page/src/components/landing/ProductShowcase.tsx`
- Edit: `apps/landing-page/src/app/[lang]/(marketing)/page.tsx` — add section after hero

---

### P0-3: Live GitHub star count

**Current:** `VelocitySignalStrip` and `DeploymentStats` both display `1,247` as hardcoded text.

**Target:** Fetch live star count from GitHub API at build time with ISR revalidation.

**Implementation:**
```
// lib/github.ts
export async function getGitHubStars(): Promise<number> {
  const res = await fetch("https://api.github.com/repos/{owner}/{repo}", {
    next: { revalidate: 3600 }, // ISR: refresh hourly
    headers: process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {},
  });
  if (!res.ok) return 1247; // graceful fallback
  const data = await res.json();
  return data.stargazers_count;
}
```

**Graceful degradation:** If `GITHUB_TOKEN` is not set or API fails, fall back to the hardcoded value. This matches the "有啥用啥" principle — works with or without the token.

**Files:**
- New: `apps/landing-page/src/lib/github.ts`
- Edit: `apps/landing-page/src/app/[lang]/(marketing)/page.tsx` — call `getGitHubStars()` and pass as prop
- Edit: `VelocitySignalStrip` and `DeploymentStats` — accept `stars` prop instead of hardcoded value

---

### P1-1: Deduplicate stats (VelocitySignalStrip vs DeploymentStats)

**Current:** Both components show GitHub stars, Discord members, and setup time. They appear at positions 1.3 and 6 in the page scroll.

**Target:** Remove `VelocitySignalStrip` entirely. Keep `DeploymentStats` inside the testimonials section (lower on page, where social proof contextually belongs). The hero area gains breathing room.

**Files:**
- Edit: `page.tsx` — remove `VelocitySignalStrip` import and section
- Delete (or stop rendering): the inline signal strip block

---

### P1-2: Named competitor comparison

**Current:** `AlternativeComparison` table uses columns: "Sailor / DIY / Other Kits".

**Target:** Replace "Other Kits" with named competitors relevant to the target audience:
- Column 1: **Nebutra Sailor** (us)
- Column 2: **next-forge** (Vercel-native SaaS starter)
- Column 3: **Supastarter** (most popular paid kit)

Update comparison data with factual, verifiable claims. Link to public repos/docs for each claim.

**Files:**
- Edit: `AlternativeComparison.tsx` — update column headers and row data
- Edit: i18n translation files for all 7 locales

---

### P1-3: Fix token governance violations

Three hardcoded hex values need tokenization:

| File | Line | Current | Fix |
|------|------|---------|-----|
| `CapabilityMatrixSection.tsx` | AnimatedBeam `gradientStopColor` | `"#0BF1C3"` | `"var(--brand-accent)"` or pass via CSS variable |
| `page.tsx` inline hero | macOS terminal dots | `#ff5f56`, `#ffbd2e`, `#27c93f` | `bg-border/80` (consistent with other terminals) |
| `page.tsx` inline hero | headline gradient | `from-foreground to-foreground/60` | `--brand-gradient` (resolved by P0-1 hero swap) |

**Note:** The hero headline gradient issue is automatically resolved when we swap to `HeroSection.tsx` (P0-1). The inline hero code is removed entirely.

---

### P1-4: Wire TestimonialsWall (already built)

**Current:** `apps/landing-page/src/components/marketing/TestimonialsSection.tsx` wraps `TestimonialsWall` from `@nebutra/marketing` but is never imported by any route.

**Target:** Replace the current 3-card static testimonials with the `TestimonialsWall` component. Add real testimonial data structure:

```ts
interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string; // optional — graceful without
}
```

**Graceful degradation:** If `avatarUrl` is absent, show `DiceBearAvatar` (already in `@nebutra/ui/primitives`) based on the author name hash. No external dependency required.

**Files:**
- Edit: `page.tsx` — replace inline `TestimonialsSection` with `marketing/TestimonialsSection`
- Edit: `marketing/TestimonialsSection.tsx` — verify it renders correctly with current data shape
- Edit: i18n files — add structured testimonial data with author/role/company fields

---

### P1-5: Blog showcase on homepage

**Current:** `/blog` route exists with Sanity CMS but has no homepage entry point.

**Target:** Add a "From the Blog" section after the testimonials, showing 2-3 latest posts. Uses the existing Sanity client.

**Implementation:**
- Fetch latest 3 posts from Sanity in `page.tsx` server component
- Render as a simple 3-card grid with thumbnail, title, date, excerpt
- Graceful fallback: if Sanity client is not configured or returns empty, render nothing (section is conditionally omitted)
- `"use cache"` + `cacheLife("hours")` for ISR

**Files:**
- New: `apps/landing-page/src/components/landing/BlogShowcase.tsx`
- Edit: `page.tsx` — add section, fetch posts server-side

---

## Section Order (after changes)

```
Navbar
├── 1. HeroSection (P0-1: brand hero with Lottie)
├── 2. Trust / Logo Bar (unchanged)
├── 3. AIConstellationMarquee (unchanged)
├── 4. ProductShowcase (P0-2: real screenshots in browser mockup)
├── 5. CapabilityMatrixSection (P1-3: fix token violation)
├── 6. ProductDemoSection (unchanged, terminal demo moves here)
├── 7. VelocityEngineSection (unchanged)
├── 8. TestimonialsWall + DeploymentStats (P1-4: real testimonials)
├── 9. BlogShowcase (P1-5: latest 3 posts)
├── 10. Architecture / MonorepoFileTree (unchanged)
├── 11. Pricing (unchanged)
├── 12. AlternativeComparison (P1-2: named competitors, elevated position)
├── 13. FAQ accordion (unchanged)
├── 14. Final CTA (unchanged)
└── FooterMinimal (unchanged)
```

Key changes: VelocitySignalStrip removed, ProductShowcase added after trust logos, Blog added after testimonials, AlternativeComparison separated from FAQ into its own section.

---

## Graceful Degradation Matrix

Every new feature degrades cleanly when its dependency is absent:

| Feature | Dependency | Missing behavior |
|---------|-----------|-----------------|
| Live GitHub stars | `GITHUB_TOKEN` | Falls back to hardcoded value |
| Product screenshots | WebP files in `public/` | Shows placeholder gradient |
| Blog showcase | Sanity CMS client + content | Section not rendered |
| Testimonial avatars | `avatarUrl` field | DiceBearAvatar from name hash |
| Named comparisons | i18n translation keys | Falls back to English |

---

## Out of Scope

- Multi-scenario preset switching (D) — deferred to next phase
- A/B testing infrastructure — deferred
- Enterprise trust section (SOC2 badges) — deferred until compliance is real
- Video walkthroughs — deferred (screenshots first, video later)
- Discord embed / live community feed — deferred
