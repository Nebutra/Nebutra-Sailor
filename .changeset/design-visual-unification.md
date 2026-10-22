---
"@nebutra/ui": minor
"@nebutra/tokens": minor
"@nebutra/theme": patch
---

Unify the design system's surface language around one 2026 contract. Static
borders are hairlines (`border-hairline`, `shadow-border`) and a language's ink
outline is opt-in through `--border-strong`; the radius ladder is control 8 /
card 12 / chip 6; keyboard focus is one 2px ring with a 2px offset that keeps
the control's corner; every interactive control transitions specific
properties on the micro duration, with pressed feedback on buttons.

Popover, menu, select, navigation menu, tooltip and command surfaces now share
the card radius and the overlay shadow-border instead of a solid border plus a
heavy shadow. Selected states use fills instead of solid ink blocks.
