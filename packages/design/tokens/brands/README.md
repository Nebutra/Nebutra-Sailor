# Brand Packages — the SSOT

One folder per design language. `brand.json` is the single source of truth; the
emitted skin (`../skins/<id>.css`), the catalog entry
(`@nebutra/theme` → `src/languages.json`) and the built-in package are all
generated from it.

```
brands/<id>/
  brand.json          ← SSOT. Hand-edited, then regenerate.
  DESIGN.md           ← the human style reference brand.json was written from
  refero-tokens.json  ← the raw export, when one exists
```

## Commit the reference next to the JSON

**`DESIGN.md` is not optional.** A Brand Package is a pile of HSL triples; the
document is the only thing that says *why* a value is what it is, and the only
thing a reviewer can check the JSON against.

This is a rule because its absence already cost us a whole design system. Cosmos's
style reference never entered the repo — the app carried a **Linear** export in a
local `design/` folder instead. So `brands/cosmos/brand.json` was authored by
reading hex values off the running page, and it shipped with:

- `#f6f6f4` where the spec says `#f7f5f3`, `#111111` where it says `#0d0d0d`
- `#ecece8` as a third surface, in a system that defines exactly two
- Linear's acid-lime in `roles.brand`, which the system's own don't-list forbids
  outright — *"Do not introduce accent colors into interface chrome."*

Every one of those read plausible. Nothing in CI could catch it, because nothing
in the repo said what the answer was supposed to be. See
`cosmos/brand.json` → `extensions.notes` for the full account.

## Rules

1. **The reference lives here, not in the app.** An app never keeps its own copy
   of a design system's tokens or DESIGN.md. It consumes the emitted skin via
   `html[data-brand="<id>"]` and `@nebutra/tokens/skins/<id>.css`.
2. **Write `brand.json` from the document, never from a running page.** A round
   or familiar hex (`#111111`, `#f6f6f4`) where a deliberate one belongs is the
   tell that someone eyeballed it.
3. **A font stack must name a family in `FONT_REGISTRY`** (`@nebutra/fonts`).
   `emit-skins` refuses to write a skin whose type would silently fall back to
   the system font — next/font registers each face under a hashed family name
   reachable only through its CSS variable, so a bare `"Fraunces"` renders
   nothing. Register the face first.
4. **When the original face is not licensed, record the substitute as a
   decision**, in `extensions.notes`, so the next reader does not treat it as
   debt to repay.

## Regenerate after any edit

```bash
pnpm --filter @nebutra/theme build:codegen
# sync-languages → emit-skins → sync-skins → tsup
```

A correctly scoped edit changes exactly one skin. If `../skins/` comes back with
several files touched, something leaked between languages.

## Adding a brand from a Refero export

See [`../skins/README.md`](../skins/README.md) → *Compile from Refero export*.
Land the export's `DESIGN.md` (and `tokens.json`, as `refero-tokens.json`) in the
same commit as the generated `brand.json`.
