export const guidance: import("../guidance").Guidance = {
  keyboard: [
    { keys: ["Tab"], does: "Moves focus into the navigation and out of it." },
    {
      keys: ["←", "→"],
      does: "Move between triggers in a horizontal menu. With orientation=vertical, ↑ and ↓ do instead.",
    },
    {
      keys: ["Enter", "Space"],
      does: "Opens the focused trigger's panel. ↓ also opens it when horizontal; → when vertical.",
    },
    { keys: ["Escape"], does: "Closes the panel and returns focus to its trigger." },
  ],
  a11y: [
    {
      title: "It is a navigation landmark",
      body: "The root renders a nav element and the list carries aria-orientation. Give it an aria-label when a page has more than one nav.",
    },
    {
      title: "Hover is a convenience, not the way in",
      body: "Triggers are buttons that open on press and on Enter or Space, so touch and keyboard users reach the same panels. The delay and closeDelay props only tune hover.",
    },
    {
      title: "Mark the current page",
      body: "Pass active to the NavigationMenuLink for the page you are on. Colour alone is not enough, so also keep the page title and heading in step.",
    },
  ],
  dos: [
    {
      title: "Style links in panels yourself",
      body: "NavigationMenuLink carries no styles of its own inside a panel. Use navigationMenuTriggerStyle() for a top-level link, and your own classes with a hover and focus-visible state in a panel.",
      code: '<NavigationMenuLink className={navigationMenuTriggerStyle()} href="/docs">Docs</NavigationMenuLink>',
    },
    {
      title: "Control it with a string",
      body: "value is the open item's value, and an empty string means every panel is closed.",
      code: "<NavigationMenu value={value} onValueChange={setValue}>…</NavigationMenu>",
    },
  ],
  donts: [
    {
      title: "Do not use it for actions",
      body: "A navigation menu goes to pages. A menu of actions is a DropdownMenu or a Menubar.",
    },
    {
      title: "Do not render the viewport",
      body: "The root already renders it. NavigationMenuViewport is deprecated and renders nothing.",
    },
  ],
};
