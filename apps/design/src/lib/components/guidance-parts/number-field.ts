export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus to the field, then to the − and + steppers as separate tab stops. A disabled field and a stepper at its bound are skipped.",
    },
    { keys: ["↑", "↓"], does: "Steps the value by step." },
    { keys: ["Shift + ↑", "Shift + ↓"], does: "Steps by largeStep, 10 by default." },
    { keys: ["Alt + ↑", "Alt + ↓"], does: "Steps by smallStep, 0.1 by default." },
    {
      keys: ["Home", "End"],
      does: "Jumps to min or max. Does nothing when that bound is not set.",
    },
  ],
  a11y: [
    {
      title: "A label needs an id",
      body: "label renders a <label for>, so pair it with id. Without a visible label, name the field with aria-label.",
    },
    {
      title: "Description and error are linked",
      body: "description and a string error are tied to the input with aria-describedby. An error also sets aria-invalid.",
    },
    {
      title: "Boolean error only flags",
      body: "error={true} marks the field invalid but says nothing. Pass the message as a string so it is read out.",
    },
    {
      title: "Translate the steppers",
      body: "incrementLabel and decrementLabel default to Increase and Decrease. Pass translated strings in other locales.",
    },
    {
      title: "The suffix is decoration",
      body: "suffix is aria-hidden. Put the unit in the label as well so it is announced.",
    },
  ],
  dos: [
    {
      title: "Set the bounds",
      body: "min and max clamp typed values on commit and disable the stepper at each bound.",
      code: '<NumberField id="seats" label="Seats" min={1} max={50} />',
    },
    {
      title: "Opt in to formatting",
      body: "The default is no grouping and full precision. Pass format for currency or percent.",
      code: '<NumberField id="budget" label="Budget" format={{ style: "currency", currency: "USD" }} />',
    },
  ],
  donts: [
    {
      title: "Don't use input type=number",
      body: "Its spin buttons cannot be themed and the wheel edits the value while the page scrolls past it.",
      code: '<Input type="number" />',
    },
    {
      title: "Don't group ports and ids",
      body: "Grouped display turns 8080 into 8,080. Leave format at its default for values that are not quantities.",
      code: '<NumberField id="port" label="Port" format={{ useGrouping: true }} />',
    },
  ],
};
