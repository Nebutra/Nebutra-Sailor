# Sleptons Résumé System — Design Specification · 2026-09-07 (rev 1)

> Status: **Draft for review**. Derived from the legacy CVise codebase audit (2026-09-07).
> Parent spec: [`2026-03-31-sleptons-community-design.md`](./2026-03-31-sleptons-community-design.md).
> Reference extract: `Nebutra-SaaS-Lab/cvise-resume-extract/` (read-only, never imported directly).

---

## 0. Why this exists

CVise (`~/Documents/Resume/cvise-legacy`, formerly `ai-supastarter-template`) was a 2025 standalone
AI résumé SaaS on supastarter. It shipped a solid **résumé data model, a live split-screen editor,
section renderers, multi-format export, and JD-aware AI rewriting**, but never got a database,
auth, or a deploy. It is archived as of this date.

Sleptons already has the member profile (`sleptons_member_profiles`) as its unit of identity.
A member card answers *"what are you building and who do you need"*; it does not answer
*"what have you done"*. Investors, co-founders, and the M4 policy queue all need the second
answer in a structured, exportable, verifiable form. That is the résumé system.

**One sentence:** the Sleptons Résumé is the structured, exportable *track record* attached to a
member profile, feeding the matching graph and the v2 verification review.

---

## 1. Scope

### In scope (this spec)

- Résumé data model as a Prisma model tied 1:1 to `SleptonsMemberProfile`
- Section-based editor (split-screen, autosave) inside `apps/sleptons`
- Print/PDF, ATS-plain, Markdown, JSON, DOCX export
- JD-aware AI assist (summary rewrite, bullet rewrite, advantage tags) via `backends/gateway` → AI Gateway
- Public résumé page at `/members/[slug]/resume` governed by `isPublic` + a per-résumé toggle
- Signals extracted from the résumé into the matching engine (M2)

### Out of scope

- Multi-résumé per user "job application" workflows (CVise `jobMode: targeted|mass`). Sleptons members have **one canonical résumé**; targeting variants are an M3+ question.
- VLM certificate/achievement image analysis (CVise `vlm/`, `api/vlm-public`). Cost and privacy risk outweigh value at v0–v1. Revisit after OSS upload adapter lands.
- Conversational form filling (CVise `lib/conversation/`, 770-line orchestrator). Unfinished in the source; not carried.
- Photo upload. Sleptons uses Clerk `imageUrl` (interim) → OSS (v1). Résumé reuses `avatarUrl`.

---

## 2. Positioning inside Sleptons

| Surface | Existing | Adds with résumé |
|---|---|---|
| Member card (gallery) | name · tagline · tags · lookingFor | **"Track record" strip**: top 3 highlights (auto-picked) |
| Member page `/members/[slug]` | profile + products | **Résumé tab** (public if enabled) |
| Tier promotion v1 → v2 | live product + human review | reviewer sees structured résumé, not a free-text bio |
| Matching (M2) | tag overlap → pgvector | embedding input = tagline **+ résumé summary + skills** |
| Policy gateway (M4) | verified v2 badge | exportable PDF résumé as credential attachment |

**Tier gating**

| Tier | Résumé capability |
|---|---|
| v0 Seed | Create + edit + private preview + JSON/Markdown export |
| v1 Builder | Public résumé page, PDF/DOCX export, AI assist (rate-limited) |
| v2 Founder | "Verified" ribbon on public résumé; appears in investor-facing search |

---

## 3. Data model

CVise's canonical model is a Zod `Profile` (`src/lib/schema.ts`, 266 LOC, self-contained). It is
the single most valuable artifact in the legacy codebase and is adopted here with **three changes**:

1. Drop China-recruiting-only fields that have no meaning for founders: `hukou`, `expected_salary`, `relocation`, `cities`, `availability`, `jobMode`, `jd_description` (moves to a transient AI request param), `gender`, `birth`.
2. Collapse `campus_experiences` + `internships` into one `experiences[]` with `kind: work | campus | founder`.
3. Add founder-native sections: `ventures[]` (companies founded, outcome), `funding[]`, `press[]`.

### 3.1 Prisma

```prisma
model SleptonsResume {
  id           String   @id @default(cuid())
  memberId     String   @unique
  member       SleptonsMemberProfile @relation(fields: [memberId], references: [id], onDelete: Cascade)

  // Sectioned content, validated by the Zod schema below before write.
  // Kept as Json on purpose: section shape evolves faster than migrations,
  // and we never query inside sections — we query the derived columns.
  content      Json
  schemaVersion Int     @default(1)

  // Derived, denormalized for search/matching/cards. Recomputed on every save.
  headline     String?          // ≤ 120 chars, from objective.summary first sentence
  skillsFlat   String[]         // all skills categories flattened, canonical-vocab normalized
  highlights   String[]         // top 3 bullets chosen by rank (see §6.3)
  yearsActive  Int?             // from earliest experience/venture period

  isPublic     Boolean  @default(false)  // AND-ed with member.isPublic
  language     ResumeLang @default(MIX)
  lastExportedAt DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("sleptons_resumes")
}

enum ResumeLang { ZH  EN  MIX }
```

`SleptonsMemberProfile` gains `resume SleptonsResume?`. No other profile change.

### 3.2 Zod content schema (v1)

Lives in `packages/commerce/contracts/src/sleptons/resume.ts` so gateway and app share it.

```ts
export const ResumeContentV1 = z.object({
  basic: z.object({
    name: z.string().min(1),
    name_en: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    website: z.string().url().optional(),
    links: z.object({
      github: z.string().optional(), linkedin: z.string().optional(),
      twitter: z.string().optional(), personal: z.string().optional(),
    }).partial().optional(),
  }),
  objective: z.object({
    summary: z.string().optional(),            // rich text (sanitized HTML)
    advantage_tags: z.array(z.string()).max(8).optional(),
  }),
  ventures: z.array(z.object({
    name: z.string(), role: z.string().optional(), period: z.string().optional(),
    stage: z.enum(["idea","building","launched","scaling","exited","closed"]).optional(),
    outcome: z.string().optional(), url: z.string().url().optional(),
    details: z.array(z.string()).optional(),
  })).optional(),
  experiences: z.array(z.object({
    kind: z.enum(["work","campus","founder"]).default("work"),
    period: z.string(), org: z.string(), title: z.string(),
    details: z.array(z.string()).optional(), rich: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })).optional(),
  education: z.array(z.object({
    school: z.string(), school_en: z.string().optional(), major: z.string().optional(),
    degree: z.string().optional(), period: z.string().optional(),
    gpa: z.string().optional(), courses: z.array(z.string()).optional(),
  })).optional(),                                // was .min(1) in CVise; founders may omit
  projects: z.array(z.object({
    name: z.string(), role: z.string().optional(), period: z.string().optional(),
    stack: z.array(z.string()).optional(), details: z.array(z.string()).optional(),
    links: z.array(z.string()).optional(),
  })).optional(),
  achievements: z.array(z.object({ title: z.string(), level: z.string().optional(), year: z.string().optional() })).optional(),
  certificates: z.array(z.object({ name: z.string(), issuer: z.string().optional(), year: z.string().optional() })).optional(),
  skills: z.object({
    programming: z.array(z.string()).optional(), ai_engineering: z.array(z.string()).optional(),
    ai_theory: z.array(z.string()).optional(),   data: z.array(z.string()).optional(),
    product: z.array(z.string()).optional(),     finance: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),       ai_tools: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  }).partial().optional(),
  publications: z.array(z.object({ title: z.string(), venue: z.string().optional(), year: z.string().optional(), url: z.string().optional() })).optional(),
  patents:      z.array(z.object({ title: z.string(), id: z.string().optional(), year: z.string().optional(), status: z.string().optional() })).optional(),
  opensource:   z.array(z.object({ repo: z.string(), stars: z.number().optional(), role: z.string().optional(), highlights: z.array(z.string()).optional() })).optional(),
  funding: z.array(z.object({ round: z.string(), amount: z.string().optional(), date: z.string().optional(), investors: z.array(z.string()).optional() })).optional(),
  press:   z.array(z.object({ title: z.string(), outlet: z.string().optional(), url: z.string().url().optional(), date: z.string().optional() })).optional(),
  volunteering: z.array(z.object({ org: z.string(), role: z.string().optional(), period: z.string().optional(), details: z.array(z.string()).optional() })).optional(),
  interests: z.array(z.string()).optional(),
  preferences: z.object({
    length: z.enum(["1page","2pages"]).default("1page"),
    show_icons: z.boolean().default(true),
    paper: z.enum(["A4","Letter"]).default("A4"),
    margins: z.object({ top: z.string(), right: z.string(), bottom: z.string(), left: z.string() })
             .default({ top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" }),
    max_bullets_per_entry: z.number().min(1).max(8).default(3),
    section_order: z.array(z.string()).optional(),
  }).default({}),
});
```

`skills.*` values are normalized against the Sleptons `techStack` canonical vocabulary on save;
unknown values are kept but flagged `unverified` in the editor and excluded from `skillsFlat`.

### 3.3 Migration from CVise

CVise data lives only in browser `localStorage["resume-profiles"]` (no server copy exists).
Provide a one-time **"Import CVise JSON"** action in the editor that accepts the CVise `Profile`
JSON export and maps it with `mapCviseProfileToResumeV1()`:

| CVise | Sleptons |
|---|---|
| `campus_experiences[]` | `experiences[]` with `kind: "campus"` |
| `internships[]` | `experiences[]` with `kind: "work"` |
| `objective.jd_description` | dropped |
| `objective.summary` | `objective.summary` |
| `links.{github,personal_website,portfolio}` | `basic.links.{github,personal}` (`portfolio` → `personal` if empty) |
| `links.{kaggle,zhihu,bilibili}` | dropped |
| `photo` | dropped (uses profile avatar) |
| `aiSuggestions` | dropped |
| `preferences.variant` | dropped (single theme, see §5) |
| `references[]`, `extras[]` | dropped |

---

## 4. Application architecture

The parent spec planned `backends/gateway` as the write path. **The shipped Sleptons code does not
do that**: `apps/sleptons` reads and writes `@nebutra/db` directly from Next.js route handlers
(`src/app/api/members/route.ts`, `src/lib/members.ts`), Clerk provides the session, and the app's
`AGENTS.md` names `src/lib` as the home for app-local data access. R0 follows the code, not the
old plan. Gateway routes appear only where they are actually needed (R2 exports, R3 AI).

```
packages/commerce/contracts/src/sleptons.ts     ResumeContentV1Schema, ResumeWriteSchema, ResumeDerivedSchema
packages/platform/db/prisma/schema.prisma       SleptonsResume + ResumeLang (migration 20260907000000_sleptons_resume)

apps/sleptons/
  src/lib/resume.ts                 getMemberIdForUser · getResumeForMember · getPublicResumeBySlug · upsertResume
  src/lib/resume/derive.ts          headline · skills_flat · highlights · years_active · completeness (pure)
  src/lib/resume/import-cvise.ts    mapCviseProfileToResumeV1 (one-time importer, §3.3)
  src/app/api/resume/route.ts       GET (owner) · PUT (validate → derive → upsert)      ← R0
  src/app/(member)/resume/edit/     split-screen editor                                 ← R1
  src/app/members/[slug]/resume/    public résumé page, print layout                    ← R2
  src/features/resume/{editor,render,export,ai}/                                        ← R1–R3

backends/gateway/src/routes/sleptons/resume/                                            ← R2–R3 only
  POST /export/pdf    Playwright print → OSS → signed URL (queued via @nebutra/queue)
  POST /export/docx   docx.js server-side
  POST /ai/*          rewrite-summary · rewrite-bullets · advantage-tags (AI Gateway)
```

Derived columns are computed in the app layer on purpose: `@nebutra/contracts` is schema-only by
its own AGENTS.md ("portable shapes, not runtime behaviour"). If the gateway later needs the same
derivations, `derive.ts` moves to a `packages/` module then, not now.

**Rules inherited from CLAUDE.md**

- UI from `@nebutra/ui/components` + `@nebutra/ui/layout`; icons from `@nebutra/icons`. CVise's `lucide-react` and local shadcn kit are **not** ported.
- Tokens only (`var(--neutral-*)`), no raw hex. CVise `cssColorCompat.ts` (210 LOC of oklch→hex shims) is obsolete under Tailwind v4 + tokens.
- Rich text stays sanitized with DOMPurify on both write (gateway) and render.

---

## 5. Rendering & export

CVise had one theme (`variant: "modern"`) with three layout modes chosen by `ResumePreview`.
Sleptons ships **one document theme** that inherits the active `html[data-brand]` package, so a
résumé printed from a Vercel-brand tenant and a Notion-brand tenant look consistent with their
host. No user-selectable templates at v1.

| Format | Where | Notes |
|---|---|---|
| Print / PDF | gateway (Playwright) | A4/Letter from `preferences.paper`; `@page` margins from `preferences.margins`; deterministic fonts bundled |
| ATS plain | app | CVise `isAts` render mode: no icons, no columns, single font, semantic headings |
| Markdown | app | port of `exporters/markdown.ts` (has tests) |
| JSON | app | `ResumeContentV1` + `schemaVersion` |
| DOCX | gateway | port of `exporters/docx.ts` (369 LOC, docx.js) |
| HTML | app | port of `exporters/html.ts` (has tests), used as the print source |

`lastExportedAt` updates on any server-side export for analytics (`06-sleptons-engagement.sql`).

---

## 6. AI assist

### 6.1 Provider path

CVise called SiliconFlow directly with a hand-rolled adapter, cache, and rate-limiter
(`api/ai/shared/*`, ~600 LOC with tests). Sleptons routes everything through
`backends/gateway` → **AI Gateway** (`@nebutra/ai-providers`). The provider is a routing concern,
not app code. Keep from CVise: the **prompt set** and the **context-builder** idea; drop the client.

### 6.2 Actions (v1)

| Action | Input | Output | Rate limit (v1 tier) |
|---|---|---|---|
| `rewrite-summary` | summary + optional target description | 3 variants ≤ 80 words | 20 / day |
| `rewrite-bullets` | one experience entry | bullets rewritten STAR-style, ≤ `max_bullets_per_entry` | 60 / day |
| `advantage-tags` | full content | ≤ 8 tags from canonical vocab + ≤ 3 free tags | 10 / day |

Every response carries `sourceHash` (sha256 of the input) so the client can cache and the
suggestion panel can show "already applied". Suggestions are **never auto-applied**.

### 6.3 Highlights ranking (no LLM)

`highlights[]` is computed on save: score every bullet by (has number) × 2 + (has canonical
skill) × 1 + (kind === founder) × 2 + (recency), take top 3. This feeds the member card strip and
needs no model call.

---

## 7. Privacy & visibility

Extends §3.5 of the parent spec. Effective visibility is `member.isPublic && resume.isPublic`.

| Surface | public | private |
|---|---|---|
| `/members/[slug]/resume` | 200, indexable | 404 |
| PDF signed URL | 1 h expiry, member-initiated only | same |
| Matching embedding | résumé summary + skills included | excluded (profile-only) |
| Reviewer (v2 promotion) | visible | **visible** (review consent is given at application) |

Contact fields (`email`, `phone`) are always stripped from the public page and from PDFs unless the
member enables `show_contact_public` (default off). They remain in DOCX/JSON self-exports.

---

## 8. What is carried over from CVise (extract inventory)

Ported = re-written into the Sleptons structure with `@nebutra/*` imports; **never** copied verbatim.

| Legacy path (in `cvise-resume-extract/`) | LOC | Disposition |
|---|---|---|
| `src/lib/schema.ts` | 266 | **Port** → contracts (with §3 edits) |
| `src/components/resume/*` (12 renderers + 2 atoms) | ~2 300 | **Port** → `features/resume/render/` |
| `src/components/form/SplitScreenEditor.tsx` | 596 | **Port**, drop framer-motion divider for CSS resize |
| `src/components/form/steps/*` (14 steps, ~9 000 LOC) | ~9 000 | **Port** the 11 that map to §3.2 sections, **re-written data-driven**. The 14 steps were hard-coded in three places; `SkillsStep.tsx` alone is 2 426 LOC. Finish the abandoned `lib/form-config/` idea (2 of 14 sections existed) instead of porting step files 1:1 |
| `src/components/form/AdvantageTagsForm.tsx` | 422 | **Port** (works end-to-end) |
| `src/components/form/RichText.tsx`, `SaveStatusIndicator.tsx` | — | **Port** |
| `src/hooks/useFormAutoSave.ts` | 138 | **Port** the 3 s debounce off form watch; target = gateway PATCH per section. `useAutoSave.ts` (10 s) was wired only to the dead `IntakeWizard` — drop |
| `src/lib/exporters/{markdown,html,json,docx}.ts` + tests | ~1 000 | **Port**, but behind **one** serializer: each exporter re-walks `Profile` by hand today, so a schema change costs four edits |
| `src/lib/utils/print.ts`, `exporters/pdf.ts` | ~300 | Reference only. Client-side `react-to-print` + `html2pdf.js` fallback with an oklch/color-mix stripper; Sleptons prints server-side (§5) |
| `src/lib/templates/map-brand.ts` | 356 | **Port** as a data file (brand → simple-icons slug); serve icons from `@nebutra/icons` first |
| `api/ai/shared/prompts.ts`, `context-builder.ts` | — | **Port** prompts into gateway route handlers |
| `src/lib/utils/resumeNaming.ts` | 320 | **Port the 0–100 completeness score** (drives v0→v1 auto-promotion in §2); drop the naming half and `api/ai/generate-resume-name` |
| `src/lib/store.ts` (Zustand, no persist) | 464 | Drop; use server state + React Query |
| `src/lib/storage/adapters/{local,idb}.ts` | — | Reference only (localStorage / IndexedDB); removed from extract: `future-supabase.ts`, `database-client.ts`, `database-types.ts`, `user-assets.*` |
| `src/lib/conversation/*`, `src/lib/actions/*` | ~4 400 | Removed from extract (zero importers) |
| `src/components/form/IntakeWizard.tsx`, `MobileStepNavigation.tsx` | 695 | Removed from extract (dead) |
| `src/components/vlm/*`, `hooks/useVLM.ts`, `api/vlm-public/*` | ~1 300 | Defer (see §1). Note: 4 of `useVLM`'s methods call routes that never existed |
| `src/lib/ai/{router,providers/*}.ts` | ~830 | Drop (AI Gateway replaces) |
| `src/lib/utils/cssColorCompat.ts` | 210 | Drop |
| `src/lib/demo-data.ts` | 688 | Keep as **test fixture** only, after rewriting personal data to synthetic |
| `reports/*.md` (30+ dev reports) | — | Reference only; see §9 |

---

## 9. Known defects inherited (from CVise reports, verify before porting)

- **Autosave**: two rival hooks (10 s and 3 s) with no coordination, no retry, no queue, no conflict handling; last write wins on one localStorage key with no cross-tab lock. An infinite-loop crash came from autosave + `form.watch`. Port only the debounce; the write path is redesigned as a section-level PATCH.
- **"Production-ready" claims in reports are unreliable**: autosave completion is reported three different ways; a hydration → module → webpack fix chain each declared success before the next crash; the VLM summary admits mock data while sibling docs present it as live; bundle size is reported as both 590 KB and 173 KB. Trust code, not `reports/`.
- **ATS is not a scorer**: the `ats` route is a plain-text render plus copy button. The only `ats_friendly_score` came from sending a screenshot to a vision model. Sleptons' "ATS" stays a render mode (§5); any scoring is a new feature, not a port.
- **AI plumbing was never wired**: both rate limiters are in-memory and called by no route; the cache is a `Map` that dies on cold start; three rival clients exist for one provider (SiliconFlow: Kimi-K2 for text, Qwen2.5-VL-72B for vision; `generate-resume-name` hit Moonshot directly). None of this survives; AI Gateway + `@nebutra/metering` replace it.
- **Templates**: a single `modern` variant with layout hard-coded in `ResumePreview.tsx`; 2-page mode only hides sections, page-break handling was never finished.
- **DB**: a pgbouncer workaround pinned `connection_limit=1`, serializing all access; the SQL migrations under `database/` were never applied and only rollback scripts exist.
- **Renderers**: `Campus.tsx` renders rich text as plain; `exporters/types.ts` uses `any`; a stray `console.log` in `templates/page.tsx`.

---

## 10. Milestones

| Milestone | Deliverable | Gate |
|---|---|---|
| **R0 — Schema & import** ✅ 2026-09-07 | Prisma model + migration, contracts schema, `derive.ts`, `mapCviseProfileToResumeV1`, `GET/PUT /api/resume` | 39 unit tests green (contracts 6, sleptons 33); `typecheck`/`lint` clean for both packages. Migration not yet applied to any DB. |
| **R1 — Editor & render** | split-screen editor, 11 section steps, renderers, autosave to gateway, private preview, MD/JSON export | e2e `e2e/sleptons/resume-edit.spec.ts` |
| **R2 — Public & PDF** | public page with visibility rules, Playwright PDF + DOCX via queue, card highlights strip | Lighthouse ≥ 90 on public page; PDF byte-identical across two runs |
| **R3 — AI assist** | three gateway AI routes, suggestion panel, tier rate limits | prompt regression fixtures; cost per action logged to metering |
| **R4 — Matching input** | résumé text in embedding pipeline (M2 dependency) | A/B on match acceptance |

R0–R1 are independent of Sleptons M1 shipping; R2+ require the OSS adapter and `@nebutra/queue`.

---

## 11. Open questions

1. Should `ventures[]` be derived from `sleptons_products` instead of entered twice? (Lean yes: products are the source; ventures = products + outcome fields.)
2. PDF rendering on Vercel is out; confirm Playwright is available on the ECS gateway image.
3. Does the v2 reviewer need a diff view between résumé versions? Requires a `sleptons_resume_revisions` table (not in v1).
4. Canonical vocabulary is tech-centric; founders in non-tech verticals will hit `unverified` on most skills. Extend vocab before R1 or accept.
