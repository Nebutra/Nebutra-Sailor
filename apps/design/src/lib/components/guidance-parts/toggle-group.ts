export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "In a single group, one tab stop on the selected item (every enabled item until something is selected). In a multiple group, one stop per item. Disabled items are skipped.",
    },
    {
      keys: ["→", "↓"],
      does: "Single only: moves to the next enabled item, wrapping at the end, and selects it.",
    },
    {
      keys: ["←", "↑"],
      does: "Single only: moves to the previous enabled item, wrapping at the start, and selects it.",
    },
    {
      keys: ["Home", "End"],
      does: "Single only: moves to and selects the first or last enabled item.",
    },
    {
      keys: ["Space", "Enter"],
      does: "Presses the focused item. In a multiple group this toggles it on or off.",
    },
  ],
  a11y: [
    {
      title: "Two different roles",
      body: 'type="single" renders role=radiogroup with role=radio items and aria-checked. type="multiple" renders role=group with plain buttons and aria-pressed. Pick the type for the semantics, not the look.',
    },
    {
      title: "Name the group and icon-only items",
      body: "The group has no label of its own: pass aria-label or aria-labelledby. An item that holds only an icon needs its own aria-label.",
    },
    {
      title: "A single group cannot be emptied",
      body: "Clicking the selected item is a no-op, matching the radio role it announces. The only way to start empty is to omit the value.",
    },
    {
      title: "Arrow keys follow dir=rtl",
      body: "Under dir=rtl, ArrowLeft moves to the next item and ArrowRight to the previous one, so the key matches the side the item is on. Up and Down are unchanged.",
    },
  ],
  dos: [
    {
      title: "Use it for a small set of related views or filters",
      body: "Two to five short labels that switch a view or toggle filters, where the options should be visible together.",
      code: `<ToggleGroup aria-label="Range" defaultValue="week">
  <ToggleGroupItem value="day">Day</ToggleGroupItem>
  <ToggleGroupItem value="week">Week</ToggleGroupItem>
</ToggleGroup>`,
    },
    {
      title: "Use type=multiple for independent options",
      body: "When each item is its own on/off choice, the array value and per-item aria-pressed describe it correctly.",
      code: '<ToggleGroup aria-label="Channels" type="multiple">…</ToggleGroup>',
    },
  ],
  donts: [
    {
      title: "Don't use it to navigate",
      body: "Items are buttons that change a value, not links. For pages use Tabs or a link list.",
    },
    {
      title: "Don't use it for long or open-ended option lists",
      body: "Items never wrap or truncate, so many or long labels overflow the track. Use Select instead.",
    },
    {
      title: "Don't rely on onClick for selection",
      body: "Pass onValueChange. An item onClick runs after the group updates, but it is skipped when a selected single item is clicked again.",
    },
  ],
};
