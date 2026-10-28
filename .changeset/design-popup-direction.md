---
"@nebutra/ui": patch
---

Tooltip, Popover, Select, Combobox and HoverCard popups now follow the reading
direction of their trigger. They render in a portal outside the `dir="rtl"`
subtree, so the positioner used to resolve `inline-start`, `inline-end` and
`align="start" | "end"` against left-to-right and the popup text reverted to
left-to-right. Each popup now measures the `dir` around its trigger (else the
nearest Base UI `DirectionProvider`), hands it to Base UI and sets it on the
positioner.

Tooltip and Popover take a `dir` prop like DropdownMenu does, Select takes one
on the compound form, and `TooltipContent` accepts the logical sides
`inline-start` and `inline-end`. Left-to-right pages render the same as before.
