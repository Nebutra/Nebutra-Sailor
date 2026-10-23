export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus into and out of the grid. Only one day is a tab stop at a time, along with the previous and next month buttons.",
    },
    { keys: ["← →"], does: "Moves focus by day." },
    { keys: ["↑ ↓"], does: "Moves focus by week. With Shift, by year." },
    { keys: ["PageUp", "PageDown"], does: "Moves focus by month. With Shift, by year." },
    { keys: ["Home", "End"], does: "Moves focus to the start or end of the week." },
    { keys: ["Enter", "Space"], does: "Selects the focused day." },
  ],
  a11y: [
    {
      title: "Explain disabled days",
      body: "A disabled matcher dims the day and blocks selection. Say why in text nearby, since colour alone does not explain it.",
    },
    {
      title: "One focus ring, from the page",
      body: "Day buttons take the global :focus-visible ring. A ring added through classNames draws twice.",
    },
    {
      title: "Today is an outline, not a fill",
      body: "Today reads as primary text so it stays distinct when a selection lands on another day, and a selected today keeps the selected fill.",
    },
  ],
  dos: [
    {
      title: "Own the selection",
      body: "Calendar draws the grid. Pass mode, selected and onSelect, and keep the value in your state.",
      code: '<Calendar mode="single" selected={date} onSelect={setDate} />',
    },
    {
      title: "Use DatePicker for a single date field",
      body: "It wraps Calendar in a text field and popover and exchanges yyyy-MM-dd strings.",
      code: '<DatePicker id="due" label="Due date" value={date} onValueChange={setDate} />',
    },
  ],
  donts: [
    {
      title: "Don't recolour days with className",
      body: "Selected, range and today visuals are resolved from modifiers in one place. A local class competes with them on specificity.",
      // allow-palette: this is the Don't example showing a raw palette class.
      code: '<Calendar classNames={{ day: "bg-blue-500" }} />',
    },
  ],
};
