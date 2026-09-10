# Library — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/library-patterns.md,
research/synthesis/page-topology-comparison.md, research/synthesis/selection-patterns.md,
research/synthesis/versioning-patterns.md, research/synthesis/pattern-matrix.md

Scope: assets vs subjects/characters vs brand kit vs knowledge vs skills; scopes; `@` entry and apply-to-canvas; what
the M1 Library drawer holds and what scope `Subject` gets.

## Evidence

Paths relative to `research/competitors/`.

- Seko · 生成历史 + 资产库 (filters 当前项目/故事/数字人/画布) at account scope; **主体** = 名称 · 类别 角色|场景 · 音色 ·
  形象, account (个人) + platform (公共 ~62 presets), per-model reference capacity 3–14; `@`主体 picker in the prompt;
  资产库 / 主体库 / 特效模版 are centred modals; 技能社区 packaged workflows via `/` — O ·
  `seko/evidence/characters.list.webp`, `seko/evidence/canvas.subject-create-form.webp`,
  `seko/evidence/canvas.node.at-reference-picker.webp`, `seko/evidence/canvas.subject-library-modal.webp`,
  `seko/evidence/skills.list.webp`
- TapNow · Library Private / Team with categories Character / Scene / Item / Style / Sound Effect; "Save to Library"
  from a result; AI Character preset catalogue; History drawer per project by media, dated, Select → "N selected" →
  Apply to Canvas; composer "@ add references"; Reference handle on the node; Memory cards (labels O, mechanics U);
  skills = clonable project graphs — O · `tapnow/evidence/canvas.library.private.webp`,
  `tapnow/evidence/canvas.library.ai-character.webp`, `tapnow/evidence/canvas.dock.history.with-item.webp`,
  `tapnow/evidence/app.skill-card.canvas.webp`
- Flowith · **no subject object**; Media History `/gallery` by day (account) + flow drawer 350 px; Knowledge Garden
  account-level knowledge bases + Knowledge Market; per-run "Style +" image slot — O ·
  `flowith/evidence/media-history.default.webp`, `flowith/evidence/knowledge-garden.default.webp`,
  `flowith/evidence/knowledge-market.default.webp`
- Lovart · **no subject object**; 生成文件 drawer 280 px per project; **Brand kit** (Logo · 字体 · 颜色 · 设计指南 · 图像 ·
  品牌指南) account-level, attached per project from the title chevron; Skill book 19 prompt recipes; per-message
  参考图 slots — O · `lovart/evidence/brandkit.list.webp`, `lovart/evidence/canvas.project-menu.webp`,
  `lovart/evidence/home.book-popover.webp`, `lovart/evidence/canvas.float-file-search-button.webp`
- LibTV · 角色库 platform archetypes as 4-image sheets (全身/面部/表情九宫格/呈现板) with **应用至画布** and a chip in the
  video node; 生成历史 本画布 / 全部画布, member-attributed, rating filter; 素材库 / 工具箱 团队 / 我的; `@引用素材`;
  特效广场 applied in-node; marketplace skills with declared inputs/outputs — O ·
  `libtv/evidence/libtv.canvas.dock-character-lib.webp`, `libtv/evidence/libtv.canvas.dock-gen-history.webp`,
  `libtv/evidence/libtv.canvas.dock-asset-lib.webp`, `libtv/evidence/libtv.canvas.node-fx-chip.webp`,
  `libtv/evidence/libtv.skill.detail.webp`
- fal · `/assets` All media / Collections / Favorites, account, auto-collected; Entities Characters / Props /
  Environments / Styles / Scenes with "Link character" on a result (existence O, use I2); "@ to reference entities"
  hint; Model Sets in Sandbox — O · `fal/evidence/assets.webp`, `fal/evidence/sandbox.sets.webp`
- Presentation: modal (Seko ×3, Flowith knowledge, LibTV 特效广场); left drawer replacing the dock (TapNow ~330,
  Lovart 280, Flowith 350, LibTV panels); page (Seko `/characters`, Flowith `/gallery`, fal `/assets`, Lovart brand
  kit). **Never a permanent panel: 5/5** — O.
- Entry counts (O): `@` mention 4 (Seko, LibTV, fal, TapNow) · chip/slot on the node 5 · "apply to canvas" 3 (TapNow,
  LibTV, Seko) · drag-drop upload 5 · save result back to library 2 (TapNow, fal) · attach at project level 1 (Lovart).
- Scope counts (O): platform presets 4 (Seko, TapNow, LibTV, fal) · account 4 · team 2 (TapNow, LibTV) · project 3
  (TapNow History, Lovart 生成文件, LibTV 全部画布) · canvas 1–2 (LibTV 本画布, Seko filter). **No product scopes an
  identity object to a single project.**

## Pattern

Converges (≥3): every product has **two libraries** — a history of generated outputs (project/canvas-scoped,
auto-filled: 6/6) and a catalogue of reusable inputs (account/platform-scoped, curated: Seko, TapNow, Flowith, fal);
**identity = subject/character** with a multi-image sheet, seeded by platform presets (Seko, TapNow, LibTV, fal);
**`@` is the universal entry**, mirrored by reference chips on the node; "apply to canvas" is the list-side entry;
libraries are drawers/modals, never permanent panels (5/5); skills are entered from the composer, not a drawer (Seko,
TapNow, Lovart, LibTV).

Diverges: brand kit (Lovart only); knowledge base (Flowith only) and memory (TapNow labels); team scope (TapNow, LibTV
only); voice on the subject (Seko only); generated-history scope (account with filters in Seko; project in TapNow,
Lovart; canvas *and* project in LibTV); skills mean three different things (recipe · clonable graph · knowledge).

## PARA decision

1. **Library is a left drawer, closed by default, never a permanent panel** — **A** (Seko, TapNow, Flowith, Lovart,
   LibTV). Matches AC-05.
2. **M1 Library drawer holds two tabs: `Generated` and `Assets`** — **A** (history 6/6; catalogue Seko, TapNow,
   Flowith, fal). `Generated` = outputs of this workspace with a "whole project" toggle — **B** (LibTV 本画布/全部画布,
   Seko filter). `Assets` = account-scoped uploads and saved results.
3. **`Subject` is a first-class object: name · category (character | scene | item | style) · image sheet · optional
   voice**, at **account scope with a read-only platform preset catalogue** — **A** for the object and its scope
   (Seko, TapNow, LibTV; fal entities existence). **Never project-scoped** (0/6). Voice field — **B** (Seko only +
   PARA video logic). The Subject **UI** (a third `Subjects` tab or a modal) is deferred past M1 (PRD non-goal "full
   DAM"); the type lands now.
4. **`@` mention from any composer (agent composer, node prompt, Cmd+K) opens a picker over Subjects, Assets and
   nodes** — **A** (Seko, LibTV, fal, TapNow; LibTV for nodes).
5. **Reference chip/slot on the node generator** (`GeneratorState.references[]`, canvas.md) — **A** (TapNow, LibTV,
   Lovart, Seko, Flowith).
6. **"Apply to canvas" on every drawer item** (creates a node at the viewport centre) — **A** (TapNow, LibTV, Seko).
   Bulk select in `Generated` — **B** (TapNow "N selected", LibTV 批量操作).
7. **Drag-drop upload onto the canvas → asset + node** — **A** (all five); storage-neutral, allowed now.
8. **Save a result back to Assets / favourite** as a toolbar or context action — **B** (TapNow, fal).
9. **Team scope: model `scope: "account" | "team"` on Asset and Subject, hide the UI** — **B** (TapNow, LibTV + PARA
   multi-tenancy by construction).
10. **Brand kit** — **EXPERIMENTAL** (Lovart only). **Knowledge base / memory** — **EXPERIMENTAL** (Flowith; TapNow
    labels U). Neither enters the M1 drawer.
11. **Skills / recipes** — existence **A**, shape **EXPERIMENTAL**; when they arrive they enter from the composer
    (`/`), not from the Library drawer (Seko, TapNow, Lovart, LibTV).
12. **Effects / template catalogue** applied in-node (LibTV 特效广场, Seko 特效模版) — **B**; post-M1.

### Type changes for `apps/para/src/domain/types.ts`

```ts
interface Asset { id; type; url; label; aspect; scope: "account" | "team";            // B (TapNow, LibTV)
  origin: "upload" | "generated"; jobId?: string; workspaceId?: string; projectId?: string;   // A (6/6 history)
  createdAt: string; favorite?: boolean }                                              // B (TapNow, fal)
interface Subject { id; name; category: "character" | "scene" | "item" | "style";     // A (Seko, TapNow, LibTV)
  sheet: string[] /* asset ids */; voice?: string; scope: "account" | "team" | "platform" }
```

## What this changes in the current PRD/shell

- **Keep**: Library drawer left 280–320 px, closed by default; "Assets" dock entry; AC-05.
- **Change**: PRD "Library drawer" gains the two-tab contract `Generated | Assets` with the project toggle; `Asset`
  and `Subject` types as above; the mock adapters split assets by `origin`; every drawer item gets "Apply to canvas";
  drag-drop from drawer to canvas creates a node; `Subject.type: string` becomes `category`.
- **Remove**: nothing.
- **Defer**: Subjects tab/modal UI, team UI, brand kit, knowledge, skills, effects catalogue, bulk select.

## Open questions

- U · Generated history: workspace-first or project-first by default? Closing: M2 telemetry on the toggle; LibTV
  authenticated run to see which is default when a project has several canvases.
- U · User-created subjects in LibTV (only platform sheets observed). Closing: LibTV authenticated 角色库 → create.
- U · fal entity usage in the playground (existence only). Closing: fal authenticated run with `@` in a prompt.
- U · TapNow Memory mechanics (project knowledge). Closing: TapNow authenticated Settings → Memory.
- U · Whether a subject should carry a voice by default. Closing: Seko 数字人 run with a 主体 that has 音色.
