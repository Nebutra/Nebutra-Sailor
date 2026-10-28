export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus to and from each divider. A disabled divider is skipped.",
    },
    {
      keys: ["←", "→"],
      does: "On a horizontal group, resizes the two panels beside the divider by 5% per press.",
    },
    {
      keys: ["↑", "↓"],
      does: "Does the same on a vertical group. The other axis's arrows do nothing.",
    },
    {
      keys: ["Home", "End"],
      does: "Pushes the divider as far as the panels' min and max sizes allow.",
    },
    {
      keys: ["Enter"],
      does: "Collapses the collapsible panel before the divider, or restores it to its last size.",
    },
    {
      keys: ["F6", "Shift + F6"],
      does: "Moves focus to the next or previous divider in the group.",
    },
  ],
  a11y: [
    {
      title: "Name every divider",
      body: "The divider is a focusable role=separator with a value, but no name. Pass aria-label (for example Resize sidebar) so a screen reader says what it moves.",
    },
    {
      title: "The value is the first panel's size",
      body: "aria-valuenow, aria-valuemin and aria-valuemax describe the panel before the divider, as a percentage. aria-controls points at that panel.",
    },
    {
      title: "Disabled is announced",
      body: "A disabled divider gets aria-disabled and leaves the tab order. The panels keep their size.",
    },
    {
      title: "RTL: keys mirror, pointer dragging does not",
      body: "Under dir=rtl the first panel sits on the right, so ArrowLeft grows it and ArrowRight shrinks it. Dragging with a pointer is still measured from the left edge by react-resizable-panels and may move the divider the wrong way.",
    },
  ],
  dos: [
    {
      title: "Size with percentage strings",
      body: "In react-resizable-panels v4 a bare number is pixels. Write the unit when you mean a share of the group.",
      code: '<ResizablePanel defaultSize="30%" minSize="15%">…</ResizablePanel>',
    },
    {
      title: "Give the group a size",
      body: "The group is h-full and w-full of its parent. Give it (or its parent) an explicit height, or a vertical split has no space to divide.",
      code: '<ResizablePanelGroup className="h-64 w-full rounded-lg border border-border">',
    },
    {
      title: "Persist through onLayoutChanged",
      body: "Sizes are not saved for you. Store the layout when a drag settles and pass it back as defaultLayout, with an id on each panel.",
      code: "<ResizablePanelGroup defaultLayout={saved} onLayoutChanged={save}>",
    },
  ],
  donts: [
    {
      title: "Don't use a pixel number by accident",
      body: "defaultSize={30} is 30px, not 30%. The first panel will look pinched until the group is wider than you expect.",
    },
    {
      title: "Don't use it for a fixed layout",
      body: "If the user should not move the divider, use plain flex or grid. A disabled divider still draws a handle that suggests otherwise.",
    },
  ],
};
