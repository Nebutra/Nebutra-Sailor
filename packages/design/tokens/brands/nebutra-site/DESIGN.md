# Nebutra Site — Style Reference

> Linear's grayscale, Nebutra's signature.

**Theme:** dark. **Scope:** the Nebutra site only. This package is applied by
`html[data-brand="nebutra-site"]` on the Nebutra-owned shell of `apps/landing`.
The House design system and every product app are untouched. The Sailor
template carries it in the theme catalog, but nothing there applies it.

The owner's brief (2026-09-27): *a16z's layout, basement's positioning,
Vercel's spec, Cursor's detail, Linear's colour with our brand VI.*

## Why a package and not a token change

The site's look is still being calibrated and the VI is undecided. Changing
`tokens/themes/*.json` would move every app at once. A Brand Package moves only
the pages that carry `data-brand="nebutra-site"`. If the site's choices are
later promoted to the House, that is a separate, deliberate decision.

## Tokens — Colours

Measured on linear.app on 2026-09-27 from computed styles, weighted by painted
area for backgrounds and by text length for ink. These values were not read by eye.

| Name | Value | Role |
|------|-------|------|
| Void | `#08090A` | Canvas. 64% of painted area on linear.app |
| Panel | `#0F1011` | Card, popover. The second surface |
| Raised | `#161718` | Muted fill, hover, inset code |
| Ink 1 | `#F7F8F8` | Headlines, primary text, the action fill |
| Ink 2 | `#D0D6E0` | Body text. Faintly blue, not grey |
| Ink 3 | `#8A8F98` | Secondary text, labels |
| Ink 4 | `#62666D` | Tertiary, metadata, disabled |
| Hairline | `rgba(255,255,255,.08)` ≈ `#1C1D1E` | Default border (66 of 87 bordered elements) |
| Hairline strong | `rgba(255,255,255,.12)` ≈ `#262727` | Emphasised border |

Linear puts exactly one chromatic accent into its chrome: an acid lime `#E4F222`.
In this package that role belongs to the Nebutra VI.

## The VI — decided for the site (2026-09-27)

The owner compared four candidates on the running page (mono, cyan accent,
gradient signature, lifted blue) and picked **the gradient signature**:

- `--brand-decorative-signature`: `linear-gradient(120deg, #6B93F5 → #0BF1C3)`,
  VI blue lifted for the void into VI cyan. It is used as text fill on **one
  keyword per screen** (the `.signature` class), never as a surface, a button or
  a border.
- Ring: `#6B93F5`, the House dark ring, which is VI blue lifted to read on the void.
- Brand role: VI blue `#0033FE`, used for the mark only.
- Action: monochrome, Ink 1 fill with Void ink.

## Typography

Decided on 2026-09-25 and shared with the House: headings are DM Sans 500, body is
Geist, Chinese is MiSans, and mono is Geist Mono. This package does not change
type. Scale follows Linear's measured rhythm:

- H1: 64/64, tracking −2.2%
- H2: 48/48, tracking −2.2%
- Body: 15/24
- UI text: 12–13
- Sections: 128px top and bottom

## Surfaces

The package keeps elevation near zero, like Linear. Depth comes from the step
Void → Panel → Raised and from hairlines, not from shadows.
