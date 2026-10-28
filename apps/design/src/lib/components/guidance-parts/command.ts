export const guidance: import("../guidance").Guidance = {
  keyboard: [
    { keys: ["Type"], does: "Filters the list and highlights the first match." },
    {
      keys: ["↑", "↓"],
      does: "Moves the highlight and skips disabled rows. Set loop on Command to wrap at the ends.",
    },
    { keys: ["Home", "End"], does: "Jumps the highlight to the first or last row." },
    { keys: ["Enter"], does: "Runs onSelect for the highlighted row." },
    {
      keys: ["Ctrl + N", "Ctrl + P", "Ctrl + J", "Ctrl + K"],
      does: "Move the highlight like the arrow keys, unless vimBindings is turned off on Command.",
    },
    { keys: ["Escape"], does: "Closes a CommandDialog and returns focus to what opened it." },
  ],
  a11y: [
    {
      title: "Announce results you filter yourself",
      body: "With shouldFilter off the list changes without cmdk knowing the count. Render CommandResults with count and search so a screen reader hears it.",
    },
    {
      title: "Name shortcuts",
      body: "CommandShortcut draws each key as a Kbd. Pass label so a screen reader hears “Command P” once, and the keys are hidden from it.",
    },
    {
      title: "Give the dialog a name",
      body: 'CommandDialog renders a visually hidden DialogTitle, "Command menu" by default. Pass a translated title (and an optional description) so the modal is named in the user\'s language.',
    },
    {
      title: "Empty is a state, not a blank",
      body: "Always render a CommandEmpty. It is the only thing that tells the user the list is empty rather than broken.",
    },
  ],
  dos: [
    {
      title: "Group by task",
      body: "Use CommandGroup with a heading and a CommandSeparator between groups. Headings and separators disappear while a query is active.",
      code: '<CommandGroup heading="Settings">…</CommandGroup>',
    },
    {
      title: "Close the dialog on select",
      body: "A CommandDialog is controlled. Set open to false inside onSelect once the command has run.",
      code: "<CommandItem onSelect={() => setOpen(false)}>New file</CommandItem>",
    },
  ],
  donts: [
    {
      title: "Do not leave the default title in a translated app",
      body: 'The default title is the English string "Command menu". In any other locale pass title, or a screen reader announces English over your translated palette.',
    },
    {
      title: "Do not use it for form selection",
      body: "A palette runs actions. To pick a value for a field, use Combobox or Select, which carry a value and a label.",
    },
  ],
};
