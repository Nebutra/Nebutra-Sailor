export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Right click", "Long press"],
      does: "Opens the menu at the pointer. A long press is 500ms on a touch screen.",
    },
    { keys: ["↑", "↓"], does: "Moves through the items of the open menu." },
    { keys: ["→", "←"], does: "On a ContextMenuSubTrigger, opens or closes the submenu." },
    { keys: ["a–z"], does: "Typeahead: jumps to the first item whose label matches." },
    { keys: ["Enter"], does: "Activates the highlighted item and closes the menu." },
    { keys: ["Escape"], does: "Closes the menu." },
  ],
  a11y: [
    {
      title: "The trigger is not focusable",
      body: "ContextMenuTrigger renders a plain div with no tab stop, so a keyboard user cannot reach a menu on it. Render a button or link with asChild, or offer the same actions another way.",
    },
    {
      title: "Never the only path",
      body: "Treat a context menu as a shortcut to actions that also live in a visible control, because discovering a right click or long press is on the user.",
    },
    {
      title: "Labels belong to a group",
      body: "ContextMenuLabel is a Base UI group label and needs a ContextMenuGroup around it.",
    },
  ],
  dos: [
    {
      title: "Put destructive actions last",
      body: "Set variant=destructive on the item and place it below a separator, so it is not hit on the way to something else.",
      code: '<ContextMenuItem variant="destructive">Delete</ContextMenuItem>',
    },
    {
      title: "Cap long lists",
      body: "The panel is capped at 20rem wide and at the height available, but a long list should still set its own max height and overflow-y.",
      code: '<ContextMenuContent className="max-h-64 overflow-y-auto">',
    },
  ],
  donts: [
    {
      title: "Do not pass disabled to a link item",
      body: "With href set, ContextMenuItem renders a link and forwards only the link props. disabled and onSelect are not applied to it.",
    },
    {
      title: "Do not use it for a visible control",
      body: "An action menu on a button is a DropdownMenu. The panel of a context menu opens at the pointer, not under a trigger.",
    },
  ],
};
