# @nebutra/design-tokens

W3C DTCG (`$value`/`$type`) tokens as the new SSOT, fed through Style Dictionary 4 to generate CSS / TypeScript / Tailwind preset artifacts.

> **Generated runtime contract.** DTCG JSON → Style Dictionary → `build/css/styles.generated.css` → copied to `@nebutra/tokens/styles.css` via `pnpm --filter @nebutra/tokens sync`. `verify:parity` must stay **100%**. Keyframes: `@nebutra/theme/keyframes.css`. Design-language swap: Brand Packages on `@nebutra/theme`.

---

## Layout

```
packages/design/design-tokens/
├── tokens/
│   ├── core.json               primitive scales (nebutra-blue/cyan/neutral, status, sizes)
│   ├── semantic.json           semantic aliases (brand.primary, status.danger, brand.gradient)
│   └── themes/
│       ├── light.json          12-step scales + shadcn HSL + elevation (light)
│       └── dark.json           same shape, dark-mode values
├── style-dictionary.config.mjs three platforms: CSS, TS, Tailwind preset
├── scripts/
│   └── verify-parity.ts        diffs build/css/styles.generated.css vs legacy SSOT
└── build/                      gitignored — generated output
    ├── css/                    one file per mode + styles.generated.css
    ├── ts/                     ES module + .d.ts per mode
    └── tailwind/               .preset.cjs per mode
```

## Commands

```bash
# Generate all artifacts
pnpm --filter @nebutra/design-tokens build

# Diff generated CSS against tokens/styles.css (must stay 100%)
pnpm --filter @nebutra/design-tokens verify:parity

# Clean and rebuild
pnpm --filter @nebutra/design-tokens rebuild
```

## Token format

Each token follows the [W3C DTCG draft](https://design-tokens.github.io/community-group/format/):

```json
{
  "color": {
    "nebutra-blue": {
      "500": {
        "$value": "#0033fe",
        "$type": "color",
        "$description": "Base brand color — 云毓蓝"
      }
    }
  }
}
```

Aliases use the `{path.to.token}` syntax:

```json
{
  "brand": {
    "primary": { "$value": "{color.nebutra-blue.500}", "$type": "color" }
  }
}
```

## Naming convention (CSS variable output)

A custom Style Dictionary transform (`name/nebutra/css`) maps DTCG paths to the same names the legacy SSOT uses, e.g.:

| DTCG path                   | Generated CSS var       |
|-----------------------------|-------------------------|
| `color.nebutra-blue.500`    | `--nebutra-blue-500`    |
| `color.tertiary-purple`     | `--brand-tertiary`      |
| `scale.neutral.1`           | `--neutral-1`           |
| `shadcn.background`         | `--background`          |
| `ds.blue-200`               | `--ds-blue-200`         |
| `elevation.xs`              | `--elevation-xs`        |
| `brand.primary`             | `--brand-primary`       |
| `brand.gradient.start`      | `--brand-gradient-start` |
| `brand.gradient.end`        | `--brand-gradient-end`  |
| `brand.gradient.primary`    | `--brand-gradient`      |
| `brand.gradient.logo`       | `--brand-gradient-logo` |
| `brand.gradient.logo-reverse` | `--brand-gradient-logo-reverse` |
| `size.container.text`       | `--container-text`      |
| `size.radius.md`            | `--radius-md`           |
| `duration.flow`             | `--duration-flow`       |
| `easing.out`                | `--ease-out`            |
| `fontFamily.sans`           | `--font-sans`           |

This keeps the generated CSS interchangeable with runtime `packages/design/tokens/styles.css` (sync copies generated → runtime).

## Build modes

The build emits one file per mode:

| Mode    | Selector | Source files                                  |
|---------|----------|-----------------------------------------------|
| `light` | `:root`  | core.json + semantic.json + themes/light.json |
| `dark`  | `.dark`  | core.json + semantic.json + themes/dark.json  |

`build/css/styles.generated.css` is the concatenation of `light.css` + `dark.css` and is the file that `verify-parity.ts` diffs against `packages/design/tokens/styles.css`.

## Parity status

Run `pnpm verify:parity` for the live report. **Contract: 100% overall** (exit non-zero below floor).

Runtime product chrome is `packages/design/tokens/styles.css`, refreshed by:

```bash
pnpm --filter @nebutra/design-tokens build
pnpm --filter @nebutra/tokens sync
```

Baseline when last verified:

- `:root` / `.dark`: 100% matched
- `.dark`: ~87%
- **Overall: ~87% tokens at parity**

The 70% parity floor is enforced; below it, the script exits non-zero.

### Known parity gaps (follow-ups)

1. **Display-P3 wide-gamut overrides** — the legacy SSOT defines `--nebutra-brand-blue` / `--nebutra-brand-cyan` aliases inside `@supports (color: color(display-p3 ...))`. Those are not yet modeled in DTCG; today the generated values are the sRGB hex fallback. Next step: add a P3 wide-gamut variant in `core.json` and emit it under a SD `mediaQuery` wrapper.
2. **`oklch()` overrides for `--ds-gray-*`** — the legacy file ships sRGB `hsla()` baseline values and overrides them under `@supports (color: oklch(...))`. The generated CSS currently keeps only the sRGB fallback. Next step: add a separate `themes/ds-gray-oklch.json` and a SD format that wraps it in the `@supports` block.
3. **Compound shorthand tokens not yet emitted**:
   - `--transition` (combines `--transition-duration` + `--transition-easing`)
   - `--focus-ring` (compound box-shadow recipe)
   These can be modeled as DTCG `composite` tokens; deferred to follow-up.
4. **`--brand-primary` / `--brand-accent` in `.dark` mode** — the legacy SSOT keeps these mapped to the sRGB primitives, but in dark mode the visual brand is `var(--blue-9)` which itself maps to `--nebutra-blue-400`. Today the DTCG model resolves to the *core* primitive (always blue-500/cyan-500). Next step: add per-mode brand alias overrides in the dark theme file.
5. **Geist 12-step scale alias indirection** — `--blue-9` resolves to its primitive (`#0033fe` light / `#5c7cfa` dark) via the legacy `var(...)` chain. The verify script applies var() resolution to make the comparison fair, but the generated CSS inlines the primitive rather than emitting a `var(...)` chain. Functionally equivalent, but if app code depends on the chain (e.g. for runtime `getComputedStyle` lookups), use `outputReferences: true` in the SD config.

## Sandbox / install notes

If `pnpm add -D style-dictionary@^4 --filter @nebutra/design-tokens` is blocked in your sandbox, run it manually from the repo root. Style Dictionary 4 ships with native DTCG (`$value`/`$type`) support via the `tokens-studio` preprocessor — no plugin needed.

If Style Dictionary 4 fails to install, **Terrazzo** (https://terrazzo.app) is a drop-in alternative that also speaks DTCG and ships its own CSS / TS / Tailwind generators. Switch via:

```bash
pnpm add -D @terrazzo/cli @terrazzo/plugin-css @terrazzo/plugin-js --filter @nebutra/design-tokens
```

…and replace `style-dictionary.config.mjs` with `terrazzo.config.js` per their docs. The tokens themselves are portable — both tools consume DTCG.

## Why not edit `packages/design/tokens/styles.css` directly?

**Do not hand-edit runtime `styles.css`.** Edit DTCG under `tokens/*`, then:

```bash
pnpm --filter @nebutra/design-tokens build
pnpm --filter @nebutra/design-tokens verify:parity
pnpm --filter @nebutra/tokens sync
```

`styles.css` is the published runtime file; this package is the machine-readable authoring SSOT (Figma, design-doc, Storybook).
