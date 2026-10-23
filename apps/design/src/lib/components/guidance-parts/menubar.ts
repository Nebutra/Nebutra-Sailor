export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["←", "→"],
      does: "Moves focus between the top-level triggers. Focus loops unless loopFocus is false.",
    },
    { keys: ["↓", "Enter"], does: "Opens the focused menu and focuses its first item." },
    { keys: ["↑", "↓"], does: "Moves through the items of the open menu." },
    { keys: ["→", "←"], does: "On a submenu trigger, opens or closes the submenu." },
    { keys: ["a–z"], does: "Typeahead: jumps to the first item whose label matches." },
    { keys: ["Escape"], does: "Closes the menu and returns focus to its trigger." },
  ],
  a11y: [
    {
      title: "Roles come from Base UI",
      body: "The bar has role=menubar and each trigger role=menuitem with aria-haspopup and aria-expanded. Do not add roles of your own.",
    },
    {
      title: "A disabled bar is out of the tab order",
      body: "Set disabled on Menubar, or on one MenubarTrigger. Disabled triggers render with tabindex -1 and aria-disabled, and are dimmed.",
    },
    {
      title: "Shortcuts are labels, not bindings",
      body: "MenubarShortcut only draws text. Bind the keys yourself, or the hint promises something that does not happen.",
    },
  ],
  dos: [
    {
      title: "Use it for an app's command surface",
      body: "File, Edit, View: a few top-level menus that behave as one control, with hover hand-off once one is open.",
    },
    {
      title: "Keep the bar to a single row",
      body: "The bar is a fixed-height row that does not wrap. With many menus, scroll the container or collapse into a single menu on narrow screens.",
    },
  ],
  donts: [
    {
      title: "Do not use it for site navigation",
      body: "A bar of links with flyout panels is a NavigationMenu. A Menubar opens menus of actions.",
    },
    {
      title: "Do not use it for one button",
      body: "One trigger that opens one menu is a DropdownMenu.",
    },
  ],
};
