# Visual language pass — the questions

Pass 1 (`research/competitors/`) answered information architecture: where configuration lives,
whether a job is a node, what scope a Subject has. It never asked what these products *look* like,
and PARA inherited the shared `@nebutra/ui` skin by default. This pass reads the same 310 captures
again and asks only visual questions.

Read stills. Anything a still cannot show — motion, timing, easing, hover transitions — is `U`.
Tier every claim `O` / `I2` / `I1` / `U` exactly as pass 1 did, and cite the capture.

## The questions

1. **Surface ladder** — how many distinct background levels does the product use (page, panel,
   card, input, overlay)? Are they separated by luminance, by border, by shadow, or by nothing?
   Give approximate luminance for each and the delta between neighbours.
2. **Node / card treatment** — corner radius, border presence and weight, shadow, whether media
   bleeds to the edge, what the resting state of a content card is.
3. **Selection expression** — how is "this is selected" drawn? Ring, offset ring, border swap,
   glow, scale, overlay? What colour, what width, does it sit inside or outside the bounds?
4. **Chrome separation** — how are the top bar, panels and docks separated from the work surface?
   Hairline border, shadow, translucency + blur, or pure spacing?
5. **Type scale** — how many distinct sizes and weights appear in product chrome? Where does the
   product use a smaller-than-body size, and for what?
6. **Accent budget** — how much saturated colour appears on a resting screen, and on what? Count
   the coloured elements. Is the accent reserved for one action, or spread?
7. **Density and rhythm** — control heights, gaps between controls, padding inside panels.
8. **Overlay treatment** — popovers, menus and floating toolbars: background, border, shadow,
   blur, radius. Do they read as glass, as solid, or as paper?
9. **Iconography** — stroke weight, filled vs outline, size relative to adjacent text.
10. **Empty and loading states** — what does an empty canvas show? What does an in-flight
    generation look like on the surface?

## Output

Write `research/visual/<slug>.md`, at most 150 lines, structured by the ten questions above.
Every answer: the observation, its tier, and the capture it comes from. State numbers where the
image lets you read them, and say "cannot read from a still" where it does not.
