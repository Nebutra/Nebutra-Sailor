export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus to and from the button. Disabled and loading buttons are skipped.",
    },
    { keys: ["Enter", "Space"], does: "Copies the value." },
    {
      keys: ["↑", "↓", "Enter"],
      does: "Inside a menu, CopyMenuItem takes part in the menu's arrow-key navigation and typeahead, and Enter copies. The menu stays open afterwards.",
    },
  ],
  a11y: [
    {
      title: "Icon-only buttons are named by tooltipText",
      body: "Without a label the button holds an sr-only span with tooltipText (default Copy). Pass a specific name such as Copy install command; the tooltip repeats it on hover and focus.",
    },
    {
      title: "The result is announced",
      body: "The check icon is hidden from assistive technology, so a polite live region inside the button speaks successMessage after a copy and errorMessage if the write is refused. It is empty while idle and does not change the button's name.",
    },
    {
      title: "Failure is visible, not silent",
      body: "A refused clipboard write swaps the icon for a warning for the same timeout as the copied state. Clipboard writes can be refused outside a user gesture, in insecure contexts and by permission policies.",
    },
    {
      title: "Colour is not the only confirmation",
      body: "The copied state changes the icon shape (check) and, with a label, the text. The tint is the foreground-safe success-strong token and sits on the icon, so a className colour on the button does not remove it.",
    },
  ],
  dos: [
    {
      title: "Keep the label when it is the value",
      body: "For a token name or URL shown on the button, pass copiedLabel={false} so the text stays readable; the check confirms the copy.",
      code: '<CopyButton value={token} label={token} copiedLabel={false} iconPosition="trailing" />',
    },
    {
      title: "Use CopyMenuItem inside menus",
      body: "It composes over DropdownMenuItem, so arrow keys, typeahead and highlighting still work. A CopyButton in menu content does not take part in them.",
      code: "<DropdownMenuContent>\n  <CopyMenuItem value={hex}>Copy HEX</CopyMenuItem>\n</DropdownMenuContent>",
    },
    {
      title: "Mount a Toaster before using toasts",
      body: "showToast is on by default and calls sonner. Mount one Toaster near the root, or pass showToast={false} and rely on the check and the live region.",
      code: "<CopyButton value={text} showToast={false} />",
    },
  ],
  donts: [
    {
      title: "Don't combine size=icon with a label",
      body: "The icon size is a 40px square and truncates a label to a couple of letters. Leave size unset: it is icon without a label and default with one.",
    },
    {
      title: "Don't copy secrets without a plan to clear them",
      body: "The value is written to the system clipboard and stays there. Prefer a short-lived value or tell the user, for example in the successMessage.",
    },
  ],
};
