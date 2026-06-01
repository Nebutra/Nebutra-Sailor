# Solutions Mega-Menu — Design

> Date: 2026-06-01
> Surface: `apps/landing-page` (public marketing site, next-intl, 7 locales)
> Status: approved (brainstorming → implementation)

## One-liner

A Manus-style flat `/solutions/[slug]` set of scenario pages, but segmented by the
**jobs an outbound ("出海") SaaS founder needs to do** rather than by org function.
One page template, two node types (`content` vs `offering`). The taxonomy lives in a
typed in-repo config (single source of truth for nav + routes); the best-practice
article strip goes through a decoupled `SolutionContentSource` interface so Sanity can
be wired in later with zero route/component changes.

## Decisions locked (from brainstorming)

| Fork | Decision |
|---|---|
| Nature | Hybrid: pillar page + article cluster |
| Content source | Reuse Sanity *eventually*; content still being built → design the framework first, source-decoupled |
| Route model | Mimic Manus: flat `/solutions/[slug]`, fixed conversion-oriented template |
| Segmentation axis | By outbound founder **work scenario** (job-to-be-done) |
| Menu form | Grouped mega-menu (routes flat, dropdown shows 4 columns) |
| Node duality | One template + data model, `type: "content" | "offering"` flag |

## Taxonomy (4 groups / 10 slugs)

| Group (mega column) | slug | Scenario | type |
|---|---|---|---|
| 出海与增长 Go-to-Market | `go-global` | 出海落地(建站·合规·支付·i18n) | content |
| | `growth` | 黑客增长(获客·留存) | content |
| 工程与治理 Build & Govern | `architecture` | 架构治理 | content |
| | `tech-stack` | 技术选型 | content |
| | `dx` | DX 工具链 | content |
| AI 与数据 AI & Data | `ai` | AI 集成 | content |
| | `ai-data-ops` | AI 数据运营(ScaleAI 式) | **offering** |
| | `frontier` | 未来前沿 | content |
| 创业 Founder | `fundraising` | 创业融资 | content |
| | `product-insights` | 产品观察 | content |

Slugs + grouping are data-driven; adding/removing a solution is a config-only change.

## Architecture

### Routes
```
apps/landing-page/src/app/[lang]/(marketing)/solutions/
  page.tsx              # index: 4 grouped card columns
  [slug]/page.tsx       # detail: Manus-mapped template
                        #   generateStaticParams ← taxonomy × locales
                        #   generateMetadata     ← per-slug SEO
                        #   notFound() on unknown slug
```

### Data model (single source of truth, in-repo)
`src/lib/constants/solutions-data.ts`
```ts
type SolutionType = "content" | "offering";
interface LocalizedCopy { en: string; zh: string }

interface Solution {
  slug: string;
  type: SolutionType;
  groupId: string;
  icon: NebutraIcon;            // @nebutra/icons (Geist)
  label: LocalizedCopy;
  tagline: LocalizedCopy;
  hero: { eyebrow: LocalizedCopy; title: LocalizedCopy; summary: LocalizedCopy };
  useCases: { title: LocalizedCopy; body: LocalizedCopy }[];   // 痛点→方案 cards
  faq: { q: LocalizedCopy; a: LocalizedCopy }[];
  capabilityAnchors?: string[];   // reuse existing capability-* anchors
  contentCategory?: string;       // maps to Sanity blog category (nullable until content exists)
}
interface SolutionGroup { id: string; label: LocalizedCopy; solutionSlugs: string[] }
```
Helpers: `getSolution(slug)`, `getAllSolutionSlugs()`, `SOLUTION_GROUPS`, `pick(copy, locale)`.

Rationale for in-repo en/zh copy (not a new i18n namespace): mirrors the existing
`package-feature-data.ts` / `COPY = {en, zh}` pattern used by `/features/[name]`, keeps
all solution content in one governed file, and avoids editing 7 message catalogs for
content that is still being authored. Only the nav trigger label goes into `nav.solutions`.

### Source-decoupled content
`src/lib/solutions/content-source.ts`
```ts
interface PostSummary { slug; title; excerpt; date; href }
interface SolutionContentSource {
  getRelatedPosts(category: string, locale: Locale, limit: number): Promise<PostSummary[]>;
}
// now:  EmptyContentSource  → []  (strip hidden while content is built)
// later: SanityContentSource → wraps @nebutra/sanity getPosts by category
export function getSolutionContentSource(): SolutionContentSource // returns Empty for now
```
Swapping the factory return is the only change needed when content is ready.

### Page template (Manus → Nebutra)
`<SolutionPage>` (server), renders by `type`:
1. Hero — `FeatureHero` (reused) + dual CTA (content) / single strong CTA (offering)
2. Use cases — 痛点→方案 card grid (server, no client tabs in Phase 1)
3. Capabilities — links into existing capability anchors / packages
4. Best-practice strip — `getRelatedPosts(...)`; hidden when empty
5. FAQ — static from data
6. CTA band — `FooterMinimal showFinalCta`

All sections compose `@nebutra/ui` + `AnimateIn`/`AnimateInGroup`; no hand-crafted primitives.

### Nav integration
- `NAV_LINKS` gains a `{ labelKey: "solutions", mega: true }` entry (after `features`).
- `DesktopNav`: new `"mega" in link` branch → `<SolutionsMegaMenu/>` (multi-column panel).
- `MobileDrawer`: new `"mega" in link` branch → grouped accordion section.
- Existing simple dropdown (`resources`) untouched.

### i18n
- Add `nav.solutions` to all 7 catalogs (en Solutions / zh 解决方案 / ja ソリューション /
  ko 솔루션 / es Soluciones / fr Solutions / de Lösungen).
- Page + menu content (group/solution labels, hero, use cases, FAQ) is en/zh from the
  data file; other locales fall back to en for body copy in Phase 1.

## Testing
- Unit: taxonomy integrity (unique slugs, slug regex, valid `type`, every solution has
  en+zh label & belongs to a declared group, `generateStaticParams` covers all slugs).
- Unit: `EmptyContentSource.getRelatedPosts` returns `[]`; (future) Sanity adapter maps category.
- e2e (Playwright, Phase 1 smoke): nav mega opens → click a solution → page renders → locale switch.

## Scope / YAGNI
- **Phase 1 (this work):** mega-menu + `/solutions` index + `/solutions/[slug]` template,
  `EmptyContentSource`, en+zh content, taxonomy config, data + content-source unit tests.
  Pages are "placeholder-but-real" (hero/use-cases/FAQ from data); article strip hidden when empty.
- **Phase 2 (later):** wire `SanityContentSource`, author article clusters, `ai-data-ops`
  offering sales flow + case studies, fill remaining locales, optional interactive use-case tabs.
