# Design skins & Brand Packages

**Goal:** Create Center users swap a brand by applying one **Brand Package** — not by hunting call sites.

## Two layers

| Layer | What | Path |
|-------|------|------|
| **Recipe defaults** | Button default reads `--btn-default-*` | `@nebutra/tokens/recipe.css` (auto via `preset.css`) |
| **Brand skin** | Semantic colors + recipe overrides | `@nebutra/tokens/skins/<id>.css` or `brands/<id>/skin.css` |
| **Brand JSON** | Machine contract for Create Center | `brands/<id>/brand.json` |

## Product chrome contract

| Semantic | Tailwind / CSS | Role |
|----------|----------------|------|
| `--primary` + `--primary-foreground` | `bg-primary` | **Atomic pair** |
| `--background` / `--foreground` | canvas | App shell |
| `--card` / `--muted` / `--border` / `--input` / `--ring` | surfaces | Controls |
| `--btn-default-bg/fg/border/radius` | `Button` default | **Recipe** (solid vs outline) |

**Do not** paint product chrome with raw hex / `bg-blue-9` / VI `--brand-primary`.

## Apply a brand (opt-in)

```css
@import "@nebutra/ui/styles/preset.css";
/* or: tokens + recipe + sources */

@import "@nebutra/tokens/skins/linear.css"; /* solid acid-lime CTA */
/* @import "@nebutra/tokens/skins/gsap.css";  outline-first / gradient-stroke */
```

Optional: `html data-brand="gsap"` for runtime targeting (skins also bind `:root`).

Default Nebutra shipping brand = **no skin import**.

## Compile from Refero export (Create Center pipeline MVP)

```bash
# Folder with tokens.json + DESIGN.md (Desktop/GSAP style)
pnpm --filter @nebutra/tokens exec node scripts/compile-brand.mjs ~/Desktop/GSAP --id gsap

# Writes:
#   packages/design/tokens/brands/gsap/brand.json
#   packages/design/tokens/brands/gsap/skin.css
#   packages/design/tokens/skins/gsap.css
```

Programmatic:

```ts
import { compileReferoTokens } from "@nebutra/tokens/brand-package";

const { brand, css, warnings } = compileReferoTokens({
  tokens: referoJson,
  designMd,
  id: "gsap",
});
```

## Fixtures

| Brand | Recipe | Notes |
|-------|--------|-------|
| **linear** | `solid`, 6px radius | Acid-lime filled CTA |
| **gsap** | `gradient-stroke` / outline, 100px pill | Green is **accent**, not solid fill |

## Why recipe exists

Linear and GSAP both dark — but **button language differs**. Color-only skins fail Create Center.  
`Button` / `Badge` defaults + Card/Input elevation/heights consume recipe vars so packages flip solid ↔ outline ↔ no-shadow without call-site edits.

Governed surface: `--btn-default-*`, `--badge-default-*`, `--control-height-*`, `--elevation-card|control|raised`, `--font-weight-medium`.  
**Not governed (allowed):** VI logo hex, OAuth marks, decorative demos, trial/turbo special fills.

## Runtime apply (Create Center preview)

```ts
import {
  compileReferoTokens,
  applyBrandPackage,
  clearBrand,
  restorePersistedBrand,
  validateBrandPackage,
  useBrand,
  useBrandIframePreview,
} from "@nebutra/tokens";

const { brand, warnings } = compileReferoTokens({ tokens, designMd, id: "gsap" });
const v = validateBrandPackage(brand);
if (!v.ok) throw new Error(v.errors.join(", "));

applyBrandPackage(brand, { persist: true });
clearBrand({ persist: true });
```

### React hooks

```tsx
// Host app
const { brand, apply, clear } = useBrand({ autoRestore: true });

// Multi-tenant iframe preview
const { iframeRef, apply: preview, writePreviewDocument } = useBrandIframePreview({
  baseStylesheetHrefs: ["/tokens-preset.css"],
});
// <iframe ref={iframeRef} />
// preview(brand)  or  writePreviewDocument(brand, "<button class='btn-brand-default'>CTA</button>")
```

### Fonts + zones

- `typography.faces[]` → emitted as `@font-face` (swap URL for Create Center CDN/upload).
- `zones.product` / `zones.marketing` → CSS vars + `[data-zone="…"]` / `.zone-…` consumers.
- Marketing may use 224px display; product stays compact.

### design-sync

```ts
import { getDesignSync, compileBrandFromTokenSets } from "@nebutra/design-sync";

const sync = await getDesignSync();
const { sets } = await sync.pull();
const { brand, css, warnings } = compileBrandFromTokenSets(sets, { id: "tenant-a" });
```

```bash
design-sync brand --json --id tenant-a
```
