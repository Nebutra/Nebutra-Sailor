export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus from the primary button to the chevron, then on. Both are skipped while the pair is disabled or loading.",
    },
    {
      keys: ["Enter", "Space"],
      does: "On the primary button, runs its action. On the chevron, opens the menu.",
    },
    {
      keys: ["↑", "↓"],
      does: "Inside the open menu, move between items. This is the DropdownMenu contract, since the menu is a DropdownMenu.",
    },
    { keys: ["Enter"], does: "Chooses the highlighted menu item." },
    { keys: ["Esc"], does: "Closes the menu." },
  ],
  a11y: [
    {
      title: "Name the chevron",
      body: "menuButtonLabel is required and becomes the chevron's aria-label, because the chevron has no text. Say what is in the menu, for example More deploy options.",
    },
    {
      title: "Two buttons, one visual unit",
      body: "The primary action and the menu trigger are separate tab stops with separate names. The focused half is raised above the seam so its ring is not clipped.",
    },
    {
      title: "Loading locks both halves",
      body: "loading, disabled on the root, or disabled in buttonProps disables the chevron as well as the primary button, so the menu cannot be opened mid-request.",
    },
    {
      title: "Menu icons are decoration",
      body: "SplitButton.MenuItem marks its icon aria-hidden. The title carries the meaning; the description is plain text after it.",
    },
  ],
  dos: [
    {
      title: "Mirror the main action in the menu",
      body: "The visible action should also be the first menu item, so the menu is a complete list of options and nobody has to guess what the label does.",
    },
    {
      title: "Keep the primary label short",
      body: "A verb such as Deploy or Save. The pair does not truncate its label, and the menu is where the detail lives.",
      code: '<SplitButton menuButtonLabel="More save options" menuItems={items}>Save</SplitButton>',
    },
    {
      title: "Use menuItemProps for behaviour",
      body: "Handlers and disabled go through menuItemProps, which spreads onto the underlying DropdownMenuItem.",
      code: '<SplitButton.MenuItem title="Promote" menuItemProps={{ onClick: promote, disabled }} />',
    },
  ],
  donts: [
    {
      title: "Don't use it for unrelated actions",
      body: "A split button promises that the menu holds variants of the primary action. For a list of different actions use a DropdownMenu on a normal button.",
    },
    {
      title: "Don't reach for a destructive type",
      body: "type is limited to default and secondary. Put a destructive action in the menu behind a confirmation instead.",
    },
    {
      title: "Don't override the seam with physical classes",
      body: "The seam uses logical edges (rounded-e-none on the primary half, rounded-s-none plus border-s on the chevron) so the pair mirrors in RTL. A className that rounds or rules a physical left or right edge on either half would pin that side in both directions.",
    },
  ],
};
