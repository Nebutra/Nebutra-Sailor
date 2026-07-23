# Design skins (swap surface)

**How to swap a design system / visual skin without hunting call sites**

## Contract

Product UI may only depend on **semantic tokens** (and Tailwind classes that resolve to them):

| Semantic | Typical Tailwind | Role |
|----------|------------------|------|
| `--primary` / `--primary-foreground` | `bg-primary` `text-primary-foreground` | Actions, key CTAs |
| `--background` / `--foreground` | `bg-background` `text-foreground` | App chrome |
| `--card` / `--muted` / `--border` / `--input` / `--ring` | `bg-card` `border-border` … | Surfaces & controls |
| `--destructive` / `--success` / `--warning` / `--info` | status utilities | Feedback |
| `--radius-*` | `rounded-md` … | Shape |

**Identity (VI)** tokens are separate and must **not** paint product chrome:

| VI | Role |
|----|------|
| `--brand-primary` (`#0033FE`) | Logo / wordmark / brand assets |
| `--brand-accent` | Brand accent on identity surfaces |
| `--brand-gradient-logo` | Logo gradient only |

`--brand-gradient` is a **legacy alias of** `hsl(var(--primary))` for old class strings — not a second palette.

## Swap procedure (single surface)

1. Edit **only** the semantic values in `@nebutra/tokens` generation sources  
   (`packages/design/design-tokens/tokens/themes/light.json` + `dark.json`, or a future `skins/*.css` override).
2. Rebuild tokens: `node packages/design/design-tokens/style-dictionary.config.mjs` then `node packages/design/tokens/scripts/sync-styles.mjs`.
3. Apps already import `@nebutra/ui/styles/preset.css` or `sources.css` — **no per-component color edits**.

Optional multi-mood product themes (`@nebutra/theme` + `[data-theme]`) override the same semantic names in oklch form; prefer one system per app.

## Confidence checklist

- [ ] No product CTA uses `#0033FE` / `--brand-primary` as fill
- [ ] No product CTA uses multi-hue logo gradient as fill
- [ ] Apps import package CSS entry (not hand-rolled `@source` paths)
- [ ] Changing `--primary` in the theme file recolors buttons/inputs/focus globally

## Refero / external DS challenge

Map the external system’s primary/surface/border tokens → this semantic table in **one** theme file.  
If a component still looks wrong, it is a **remaining hard-coupling** (file listed in DS audit), not “edit every call site.”
