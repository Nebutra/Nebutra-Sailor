# KCQ brand architecture: endorsed product brand

- **Status**: Proposed
- **Date**: 2026-10-09
- **Owner**: Tseka Luk
- **Related**: KLineChartQuant ADR 0001, `packages/design/brand` (VI lock 云毓蓝 #0033FE,
  云毓青 #0BF1C3), `packages/design/theme` Brand Packages, `apps/kcq/DESIGN.md`

## Context

KLineChartQuant has an existing wordmark (Outfit 600, by its original author), no logo file, no
brand colour, and three spellings of its name. `apps/kcq/DESIGN.md` says "KCQ owns the palette";
`apps/kcq/src/styles.css` bridges one way, mapping Sailor semantics onto `--klc-color-ui-*` with an
ad-hoc `@theme inline` block.

## Decision

1. **Endorsed brand, not a Nebutra skin.** KCQ keeps its own wordmark, name and palette.
   Nebutra appears as an endorsement (`KLineChartQuant by Nebutra`) in footer, auth, and landing,
   never in the workspace chrome.
2. **KCQ derives a Brand VI** from the wordmark: monogram `KCQ`, a candle glyph for
   icon/favicon/app icon, one brand accent and its light/dark ramps. It does not reuse 云毓蓝 as
   its accent. Market colours (up/down) stay semantic and are never the brand colour.
3. **The KCQ Brand Package lives in Sailor** (`packages/design/theme` brand `kcq`), mapping both
   ways between `--klc-color-ui-*` and Sailor semantic roles, with light/dark and the five chart
   presets as variants. It replaces the `@theme inline` block in `apps/kcq/src/styles.css`.
4. **The upstream fork keeps its own token source** (`packages/core/src/foundation/tokens`); the
   Brand Package is generated from or aligned with it, never the other way round, so upstream
   does not depend on Sailor.

## Consequences

- Add `kcq` to the brand registry and OG/metadata generators.
- The brand accent needs WCAG AA on both themes and every preset surface.
