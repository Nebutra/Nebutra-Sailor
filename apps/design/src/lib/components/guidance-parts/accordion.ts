export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus to and from the triggers. A disabled trigger is still a tab stop.",
    },
    { keys: ["Enter", "Space"], does: "Toggles the focused item." },
    {
      keys: ["↓", "↑"],
      does: "Moves focus to the next or previous enabled trigger, wrapping at the ends unless loopFocus is off. Disabled triggers are skipped.",
    },
    {
      keys: ["←", "→"],
      does: "Do the same as the vertical arrows, but only when the root has orientation horizontal.",
    },
    { keys: ["Home", "End"], does: "Moves focus to the first or last enabled trigger." },
  ],
  a11y: [
    {
      title: "Each trigger sits in a heading",
      body: "AccordionTrigger is wrapped in a fixed h3, so screen-reader users can jump between sections by heading. The level is not configurable; keep the surrounding outline in mind.",
    },
    {
      title: "State is on the trigger",
      body: "aria-expanded reflects whether the panel is open. aria-controls is only present while the panel is open.",
    },
    {
      title: "Disabled stays discoverable",
      body: "A disabled item is dimmed, ignores clicks and is skipped by arrow keys, but Tab still reaches it so its label can be read.",
    },
    {
      title: "One focus ring, from the page",
      body: "The ring comes from the global :focus-visible rule. focus-visible:outline-none on the trigger does not remove it.",
    },
    {
      title: "Hidden panels",
      body: "A closed panel is unmounted unless keepMounted is set on AccordionContent. Keep it mounted when the content must stay searchable or hold form state.",
    },
  ],
  dos: [
    {
      title: "Use a short, specific trigger label",
      body: "The label is the only thing visible when collapsed. Put the topic or the question there, not a generic Details.",
    },
    {
      title: "Allow several open at once when sections are independent",
      body: "multiple lets readers compare. Without it, opening one closes the others.",
      code: '<Accordion multiple defaultValue={["a", "b"]}>…</Accordion>',
    },
    {
      title: "Keep form state when panels close",
      body: "Inputs inside a closed panel are unmounted by default and lose their value. Set keepMounted, or hold the value in the parent.",
      code: "<AccordionContent keepMounted>…</AccordionContent>",
    },
  ],
  donts: [
    {
      title: "Don't hide content that must be seen",
      body: "Errors, required fields and primary actions behind a collapsed trigger are easy to miss. Use an accordion for optional, scannable detail.",
    },
    {
      title: "Don't put interactive controls inside the trigger",
      body: "The trigger is itself a button; nested buttons or links are invalid HTML and break keyboard behaviour.",
    },
    {
      title: "Don't pass a string to value or defaultValue",
      body: "Both are arrays of item values, even in single mode.",
      code: '<Accordion defaultValue={["a"]}>…</Accordion>',
    },
  ],
};
