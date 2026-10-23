export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "The group is one tab stop: focus lands on the selected card, or the first card when none is selected, and the next Tab leaves the group.",
    },
    {
      keys: ["→", "↓", "←", "↑"],
      does: "Moves focus to the neighbouring enabled card, wrapping at the ends, and selects it.",
    },
    { keys: ["Space"], does: "Selects the focused card." },
    { keys: ["Enter"], does: "Does nothing; the radio suppresses it." },
  ],
  a11y: [
    {
      title: "Name the group",
      body: "The wrapper is a role=radiogroup with no label of its own. Pass aria-label or aria-labelledby, and let each card's content be its accessible name.",
    },
    {
      title: "Selection is shown by colour and a ring",
      body: "A selected card has a primary border, a 1px ring and a faint wash. It has no check mark, so keep the card text meaningful on its own.",
    },
    {
      title: "The unselected edge is visible",
      body: "An unselected card draws a --control-border edge, derived from each language's foreground and background, so it reads against the surface it sits on.",
    },
    {
      title: "No invalid styling",
      body: "Base UI marks a radio inside a Field with data-invalid, but the card does not style it. Show errors in a message next to the group.",
    },
  ],
  dos: [
    {
      title: "Use cards for a few options that need explaining",
      body: "Plans or delivery options with a title and a line of detail. For plain labels use RadioGroup.",
      code: `<RadioGroupCard aria-label="Plan" defaultValue="team">
  <RadioGroupCardItem value="team">Team</RadioGroupCardItem>
</RadioGroupCard>`,
    },
    {
      title: "Lay the group out with className",
      body: "The group is a one-column grid; add columns on the group and widths on the items.",
      code: '<RadioGroupCard className="grid-cols-3" …>',
    },
  ],
  donts: [
    {
      title: "Don't use it for multiple choices",
      body: "Cards are radios: selecting one clears the others. For several at once use CheckboxGroup or ToggleGroup type=multiple.",
    },
    {
      title: "Don't put controls inside a card",
      body: "A card is itself a button. Nested buttons or links are invalid and steal the click.",
    },
  ],
};
