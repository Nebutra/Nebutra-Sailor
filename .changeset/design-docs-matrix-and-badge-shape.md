---
"@nebutra/ui": minor
"@nebutra/tokens": patch
"@nebutra/theme": patch
---

Toggle now follows the active design language action colour when on (default,
blue and cyan), with the thumb on --primary-foreground; success, warning and
error stay opt-in status colours.

Badge radius is declared per design language instead of falling back to a pill:
a language that does not declare one follows its chip step. Linear, Factory,
Notion and Stripe badges are no longer pills.

Add playgrounds, state matrices and API tables for 28 more components, with
JSDoc on their parts. Fix the disabled state of MenubarTrigger, the click
override on ToggleGroup and Collapsible, the unselected border and disabled
state of RadioGroupCard, the keyboard focus ring on Resizable and Scroller,
the vertical Resizable handle, and the end-side margin in CheckboxGroup.
