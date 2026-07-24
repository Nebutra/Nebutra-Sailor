# `@nebutra/typelens-catalog`

Status: WIP — catalog data model exists; product surface and seed content are not production-integrated.

Data layer for **Type Lens** (`typelens.nebutra.com`).

> The Typography Lens — works · pairings · extract packs for designers and design agents.

## Product vocabulary

| Term | ZH | Meaning |
|------|-----|---------|
| Work | 作品 | Real visual piece |
| Pairing | 搭配 | Font combination in context |
| Specimen | 范例 | Machine-readable type system |
| Extract | 生成包 | Agent-ready generation pack |

Prefer: 作品 · 搭配 · 范例 · 生成包 · 发现  
Avoid: 档案 · 归档 · 字库仓库

```ts
import { extractSpecimen, listWorks, searchSpecimens } from "@nebutra/typelens-catalog";
```

## Cold-start from Fonts In Use (research)

We **do not** republish FIU editorial text or images. A research crawler pulls public
**metadata only** (use title, typeface co-occurrence, tags), keeps **free commercial**
faces that map into our catalog, and writes a draft seed.

```bash
pnpm --filter @nebutra/typelens-catalog research:fiu
pnpm --filter @nebutra/typelens-catalog research:fiu:quick
```

Outputs: `research/fiu-coldstart.json`, `research/fiu-seed-draft.json`.

See `docs/plans/2026-07-24-typelens-product-voice.md`.
