# Library patterns — assets, subjects, brand kit, knowledge, skills; scope; entry into the canvas

Sources: `research/competitors/<slug>/domain/objects.yaml`, `business/persistence.md`, `synthesis.md` §3.
Tiers per line; only O/I2 are facts.

## Evidence

### Reusable object inventory

| Object class | Seko | TapNow | Flowith | Lovart | LibTV | fal |
|---|---|---|---|---|---|---|
| **Generated output history** | 生成历史 + 资产库 (scopes 当前项目/故事/数字人/画布) — account (O) | History drawer — per project, by media, dated (O); Library Private/Team (O) | Media History `/gallery` — account by day; flow-scoped drawer (I2) (O) | 生成文件 — per project (O) | 生成历史 — per canvas / per project, member-attributed, rating filter (O); 素材库 团队/我的 (O) | `/assets` All media / Collections / Favorites — account, auto-collected (O) |
| **Subject / character identity** | 主体: 名称 · 类别 角色\|场景 · 音色 · 形象; account (个人) + platform (公共 ~62); per-model ref capacity 3–14 (O) | Library categories Character / Scene / Item / Style / Sound Effect; "Save to Library"; Elements → **Subject** packs (Seedance only); AI Character preset catalogue with facets (O) | **none** (I2); per-run "Style +" image slot (O) | **none** (O); per-message 参考图 slots | 角色库: platform archetypes as 4-image sheets (全身/面部/表情九宫格/呈现板), 应用至画布 + chip in video node (O); user-created U | Entities: Characters / Props / Environments / Styles / Scenes; "Link character" on a result (O existence, I2 usage) |
| **Brand kit** | – | – | – | Brand kit (Beta): Logo / 字体 / 颜色 / 设计指南 / 图像 / 品牌指南; account-level, attached per project from title chevron (O) | – | – |
| **Knowledge** | – | Memory ("build creative memory for this project") — labels O, mechanics U | Knowledge Garden — account-level knowledge bases, shareable, Knowledge Market (O) | – | – | agent memory (marketing, U) |
| **Skills / recipes** | 技能社区: packaged workflows, 8 categories, usage counters, `/` in composer (O) | clonable project graphs ("Video Edit (copy)") + agent-read docs; "Reusable personal Skills" sold (O) | Apps rail = task templates (O) | Skill book: 19 prompt recipes / 6 categories (O) | marketplace recipes with declared inputs/outputs; 公共 / 收藏 / 团队 (O) | Workflows templates (O, enumerated) |
| **Effects / templates** | 特效模版 (campaign presets) (O) | Templates (Preview / Try Now); Share-by-link = copyable template (O) | template gallery "Use" (O, not run) | – | 特效广场 (author, usage, 商用) applied in-node, locks model (O); 工具箱 团队/我的 (O) | Model Sets in Sandbox (O) |
| **Community models** | – | Model Mart (I2) | – | – | liblib.art LoRA / Checkpoint pages with versions, trigger words, 推荐参数; trainable `/pretrain` (O) | – |

Evidence: `seko/evidence/characters.list.webp`, `canvas.subject-create-form.webp`, `canvas.rail-panel-47.webp`,
`skills.list.webp`; `tapnow/evidence/canvas.library.private.webp`, `canvas.library.ai-character.webp`,
`canvas.dock.history.with-item.webp`, `app.skill-card.canvas.webp`; `flowith/evidence/knowledge-garden.default.webp`,
`knowledge-market.default.webp`, `media-history.default.webp`; `lovart/evidence/brandkit.list.webp`,
`canvas.project-menu.webp`, `home.book-popover.webp`; `libtv/evidence/libtv.canvas.dock-character-lib.webp`,
`libtv.canvas.dock-gen-history.webp`, `libtv.canvas.node-fx-chip.webp`, `libtv.skill.detail.webp`,
`libtv.art-modelinfo.default.webp`; `fal/evidence/assets.webp`, `sandbox.sets.webp`.

### Scope

| Scope | Who |
|---|---|
| Platform presets (read-only catalogue) | Seko 公共主体, TapNow AI Characters, LibTV 角色库, fal Model Sets (O ×4) |
| Account | Seko 主体 + 资产库, Flowith gallery + gardens, Lovart brand kit, fal assets/entities (O ×4) |
| Team | TapNow Library Team + Team projects, LibTV 素材库/工具箱/Skills 团队 (O ×2) |
| Project | TapNow History, Lovart 生成文件 + brand-kit attachment, LibTV 生成历史 全部画布, TapNow Memory (labels) (O ×3) |
| Canvas | LibTV 生成历史 本画布 (O ×1); Seko 资产库 filter 画布 (O) |

No product scopes an identity object (subject/character) to a single project; identities are account/platform,
outputs are project/canvas.

### How library objects enter the canvas

| Entry | Who | Tier |
|---|---|---|
| `@` mention in the prompt | Seko `@`主体 picker (O), LibTV `@引用素材` / agent `@` (O), fal "@ to reference entities" (O hint), TapNow composer "@ add references" (O) | 4 O |
| Chip / slot on the node | TapNow Reference handle, Omni Reference (O); LibTV chips 参考 / 角色库 / 特效 / 运镜 (O); Lovart 参考图 slot (O); Seko 上传/选择 (O); Flowith Style + (O) | 5 O |
| "Apply to canvas" from the list | TapNow History → Apply to Canvas (O); LibTV 角色库 应用至画布, 从生成历史选择 (O); Seko 资产库 import (O) | 3 O |
| Drag-drop upload | Seko (O), TapNow Upload node (O), Flowith Upload (O), Lovart upload tool (O), LibTV 添加资源 上传 (O) | 5 O |
| Save from a result back to the library | TapNow "Save to Library" (O); fal Favorite / Add to Collection / Link character (O) | 2 O |
| Attach at project level | Lovart brand kit chevron (O) | 1 O |

### Presentation

- Modal over the canvas: Seko 资产库 / 主体库 / 特效模版 (960/860/880 px), Flowith Knowledge Garden, LibTV 特效广场 (O).
- Left drawer replacing the dock: TapNow Library / History (~330 px) (O); Lovart 图层 / 生成文件 280 px (O); Flowith Media
  History 350 px (O); LibTV dock panels + 资产管理 side panel (O).
- Dedicated page: Seko `/characters`, Flowith `/gallery`, fal `/assets`, Lovart `/zh/brand-kit` (O).
- Never a permanent panel: **5 O**.

## Pattern

1. Every product has **two libraries**: a history of what was generated (project/canvas-scoped, auto-filled) and a
   catalogue of reusable inputs (account/platform-scoped, curated). They are separate surfaces everywhere.
2. **Identity = subject/character** with a multi-image sheet and optional voice; platform presets seed it. Products
   that lack it (Flowith, Lovart) substitute per-run reference slots.
3. **`@` is the universal entry**, mirrored by node chips; "apply to canvas" is the list-side entry.
4. Brand kit, knowledge bases and memory are **single-product** objects.
5. Skills exist in five products but mean three different things (prompt recipe · clonable graph · knowledge base).

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| Library is a drawer/modal, closed by default, never a permanent panel | A | Seko, TapNow, Flowith, Lovart, LibTV (O) | **A — adopt** (AC-05). |
| Two scopes inside the drawer: **Generated** (this workspace/project) and **Assets** (account) | A | history: all six (O); account catalogue: Seko, TapNow, Flowith, fal (O) | **A — adopt** as the two tabs of the M1 Library drawer. |
| Subject / character object (name · category · image sheet · optional voice), account + platform presets | A | Seko, TapNow, LibTV (O), fal entities (O existence) | **A — adopt the object**; UI deferred past M1 (PRD non-goal "full DAM"). Voice field **B** (Seko only, but PARA video logic). |
| `@` mention as the entry from any composer | A | Seko, LibTV, fal, TapNow (O) | **A — adopt** (Cmd+K and composer). |
| Reference chip/slot on the node | A | TapNow, LibTV, Lovart, Seko, Flowith (O) | **A — adopt** in the node generator schema. |
| "Apply to canvas" from a list item | A | TapNow, LibTV, Seko (O) | **A — adopt** (drawer item → node). |
| Drag-drop upload onto the canvas | A | all five (O) | **A — adopt** (already storage-neutral work per ADR). |
| Save a result back to the library / favourite | B | TapNow, fal (O) | **B — adopt** as a toolbar/context action. |
| Team scope | B | TapNow, LibTV (O) | **B — model it, hide it** (PARA is multi-tenant by construction). |
| Brand kit | — | Lovart only (O) | **EXPERIMENTAL.** |
| Knowledge base / memory | — | Flowith (O); TapNow labels (U) | **EXPERIMENTAL.** |
| Skills | A existence / diverging shape | Seko, TapNow, Lovart, LibTV (O) | **EXPERIMENTAL on shape**; PRD non-goal. Record that all four surface skills from the composer, not from a library drawer. |
