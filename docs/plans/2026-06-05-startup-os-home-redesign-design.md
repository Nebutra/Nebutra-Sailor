# Startup OS Home — Redesign (thin design)

**Date:** 2026-06-05
**Scope:** The Startup OS **entry/empty-state surface** only — `StartupCommandCenter`'s
hero in `apps/web/src/components/startup-os/startup-command-center.tsx` (~L800–898).
NOT the run/streaming engine, sandbox preview, or builder workspace (separate
`lovable-roadmap` phases). This is roadmap **P3 (Polished Lovable-grade UI)**, entry surface.
**Constraint:** design system only (`@nebutra/ui`, `/primitives`, `@nebutra/icons`,
tokens, `AnimateIn`). No hand-craft. Governance lints (primitive-only, phosphor-zone,
repository-seam, dark-drift) all apply.

---

## 1. The narrative we must dramatize

> **One sentence → a whole *governed* company.**

This is the moat vs the references: Lovable builds an **app**, Manus runs **tasks**,
flowith makes **media**. Nebutra compiles a **tenant-scoped company** (CompanyContext +
brand + landing + MVP scaffold + demand map) and **every run is approval-gated**.
The home page today hides all of that behind a cold monochrome prompt box.

## 2. What's wrong today (the fixes this redesign makes)

1. Brand absent — 100% `neutral-*`, zero `--brand-gradient`. Cold/empty/forgettable.
2. Below-the-fold empty — `min-h-screen` centered, nothing under the chips → looks unfinished.
3. Visual focal point is a **disabled grey Build button**.
4. Serif display headline clashes with the sans UI (references are consistently sans).
5. The 5 promise chips are **dead labels**, not the product-value story.
6. Blank-page anxiety — empty textarea, no example theses, no output preview.
7. The differentiator (governed / tenant-scoped / one-thesis-→-company) is invisible.

## 3. New structure — three bands (kills the empty below-fold)

### Band A — Hero (compile input)
- **Ambient brand backdrop**: low-saturation `--brand-gradient` aurora/glow behind the
  prompt (token-driven, `AnimateIn`), replacing the cold white. Subtle, not loud.
- **Headline**: unified sans (Geist), brand-gradient text via the standard gradient-text
  pattern. Personalized when known: "What are we building, {founder}?" / localized zh.
  Drop the serif.
- **Pill**: keep "Startup Agent OS" (Lightning) but tie its accent to brand.
- **Prompt** (`Textarea` primitive): keep, but the toolbar gains meaning —
  Arena `Select` (existing) + an **"Attach CompanyContext"** affordance (mount existing
  context) + Build. Build is **never a dead grey**: empty state shows a guided/example
  placeholder, button stays inviting.
- **Example theses** (Manus-absorbed): 3–4 clickable starters that **vary by Arena**;
  click → fills the textarea. Kills blank-page anxiety.

### Band B — "What compiles out of one sentence" (the promise chips, upgraded)
- Turn the 5 dead chips (`STARTUP_OS_PROMISES`) into a **5-card artifact strip**:
  CompanyContext · Launch artifacts · Live files · Spatial canvas · **Governed runs**.
- Each card = `@nebutra/icons` glyph + one-line value + a tiny static preview motif.
- **Governed runs card is the hero of this band** — Shield glyph + a miniature
  approval-flow motif. This is the differentiator made visible.

### Band C — Examples / recent companies gallery (flowith-absorbed)
- When the tenant has projects: the existing recent-projects grid, upgraded to richer
  cards (name + arena + status + a brand-tinted state chip — reuse the existing
  `blue-*` selected treatment, made consistent).
- When empty: a **sample compiled-company gallery** by Arena (SaaS / Consumer /
  Dev-infra) so a new user sees "what I'll get" — proof + inspiration.

## 4. Visual language (tokens, no hand-craft)
- Color: `--brand-gradient` (ambient + headline + governed-card accent); everything
  else stays semantic `neutral-*` / `blue-*` / `cyan-*`. No raw hex.
- Motion: `AnimateIn` / `AnimateInGroup` (stagger the bands + cards). No raw `motion.`.
- Type: one sans voice (Geist), token tracking/leading. Remove serif.
- Components: `Textarea`, `Select`, `Button`, `Card`, chips → `@nebutra/ui` primitives;
  icons from `@nebutra/icons` (dashboard surface → NOT phosphor).
- Dark mode: rely on token auto-flip; no `dark:*-white` overrides (dark-drift lint).

## 5. Non-goals (this pass)
- No streaming/SSE, no conversational iteration, no sandbox preview (other P-phases).
- No new backend; example/sample data is static content (clearly labeled, not "mock
  data" masquerading as real — distinct from the seed-workspace anti-pattern).
- Don't touch the builder workspace (`StartupBuilderWorkspace`) beyond what the hero needs.

## 6. Locked trade-offs (decided 2026-06-05 — manager's call)
1. **Headline** — brand-gradient + localized (zh/en); **no name personalization** in v1
   (pulling founder/tenant name needs session plumbing not worth the cost). Drop the serif.
2. **Band C empty state** — **NO fabricated sample-company gallery**. That would re-introduce
   the exact mock-data anti-pattern just removed from the sidebar (self-contradictory).
   Blank-page anxiety is handled by Band A example theses + Band B value cards. Band C
   renders **real recent projects only**, hidden when empty.
3. **Ambient gradient** — **subtle** ambient glow (low-opacity `--brand-gradient`, blurred),
   not a full Lovable aurora — reads more "governed / enterprise".

## 7. Ownership note (IMPORTANT)
`apps/web/src/components/startup-os/startup-command-center.tsx` is being **actively edited
by the autonomous Startup OS `/loop` + Workflows** (the lovable-roadmap driver). This
document is the **design spec for that loop's P3 (entry-surface UI) phase** — it should be
implemented by/within that loop, NOT hand-edited in parallel (collision risk). Concrete
implementation map for whoever picks it up: artifact cards replace `STARTUP_OS_PROMISES`
(~L50/L859); example-thesis chips + ambient glow + gradient headline go in the hero return
(~L801–898); icons `BookClosed/Sparkles/FolderClosed/Layers/ShieldCheck`; arenas from
`STARTUP_ARENAS`.
