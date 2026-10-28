---
"@nebutra/ui": minor
"@nebutra/tokens": patch
---

Mirror the component library for right-to-left. Physical direction classes
(ml/mr, pl/pr, left/right, text-left/right, border-l/r, rounded-l/r) are now
logical (ms/me, ps/pe, start/end, text-start/end, border-s/e, rounded-s/e), a
new `lint-logical-direction` guard keeps them that way, and the keyboard,
arrow and drag behaviour of Scroller, Resizable, Tabs, ToggleGroup, Slider,
Breadcrumb, Pagination, Calendar and the menu family follows `dir`.

Sheet accepts `side="start"` and `side="end"` next to `left` and `right`.
DropdownMenu and ContextMenu take a `dir` prop. CommandDialog takes `title`
and `description`. Stepper and InputOTP gain an `error` state, Pagination a
`linkLabel`.

HoverCard now opens on keyboard focus, closes on blur and Escape, toggles on
touch, and takes a controlled `open`. It also accepts the logical sides
`inline-start` and `inline-end`.

Drawer overlay and content sit on the same layer tokens as Sheet and Dialog,
and DrawerHeader aligns by direction.

Button `outline` and `ghost` set their own text colour, so they stay legible in
a dark pane inside a light document (the HoverCard triggers in the Split
preview were nearly invisible).

Visible in left-to-right too: ContextMenu and Menubar submenus open towards
the inline end by default, and Calendar reads the document direction.
