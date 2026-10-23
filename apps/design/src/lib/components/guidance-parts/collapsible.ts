export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus to and from the trigger. A disabled trigger is skipped.",
    },
    { keys: ["Enter", "Space"], does: "Toggles the content, as for any button." },
  ],
  a11y: [
    {
      title: "The trigger reports its state",
      body: "CollapsibleTrigger renders a button with aria-expanded set to the open state.",
    },
    {
      title: "Link the trigger to the content yourself",
      body: "aria-controls is not set automatically. Pass aria-controls on the trigger and the matching id on CollapsibleContent if assistive tech should know which region it opens.",
    },
    {
      title: "Closed content is not in the DOM",
      body: "CollapsibleContent renders nothing while closed, so page search cannot find it and uncontrolled inputs inside it lose their value.",
    },
    {
      title: "Reduced motion is respected",
      body: "With prefers-reduced-motion the height and opacity transition runs with zero duration, so the content appears and disappears at once.",
    },
  ],
  dos: [
    {
      title: "Use asChild to keep your own button",
      body: "The trigger props are merged onto the child, so a styled Button can be the control.",
      code: '<CollapsibleTrigger asChild><Button variant="ghost">Toggle</Button></CollapsibleTrigger>',
    },
    {
      title: "Control it when the state matters elsewhere",
      body: "Pass open and onOpenChange to drive it from outside, for example to open a section after a validation error.",
      code: "<Collapsible open={open} onOpenChange={setOpen}>…</Collapsible>",
    },
  ],
  donts: [
    {
      title: "Don't use it for a group of sections",
      body: "Collapsible is one region with no sibling coordination or arrow-key navigation. Use Accordion for several.",
    },
    {
      title: "Don't rely on the content staying mounted",
      body: "State inside CollapsibleContent is lost on close. Keep values in the parent.",
    },
  ],
};
