export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves to each enabled checkbox in turn. The group is not a single tab stop, and disabled checkboxes are skipped.",
    },
    { keys: ["Space"], does: "Toggles the focused checkbox." },
  ],
  a11y: [
    {
      title: "The label names the group",
      body: "label is rendered as a heading and set as the aria-label of the role=group wrapper. Without it the group has no accessible name, and the component forwards no aria-label or aria-labelledby.",
    },
    {
      title: "Each checkbox keeps its own semantics",
      body: "The group adds no ARIA beyond role=group. Every checkbox is a native input with its own label, state and tab stop.",
    },
    {
      title: "The empty box has a visible edge",
      body: "An unchecked box draws a --control-border edge, derived from each language's foreground and background, so it reads against the page, card, muted and popover surfaces.",
    },
  ],
  dos: [
    {
      title: "Label the set",
      body: "Say what the boxes choose between: Notifications, Scopes, Channels.",
      code: '<CheckboxGroup label="Notifications">…</CheckboxGroup>',
    },
    {
      title: "Read the values from the form",
      body: "Give the boxes a shared name and distinct values and read them with FormData, or control each Checkbox yourself.",
      code: '<Checkbox name="channel" value="email">Email</Checkbox>',
    },
  ],
  donts: [
    {
      title: "Don't expect group state",
      body: "There is no value, onChange, error or disabled prop on the group. Disable each Checkbox individually.",
    },
    {
      title: "Don't use it for mutually exclusive choices",
      body: "Checkboxes are independent. Use RadioGroup or ToggleGroup type=single when exactly one option applies.",
    },
  ],
};
